import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import { getBackends, createJob, subscribeToJobWithFallback, getJobFiles, getCVs, createCV, deleteCV, setDefaultCV, getProfile, listJobHistory } from '../api';
import type { Backend, Job, OutputFile, StoredCV, CandidateProfile } from '../types';
import FilePreview from './FilePreview';
import { getMatchTier, getScoreBarColor } from '../utils/matchTier';

function NewApplication() {
  const navigate = useNavigate();
  const [backends, setBackends] = useState<Backend[]>([]);
  const [storedCVs, setStoredCVs] = useState<StoredCV[]>([]);
  const [loading, setLoading] = useState(true);

  // CV selection state
  const [cvMode, setCvMode] = useState<'stored' | 'upload' | 'profile'>('stored');
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [saveCvName, setSaveCvName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Profile CV state
  const [profileData, setProfileData] = useState<CandidateProfile | null>(null);
  const [profileJobCount, setProfileJobCount] = useState(0);

  // Job description state
  const [jobDescMode, setJobDescMode] = useState<'upload' | 'paste'>('upload');
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobDescText, setJobDescText] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedBackend, setSelectedBackend] = useState(() => localStorage.getItem('llm_backend') || 'ollama');
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
      const [backendData, cvData, profile, jobHistory] = await Promise.all([
        getBackends(),
        getCVs(),
        getProfile().catch(() => null),
        listJobHistory().catch(() => []),
      ]);

      // Handle various response formats
      const backendList = Array.isArray(backendData) ? backendData : [];
      setBackends(backendList);

      // Set model: prefer saved choice, fall back to backend default
      const savedBackend = localStorage.getItem('llm_backend') || 'ollama';
      const savedModel = localStorage.getItem('llm_model');
      const targetBackend = backendList.find((b: Backend) => b.id === savedBackend)
        || backendList.find((b: Backend) => b.id === 'ollama');
      if (targetBackend) {
        setSelectedBackend(targetBackend.id);
        const model = savedModel && targetBackend.models?.includes(savedModel)
          ? savedModel
          : targetBackend.default_model;
        if (model) setSelectedModel(model);
      }

      // Set stored CVs
      setStoredCVs(cvData);

      // Store profile data
      if (profile) {
        setProfileData(profile);
        setProfileJobCount(Array.isArray(jobHistory) ? jobHistory.length : 0);
      }

      // Default to profile mode if profile has work history, else stored/upload
      if (profile && Array.isArray(jobHistory) && jobHistory.length > 0) {
        setCvMode('profile');
      } else {
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
    localStorage.setItem('llm_backend', backendId);
    const backend = (backends || []).find(b => b.id === backendId);
    if (backend?.default_model) {
      setSelectedModel(backend.default_model);
      localStorage.setItem('llm_model', backend.default_model);
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
    const hasCV = cvMode === 'profile'
      ? profileJobCount > 0
      : cvMode === 'stored' ? selectedCvId !== null : cvFile !== null;
    // Validate job description: either file uploaded or text pasted
    const hasJobDesc = jobDescMode === 'upload' ? jobFile !== null : jobDescText.trim().length > 0;
    if (!hasCV || !hasJobDesc) {
      setError(
        !hasCV && cvMode === 'profile'
          ? 'Your profile has no work history. Add jobs to your profile first.'
          : 'Please select a CV and provide a job description'
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Convert pasted text to File if needed
      const jobFileToSubmit = jobDescMode === 'upload'
        ? jobFile!
        : new File([jobDescText], 'pasted_job_description.txt', { type: 'text/plain' });

      // Create job with CV from stored, uploaded, or assembled profile
      const job = await createJob({
        cv_id: cvMode === 'stored' ? selectedCvId! : undefined,
        cv_file: cvMode === 'upload' ? cvFile! : undefined,
        use_profile: cvMode === 'profile' ? true : undefined,
        job_file: jobFileToSubmit,
        company_name: companyName || undefined,
        job_title: jobTitle || undefined,
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
    setJobDescText('');
    setJobDescMode('upload');
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
      <div className="w-full">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-green-50 dark:bg-green-900/30 px-6 py-4 border-b border-green-100 dark:border-green-800">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Application Generated!</h2>
                <p className="text-green-600 dark:text-green-400">Your tailored CV and cover letter are ready.</p>
              </div>
            </div>
          </div>

          {/* ATS Score */}
          {currentJob.ats_score && (() => {
            const tier = getMatchTier(currentJob.ats_score);
            return (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-slate-400">ATS Match Score</span>
                  <div className="flex items-center space-x-3">
                    {tier && (
                      <span className={`text-sm px-2 py-0.5 ${tier.bgColor} ${tier.color} ${tier.darkBgColor} ${tier.darkTextColor}`}>
                        {tier.label}
                      </span>
                    )}
                    <span className={`text-2xl font-bold ${tier?.color || 'text-slate-600'} ${tier?.darkTextColor || 'dark:text-slate-400'}`}>
                      {currentJob.ats_score}%
                    </span>
                    {currentJob.ats_score >= 85 && <Sparkles className="w-5 h-5 text-green-500" />}
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBarColor(currentJob.ats_score)}`}
                    style={{ width: `${currentJob.ats_score}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Output Files with Preview */}
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">Generated Files</h3>
            <FilePreview jobId={currentJob.id} files={outputFiles} />
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 flex space-x-3">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-lg text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-500"
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
    <div className="w-full">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        {/* Compact header bar */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">New Application</span>
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
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">CV</span>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setCvMode('profile')}
                    disabled={submitting}
                    className={`px-2 py-0.5 text-xs border-y border-l transition-colors ${
                      cvMode === 'profile'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setCvMode('stored')}
                    disabled={submitting || storedCVs.length === 0}
                    className={`px-2 py-0.5 text-xs border-y border-x transition-colors ${
                      cvMode === 'stored'
                        ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-600 dark:border-slate-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
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
                        ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-600 dark:border-slate-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                    }`}
                  >
                    Upload
                  </button>
                </div>
              </div>

              {/* Profile mode */}
              {cvMode === 'profile' && (
                <div className="border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2.5">
                  {profileJobCount > 0 ? (
                    <div className="flex items-start space-x-2">
                      <User className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 truncate">
                          {profileData?.full_name || 'Your Profile'}
                        </p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">
                          {profileJobCount} job{profileJobCount !== 1 ? 's' : ''} in work history
                        </p>
                        <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-0.5">
                          CV assembled live from profile data
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Profile is empty</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          Add work history in your{' '}
                          <a href="/profile" className="underline hover:no-underline">Profile</a>{' '}
                          to use this mode.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stored CVs - Compact */}
              {cvMode === 'stored' && storedCVs.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-600 divide-y divide-slate-100 dark:divide-slate-600">
                  {storedCVs.map(cv => (
                    <div
                      key={cv.id}
                      onClick={() => !submitting && setSelectedCvId(cv.id)}
                      className={`flex items-center justify-between px-2 py-1.5 cursor-pointer transition-colors ${
                        selectedCvId === cv.id
                          ? 'bg-slate-100 dark:bg-slate-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                      } ${submitting ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <input
                          type="radio"
                          checked={selectedCvId === cv.id}
                          onChange={() => {}}
                          className="w-3 h-3 text-slate-600 border-slate-300 dark:border-slate-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{cv.name}</span>
                        {cv.version_number && cv.version_number > 1 && (
                          <span className="text-xs px-1 py-0.5 bg-slate-200 dark:bg-slate-500 text-slate-600 dark:text-slate-200 rounded">
                            v{cv.version_number}
                          </span>
                        )}
                        {cv.is_default && <span className="text-xs text-slate-400">(default)</span>}
                      </div>
                      <div className="flex items-center">
                        {!cv.is_default && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSetDefaultCV(cv.id); }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="Set default"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCV(cv.id); }}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
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
                        className="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-slate-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                      <label className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="w-3 h-3 rounded-sm border-slate-300 dark:border-slate-500"
                        />
                        <span>Def</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSaveCV}
                        disabled={!saveCvName.trim()}
                        className="px-2 py-1 bg-slate-700 text-white text-xs hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-600"
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
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Job Description</span>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setJobDescMode('upload')}
                    disabled={submitting}
                    className={`px-2 py-0.5 text-xs border-y border-l transition-colors ${
                      jobDescMode === 'upload'
                        ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-600 dark:border-slate-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobDescMode('paste')}
                    disabled={submitting}
                    className={`px-2 py-0.5 text-xs border transition-colors ${
                      jobDescMode === 'paste'
                        ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-600 dark:border-slate-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                    }`}
                  >
                    Paste
                  </button>
                </div>
              </div>

              {jobDescMode === 'upload' ? (
                <SharpDropZone
                  accept=".txt"
                  file={jobFile}
                  onFileSelect={setJobFile}
                  disabled={submitting}
                />
              ) : (
                <textarea
                  value={jobDescText}
                  onChange={(e) => setJobDescText(e.target.value)}
                  placeholder="Paste the job description text here..."
                  disabled={submitting}
                  className="w-full h-[88px] px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                />
              )}
            </div>
          </div>

          {/* Settings Row */}
          <div className="flex items-end space-x-2 mb-3">
            <div className="w-32">
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 block">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Optional"
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 block">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Engineer"
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="w-36">
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 block">Backend</label>
              <select
                value={selectedBackend}
                onChange={(e) => handleBackendChange(e.target.value)}
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
              >
                {(backends || []).map(backend => (
                  <option key={backend.id} value={backend.id} disabled={!backend.available}>
                    {backend.name}{!backend.available ? ' (N/A)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-40">
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 block">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => { setSelectedModel(e.target.value); localStorage.setItem('llm_model', e.target.value); }}
                disabled={submitting}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
              >
                {(currentBackend?.models || [selectedModel]).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={
                !(cvMode === 'profile'
                  ? profileJobCount > 0
                  : cvMode === 'stored' ? selectedCvId : cvFile)
                || !(jobDescMode === 'upload' ? jobFile : jobDescText.trim())
                || submitting
              }
              className="px-6 py-1.5 bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center space-x-1.5"
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
            <div className="flex items-center space-x-2 px-2 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Progress */}
          {currentJob && currentJob.status !== 'completed' && (
            <div className="border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 dark:text-slate-300">{currentJob.stage}</span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{currentJob.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-600 h-1">
                <div
                  className="bg-slate-600 dark:bg-slate-400 h-1 transition-all duration-500"
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
          ? 'border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-600'
          : file
            ? 'border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-700'
            : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
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
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
          <Upload className="w-4 h-4" />
          <span>Drop file or click to browse</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">({accept})</span>
        </div>
      )}
    </div>
  );
}

export default NewApplication;

