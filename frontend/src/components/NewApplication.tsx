import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Building2,
  Server,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { getBackends, createJob, subscribeToJobWithFallback, getJobFiles } from '../api';
import type { Backend, Job, OutputFile } from '../types';
import FilePreview from './FilePreview';

function NewApplication() {
  const navigate = useNavigate();
  const [backends, setBackends] = useState<Backend[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [selectedBackend, setSelectedBackend] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('');
  const [enableAts, setEnableAts] = useState(true);
  
  // Job state
  const [submitting, setSubmitting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadBackends();
  }, []);
  
  async function loadBackends() {
    try {
      const data = await getBackends();
      // Handle various response formats
      const backendList = Array.isArray(data) ? data : (data?.backends || []);
      setBackends(backendList);
      
      // Set default model for selected backend
      const defaultBackend = backendList.find((b: Backend) => b.id === 'ollama');
      if (defaultBackend?.default_model) {
        setSelectedModel(defaultBackend.default_model);
      }
    } catch (err) {
      console.error('Failed to load backends:', err);
      setError('Failed to load backends');
    } finally {
      setLoading(false);
    }
  }
  
  function handleBackendChange(backendId: string) {
    setSelectedBackend(backendId);
    const backend = (backends || []).find(b => b.id === backendId);
    if (backend?.default_model) {
      setSelectedModel(backend.default_model);
    }
  }
  
  // Store cleanup function for WebSocket
  const [wsCleanup, setWsCleanup] = useState<(() => void) | null>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsCleanup) {
        wsCleanup();
      }
    };
  }, [wsCleanup]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cvFile || !jobFile) {
      setError('Please upload both CV and job description files');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create job
      const job = await createJob({
        cv_file: cvFile,
        job_file: jobFile,
        company_name: companyName || undefined,
        backend: selectedBackend,
        model: selectedModel || undefined,
        enable_ats: enableAts,
      });

      setCurrentJob(job);

      // Subscribe to job progress via WebSocket (with polling fallback)
      const cleanup = subscribeToJobWithFallback(
        job.id,
        // onProgress - update UI with progress
        (updatedJob) => {
          setCurrentJob(updatedJob);
        },
        // onComplete - load output files
        async (completedJob) => {
          setCurrentJob(completedJob);
          setSubmitting(false);
          if (completedJob.status === 'completed') {
            try {
              const files = await getJobFiles(completedJob.id);
              setOutputFiles(files);
            } catch (err) {
              console.error('Failed to load output files:', err);
            }
          }
        },
        // onError - handle failure
        (err) => {
          console.error('Job processing error:', err);
          let errorMessage = 'Failed to process application';
          if (typeof err === 'string') {
            errorMessage = err;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          setError(errorMessage);
          setCurrentJob(prev => prev ? { ...prev, status: 'failed' } : null);
          setSubmitting(false);
        }
      );

      setWsCleanup(() => cleanup);

    } catch (err: any) {
      console.error('Job creation error:', err);
      // Handle various error formats
      let errorMessage = 'Failed to process application';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.detail) {
        errorMessage = err.detail;
      } else if (err?.error) {
        errorMessage = err.error;
      }
      setError(errorMessage);
      setCurrentJob(prev => prev ? { ...prev, status: 'failed' } : null);
      setSubmitting(false);
    }
  }
  
  function resetForm() {
    setCvFile(null);
    setJobFile(null);
    setCompanyName('');
    setCurrentJob(null);
    setOutputFiles([]);
    setError(null);
  }
  
  const currentBackend = (backends || []).find(b => b.id === selectedBackend);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  
  // Show results if job completed
  if (currentJob?.status === 'completed' && outputFiles.length > 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b border-green-100">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-green-800">Application Generated!</h2>
                <p className="text-green-600">Your tailored CV and cover letter are ready.</p>
              </div>
            </div>
          </div>
          
          {/* ATS Score */}
          {currentJob.ats_score && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ATS Match Score</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-bold ${
                    currentJob.ats_score >= 80 ? 'text-green-600' :
                    currentJob.ats_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {currentJob.ats_score}%
                  </span>
                  {currentJob.ats_score >= 80 && <Sparkles className="w-5 h-5 text-green-500" />}
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    currentJob.ats_score >= 80 ? 'bg-green-500' :
                    currentJob.ats_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${currentJob.ats_score}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Output Files with Preview */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Generated Files</h3>
            <FilePreview jobId={currentJob.id} files={outputFiles} />
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex space-x-3">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              New Application
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              View All Applications
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Application</h2>
          <p className="text-sm text-gray-500">Upload your CV and job description to generate tailored materials.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* CV Upload */}
          <FileDropZone
            label="Your CV"
            accept=".txt,.pdf,.docx"
            file={cvFile}
            onFileSelect={setCvFile}
            disabled={submitting}
          />
          
          {/* Job Description Upload */}
          <FileDropZone
            label="Job Description"
            accept=".txt"
            file={jobFile}
            onFileSelect={setJobFile}
            disabled={submitting}
          />
          
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Company Name (optional)
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Google, Microsoft"
              disabled={submitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Helps filter company name from ATS keywords for more accurate scoring.
            </p>
          </div>
          
          {/* Backend Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Server className="w-4 h-4 inline mr-2" />
              LLM Backend
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(backends || []).map(backend => (
                <button
                  key={backend.id}
                  type="button"
                  onClick={() => handleBackendChange(backend.id)}
                  disabled={!backend.available || submitting}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedBackend === backend.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : backend.available
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <p className="font-medium text-gray-900">{backend.name}</p>
                  <p className="text-xs text-gray-500">
                    {backend.available ? 'Available' : 'Not configured'}
                  </p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Model Selection */}
          {currentBackend?.models && currentBackend.models.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {currentBackend.models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
          
          {/* ATS Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">ATS Optimization</p>
              <p className="text-sm text-gray-500">Optimize CV for Applicant Tracking Systems</p>
            </div>
            <button
              type="button"
              onClick={() => setEnableAts(!enableAts)}
              disabled={submitting}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                enableAts ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  enableAts ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {/* Progress */}
          {currentJob && currentJob.status !== 'completed' && (
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-700">{currentJob.stage}</span>
                <span className="text-sm text-indigo-600">{currentJob.progress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={!cvFile || !jobFile || submitting}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Application</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FileDropZone({
  label,
  accept,
  file,
  onFileSelect,
  disabled,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);
  
  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }, [disabled, onFileSelect]);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <FileText className="w-4 h-4 inline mr-2" />
        {label}
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : file
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {file ? (
          <div className="flex items-center justify-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">
              Drag & drop or <span className="text-indigo-600 font-medium">browse</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Accepts: {accept.split(',').join(', ')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default NewApplication;
