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
  Sparkles,
  Save,
  Star,
  Trash2
} from 'lucide-react';
import { getBackends, createJob, subscribeToJobWithFallback, getJobFiles, getCVs, createCV, deleteCV, setDefaultCV } from '../api';
import type { Backend, Job, OutputFile, StoredCV } from '../types';
import FilePreview from './FilePreview';

function NewApplication() {
  const navigate = useNavigate();
  const [backends, setBackends] = useState<Backend[]>([]);
  const [storedCVs, setStoredCVs] = useState<StoredCV[]>([]);
  const [loading, setLoading] = useState(true);

  // CV selection state
  const [cvMode, setCvMode] = useState<'stored' | 'upload'>('stored');
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [saveCvName, setSaveCvName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Form state
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
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [backendData, cvData] = await Promise.all([
        getBackends(),
        getCVs(),
      ]);

      // Handle various response formats
      const backendList = Array.isArray(backendData) ? backendData : (backendData?.backends || []);
      setBackends(backendList);

      // Set default model for selected backend
      const defaultBackend = backendList.find((b: Backend) => b.id === 'ollama');
      if (defaultBackend?.default_model) {
        setSelectedModel(defaultBackend.default_model);
      }

      // Set stored CVs
      setStoredCVs(cvData);

      // Select default CV if available
      const defaultCv = cvData.find((cv: StoredCV) => cv.is_default);
      if (defaultCv) {
        setSelectedCvId(defaultCv.id);
        setCvMode('stored');
      } else if (cvData.length > 0) {
        setSelectedCvId(cvData[0].id);
        setCvMode('stored');
      } else {
        setCvMode('upload');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCV() {
    if (!cvFile || !saveCvName.trim()) return;

    try {
      const newCv = await createCV(cvFile, saveCvName.trim(), saveAsDefault);
      setStoredCVs(prev => [newCv, ...prev]);
      setSelectedCvId(newCv.id);
      setCvMode('stored');
      setSaveCvName('');
      setSaveAsDefault(false);
      setCvFile(null);
    } catch (err) {
      console.error('Failed to save CV:', err);
      setError('Failed to save CV');
    }
  }

  async function handleDeleteCV(id: number) {
    try {
      await deleteCV(id);
      setStoredCVs(prev => prev.filter(cv => cv.id !== id));
      if (selectedCvId === id) {
        const remaining = storedCVs.filter(cv => cv.id !== id);
        setSelectedCvId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete CV:', err);
    }
  }

  async function handleSetDefaultCV(id: number) {
    try {
      await setDefaultCV(id);
      setStoredCVs(prev => prev.map(cv => ({
        ...cv,
        is_default: cv.id === id
      })));
    } catch (err) {
      console.error('Failed to set default CV:', err);
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

    // Validate CV selection
    const hasCV = cvMode === 'stored' ? selectedCvId !== null : cvFile !== null;
    if (!hasCV || !jobFile) {
      setError('Please select a CV and upload a job description');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create job with either stored CV ID or uploaded file
      const job = await createJob({
        cv_id: cvMode === 'stored' ? selectedCvId! : undefined,
        cv_file: cvMode === 'upload' ? cvFile! : undefined,
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
      <div className="max-w-5xl mx-auto">
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
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-slate-200">
        {/* Compact header bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">New Application</span>
          <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
            <span>ATS</span>
            <input
              type="checkbox"
              checked={enableAts}
              onChange={(e) => setEnableAts(e.target.checked)}
              disabled={submitting}
              className="w-3.5 h-3.5 rounded-sm border-slate-300 text-slate-700 focus:ring-slate-500"
            />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="p-3">
          {/* Two Column Layout: CV and Job Description */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* CV Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CV</span>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setCvMode('stored')}
                    disabled={submitting || storedCVs.length === 0}
                    className={`px-2 py-0.5 text-xs border-y border-l transition-colors ${
                      cvMode === 'stored'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    } ${storedCVs.length === 0 ? 'opacity-40' : ''}`}
                  >
                    Saved ({storedCVs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCvMode('upload')}
                    disabled={submitting}
                    className={`px-2 py-0.5 text-xs border transition-colors ${
                      cvMode === 'upload'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Upload
                  </button>
                </div>
              </div>

              {/* Stored CVs - Compact */}
              {cvMode === 'stored' && storedCVs.length > 0 && (
                <div className="border border-slate-200 divide-y divide-slate-100">
                  {storedCVs.map(cv => (
                    <div
                      key={cv.id}
                      onClick={() => !submitting && setSelectedCvId(cv.id)}
                      className={`flex items-center justify-between px-2 py-1.5 cursor-pointer transition-colors ${
                        selectedCvId === cv.id
                          ? 'bg-slate-100'
                          : 'hover:bg-slate-50'
                      } ${submitting ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <input
                          type="radio"
                          checked={selectedCvId === cv.id}
                          onChange={() => {}}
                          className="w-3 h-3 text-slate-600 border-slate-300"
                        />
                        <span className="text-sm text-slate-800 truncate">{cv.name}</span>
                        {cv.is_default && <span className="text-xs text-slate-400">(default)</span>}
                      </div>
                      <div className="flex items-center">
                        {!cv.is_default && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSetDefaultCV(cv.id); }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Set default"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCV(cv.id); }}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Mode */}
              {cvMode === 'upload' && (
                <div>
                  <SharpDropZone
                    accept=".txt,.pdf,.docx"
                    file={cvFile}
                    onFileSelect={setCvFile}
                    disabled={submitting}
                  />
                  {cvFile && (
                    <div className="flex items-center mt-1.5 space-x-1.5">
                      <input
                        type="text"
                        value={saveCvName}
                        onChange={(e) => setSaveCvName(e.target.value)}
                        placeholder="Name to save..."
                        className="flex-1 px-2 py-1 text-xs border border-slate-300 focus:outline-none focus:border-slate-500"
                      />
                      <label className="flex items-center space-x-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="w-3 h-3 rounded-sm border-slate-300"
                        />
                        <span>Def</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSaveCV}
                        disabled={!saveCvName.trim()}
                        className="px-2 py-1 bg-slate-700 text-white text-xs hover:bg-slate-800 disabled:bg-slate-300"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Job Description */}
            <div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Job Description</span>
              <SharpDropZone
                accept=".txt"
                file={jobFile}
                onFileSelect={setJobFile}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Settings Row */}
          <div className="flex items-end space-x-2 mb-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-0.5 block">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Optional"
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 focus:outline-none focus:border-slate-500 disabled:bg-slate-50"
              />
            </div>

            <div className="w-36">
              <label className="text-xs text-slate-500 mb-0.5 block">Backend</label>
              <select
                value={selectedBackend}
                onChange={(e) => handleBackendChange(e.target.value)}
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white focus:outline-none focus:border-slate-500"
              >
                {(backends || []).map(backend => (
                  <option key={backend.id} value={backend.id} disabled={!backend.available}>
                    {backend.name}{!backend.available ? ' (N/A)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-40">
              <label className="text-xs text-slate-500 mb-0.5 block">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white focus:outline-none focus:border-slate-500"
              >
                {(currentBackend?.models || [selectedModel]).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!(cvMode === 'stored' ? selectedCvId : cvFile) || !jobFile || submitting}
              className="px-6 py-1.5 bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center space-x-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing</span>
                </>
              ) : (
                <span>Generate</span>
              )}
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 px-2 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Progress */}
          {currentJob && currentJob.status !== 'completed' && (
            <div className="border border-slate-200 bg-slate-50 px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">{currentJob.stage}</span>
                <span className="text-xs font-mono text-slate-500">{currentJob.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1">
                <div
                  className="bg-slate-600 h-1 transition-all duration-500"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function SharpDropZone({
  accept,
  file,
  onFileSelect,
  disabled,
}: {
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border px-3 py-3 transition-colors ${
        isDragging
          ? 'border-slate-500 bg-slate-100'
          : file
            ? 'border-slate-400 bg-slate-50'
            : 'border-slate-300 hover:border-slate-400'
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm text-slate-700 truncate">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            className="p-0.5 text-slate-400 hover:text-slate-600"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
          <Upload className="w-4 h-4" />
          <span>Drop file or click to browse</span>
          <span className="text-xs text-slate-400">({accept})</span>
        </div>
      )}
    </div>
  );
}

function CompactDropZone({
  accept,
  file,
  onFileSelect,
  disabled,
}: {
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded px-3 py-4 text-center transition-colors ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : file
            ? 'border-green-400 bg-green-50'
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
        <div className="flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{file.name}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            <XCircle className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Upload className="w-4 h-4" />
          <span>Drop or <span className="text-indigo-600">browse</span></span>
          <span className="text-xs text-gray-400">({accept})</span>
        </div>
      )}
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
