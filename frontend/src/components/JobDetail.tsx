import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Clock,
  Server,
  Calendar,
  FileText,
  Edit3,
  X
} from 'lucide-react';
import { getJob, getJobFiles, updateJobOutcome, getJobDescription, getATSAnalysis, getMatchHistory } from '../api';
import type { Job, OutputFile, OutcomeStatus, JobDescription, ATSAnalysisData, MatchHistoryEntry } from '../types';
import FilePreview from './FilePreview';
import CVTextEditor from './CVTextEditor';
import { getMatchTier, getScoreBarColor } from '../utils/matchTier';
import MatchExplanationCard from './MatchExplanationCard';
import MatchHistoryTable from './MatchHistoryTable';
import MissingKeywordsAlert from './MissingKeywordsAlert';
import CVCompletenessMeter from './CVCompletenessMeter';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  response: { label: 'Response', className: 'bg-indigo-100 text-indigo-700' },
  interview: { label: 'Interview', className: 'bg-purple-100 text-purple-700' },
  offer: { label: 'Offer', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-500' },
};

const OUTCOME_OPTIONS: OutcomeStatus[] = [
  'draft', 'submitted', 'response', 'interview', 'offer', 'rejected', 'withdrawn'
];

function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [files, setFiles] = useState<OutputFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // ATS Analysis state
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysisData | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);

  // CV Editor modal state
  const [showCVEditor, setShowCVEditor] = useState(false);

  // Job Description modal state
  const [showJD, setShowJD] = useState(false);
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [loadingJD, setLoadingJD] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadJob();
  }, [id]);

  async function loadJob() {
    try {
      setLoading(true);
      const [jobData, filesData] = await Promise.all([
        getJob(id!),
        getJobFiles(id!).catch(() => []),
      ]);
      setJob(jobData);
      setFiles(filesData);
      setError(null);

      // Fetch ATS analysis and match history for completed jobs
      if (jobData.status === 'completed' && jobData.enable_ats) {
        setLoadingAnalysis(true);
        try {
          const [atsResult, historyResult] = await Promise.all([
            getATSAnalysis(id!),
            getMatchHistory(id!).catch(() => ({ job_id: id!, history: [] })),
          ]);
          setAtsAnalysis(atsResult.analysis);
          setMatchHistory(historyResult.history);
        } catch {
          // ATS analysis is optional - don't fail the page
        } finally {
          setLoadingAnalysis(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to load job:', err);
      setError(err?.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }

  async function handleOutcomeChange(newStatus: OutcomeStatus) {
    if (!job || updating) return;
    setUpdating(true);
    try {
      const updated = await updateJobOutcome(job.id, { outcome_status: newStatus });
      setJob(updated);
    } catch (err) {
      console.error('Failed to update outcome:', err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleViewJobDescription() {
    if (!job) return;
    setShowJD(true);
    setLoadingJD(true);
    try {
      const jd = await getJobDescription(job.id);
      setJobDescription(jd);
    } catch (err) {
      console.error('Failed to load job description:', err);
      setJobDescription({ job_id: job.id, description: null, source: null, message: 'Failed to load job description' });
    } finally {
      setLoadingJD(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error || 'Job not found'}</span>
          </div>
          <Link to="/" className="mt-3 inline-flex items-center text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[job.outcome_status] || STATUS_CONFIG.draft;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        {/* Job Status Header */}
        <div className={`px-4 py-3 border-b ${
          job.status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800' :
          job.status === 'failed' ? 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800' :
          'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {job.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : job.status === 'failed' ? (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              )}
              <div>
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {job.company_name || 'Application'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Job ID: {job.id}</p>
              </div>
            </div>

            {/* Outcome Status Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={job.outcome_status}
                onChange={(e) => handleOutcomeChange(e.target.value as OutcomeStatus)}
                disabled={updating}
                className={`text-xs px-2 py-1 border rounded ${statusConfig.className} ${
                  updating ? 'opacity-50' : ''
                }`}
              >
                {OUTCOME_OPTIONS.map(status => (
                  <option key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600 grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-500 dark:text-slate-400">Backend:</span>
              <span className="ml-1 text-slate-800 dark:text-slate-200">{job.backend}</span>
              {job.model && <span className="text-slate-400 text-xs ml-1">({job.model})</span>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-500 dark:text-slate-400">Created:</span>
              <span className="ml-1 text-slate-800 dark:text-slate-200">{formatDate(job.created_at)}</span>
            </div>
          </div>
          {job.completed_at && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Completed:</span>
                <span className="ml-1 text-slate-800 dark:text-slate-200">{formatDate(job.completed_at)}</span>
              </div>
            </div>
          )}
          {job.enable_ats && (
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">ATS Analysis Enabled</span>
            </div>
          )}
          {job.cv_version_id && (
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">CV version tracked</span>
            </div>
          )}
        </div>

        {/* View Original JD / Edit CV Buttons */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-600 flex items-center space-x-4">
          <button
            onClick={handleViewJobDescription}
            className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <FileText className="w-4 h-4" />
            <span>View Original JD</span>
          </button>
          {job.status === 'completed' && job.cv_version_id && (
            <button
              onClick={() => setShowCVEditor(true)}
              className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit CV</span>
            </button>
          )}
        </div>

        {/* ATS Score */}
        {job.ats_score !== undefined && job.ats_score !== null && (() => {
          const tier = getMatchTier(job.ats_score);
          return (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">ATS Match Score</span>
                <div className="flex items-center space-x-3">
                  {tier && (
                    <span className={`text-sm px-2 py-0.5 ${tier.bgColor} ${tier.color} ${tier.darkBgColor} ${tier.darkTextColor}`}>
                      {tier.label}
                    </span>
                  )}
                  <span className={`text-2xl font-bold ${tier?.color || 'text-slate-600'} ${tier?.darkTextColor || 'dark:text-slate-400'}`}>
                    {job.ats_score}%
                  </span>
                  {job.ats_score >= 85 && <Sparkles className="w-5 h-5 text-green-500 dark:text-green-400" />}
                </div>
              </div>
              <div className="mt-2 w-full bg-slate-200 dark:bg-slate-600 h-2">
                <div
                  className={`h-2 ${getScoreBarColor(job.ats_score)}`}
                  style={{ width: `${job.ats_score}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Match History (Idea #121) */}
        {matchHistory.length > 1 && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600">
            <MatchHistoryTable history={matchHistory} />
          </div>
        )}

        {/* ATS Analysis Details */}
        {job.status === 'completed' && atsAnalysis && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600 space-y-3">
            <MatchExplanationCard analysis={atsAnalysis} />
            <MissingKeywordsAlert analysis={atsAnalysis} />
            <CVCompletenessMeter analysis={atsAnalysis} />
          </div>
        )}

        {/* Loading ATS Analysis */}
        {loadingAnalysis && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600 flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading ATS analysis...</span>
          </div>
        )}

        {/* Error Message */}
        {job.status === 'failed' && job.error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Error:</span>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{job.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {(job.status === 'processing' || job.status === 'pending') && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">{job.stage || 'Processing...'}</span>
              <span className="text-sm font-mono text-slate-500 dark:text-slate-400">{job.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 h-2">
              <div
                className="bg-blue-500 h-2 transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Output Files */}
        {files.length > 0 && (
          <div className="px-4 py-3">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Generated Files</h3>
            <FilePreview jobId={job.id} files={files} />
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 flex space-x-3">
          <button
            onClick={() => navigate('/new')}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-500"
          >
            New Application
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex-1 px-4 py-2 bg-slate-800 text-white text-sm font-medium hover:bg-slate-900"
          >
            View All Applications
          </button>
        </div>
      </div>

      {/* CV Text Editor Modal */}
      {showCVEditor && job.cv_version_id && (
        <CVTextEditor
          cvVersionId={job.cv_version_id}
          onClose={() => { setShowCVEditor(false); loadJob(); }}
          onSaved={() => loadJob()}
          jobId={job.id}
        />
      )}

      {/* Job Description Modal */}
      {showJD && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Original Job Description</h3>
              <button
                onClick={() => setShowJD(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingJD ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : jobDescription?.description ? (
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono">
                  {jobDescription.description}
                </pre>
              ) : (
                <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p>{jobDescription?.message || 'Job description not available'}</p>
                  <p className="text-xs mt-2">This may be a legacy job created before JD storage was enabled.</p>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowJD(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default JobDetail;
