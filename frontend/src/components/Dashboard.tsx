import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Bookmark,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { getHealth, getJobs, getApplications, getMetrics, getMatchHistory, getSavedJobs, createSavedJob, deleteSavedJob } from '../api';
import type { Job, Application, HealthStatus, MatchHistoryEntry, Metrics, SavedJob } from '../types';
import { getMatchTier } from '../utils/matchTier';
import PipelineDiagnosis from './PipelineDiagnosis';

function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [healthData, jobsData, appsData, metricsData, savedData] = await Promise.all([
        getHealth(),
        getJobs(),
        getApplications(),
        getMetrics(),
        getSavedJobs(),
      ]);
      setHealth(healthData);
      setJobs(Array.isArray(jobsData) ? jobsData : ((jobsData as any)?.jobs || []));
      setApplications(appsData);
      setMetrics(metricsData);
      setSavedJobs(savedData);
      setError(null);
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSaved(jobId: string) {
    await deleteSavedJob(jobId);
    setSavedJobs(prev => prev.filter(j => j.job_id !== jobId));
  }

  const [visibleCount, setVisibleCount] = useState(8);

  const activeJobs = (jobs || []).filter(j => j.status === 'processing' || j.status === 'pending');
  const allRecentApps = applications || [];
  const recentApps = allRecentApps.slice(0, visibleCount);
  const hasMoreApps = allRecentApps.length > visibleCount;

  const totalApps = (applications || []).length;
  const appsWithScore = (applications || []).filter(a => a.ats_score);
  const avgAtsScore = appsWithScore.length > 0
    ? Math.round(appsWithScore.reduce((sum, a) => sum + (a.ats_score || 0), 0) / appsWithScore.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
          <button
            onClick={() => { setLoading(true); setError(null); loadData(); }}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-2">
        <StatBox label="Applications" value={totalApps} />
        <StatBox label="Avg ATS" value={`${avgAtsScore}%`} />
        <StatBox label="Active" value={activeJobs.length} />
        <StatBox
          label="Backends"
          value={health?.backends ? Object.values(health.backends).filter(Boolean).length : 0}
        />
        <Link
          to="/new"
          className="bg-slate-800 text-white px-3 py-2 flex items-center justify-center space-x-2 text-sm font-medium hover:bg-slate-900"
        >
          <span>New Application</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Backend Status */}
      {health?.backends && (
        <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="uppercase tracking-wide font-medium">Backends:</span>
          <BackendStatus name="Ollama" available={health.backends.ollama ?? false} />
          <BackendStatus name="Llama.cpp" available={health.backends.llamacpp ?? false} />
          <BackendStatus name="Gemini" available={health.backends.gemini ?? false} />
        </div>
      )}

      {/* Application Funnel Metrics */}
      {metrics && metrics.funnel.submitted > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center space-x-2">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Application Funnel</span>
          </div>
          <CompactFunnel metrics={metrics} />
        </div>
      )}

      <PipelineDiagnosis />

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Active Jobs</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {activeJobs.map(job => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Saved Jobs (Wishlist) */}
      <SavedJobsSection
        savedJobs={savedJobs}
        onDelete={handleDeleteSaved}
        onCreated={(job) => setSavedJobs(prev => [job, ...prev])}
      />

      {/* Recent Applications */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Recent Applications</span>
          <Link to="/history" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            View all →
          </Link>
        </div>
        {recentApps.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-400">
            No applications yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Job</th>
                <th className="text-left px-3 py-2 font-medium">Company</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Backend</th>
                <th className="text-left px-3 py-2 font-medium">Model</th>
                <th className="text-right px-3 py-2 font-medium">ATS</th>
                <th className="text-right px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentApps.map(app => (
                <ApplicationTableRow key={app.folder_name} application={app} />
              ))}
            </tbody>
          </table>
        )}
        {hasMoreApps && (
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 text-center">
            <button
              onClick={() => setVisibleCount(v => v + 8)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Show more ({allRecentApps.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2">
      <div className="text-xl font-semibold text-slate-800 dark:text-slate-100 font-mono">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function BackendStatus({ name, available }: { name: string; available: boolean }) {
  return (
    <span className={`flex items-center space-x-1 ${available ? 'text-green-600' : 'text-slate-400'}`}>
      {available ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      <span>{name}</span>
    </span>
  );
}

function CompactFunnel({ metrics }: { metrics: Metrics }) {
  const stages = [
    { label: 'Submitted', count: metrics.funnel.submitted, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Response',  count: metrics.funnel.response,  color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Interview', count: metrics.funnel.interview, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Offer',     count: metrics.funnel.offer,     color: 'text-green-600 dark:text-green-400' },
  ];
  return (
    <div className="grid grid-cols-4 divide-x divide-slate-200 dark:divide-slate-600">
      {stages.map(stage => (
        <div key={stage.label} className="px-3 py-2 text-center">
          <div className={`text-xl font-semibold font-mono ${stage.color}`}>{stage.count}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">{stage.label}</div>
        </div>
      ))}
    </div>
  );
}

function getAtsRag(score: number | undefined | null): 'green' | 'amber' | 'red' | null {
  if (score == null) return null;
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

const RAG_ROW: Record<string, string> = {
  green: 'bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20',
  amber: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20',
  red:   'bg-red-50   hover:bg-red-100   dark:bg-red-900/10   dark:hover:bg-red-900/20',
};

const RAG_SCORE_PILL: Record<string, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red:   'bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300',
};

function JobRow({ job }: { job: Job }) {
  const navigate = useNavigate();
  return (
    <div className="px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => navigate(`/job/${job.id}`)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            job.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
          }`}>
            {job.status === 'processing' && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
            {job.status}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">{job.job_title || job.company_name || 'Unknown'}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">{job.progress}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-slate-200 dark:bg-slate-600 h-1">
          <div className="bg-slate-600 dark:bg-slate-400 h-1 transition-all" style={{ width: `${job.progress}%` }} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 w-24 truncate">{job.stage}</span>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',      className: 'bg-slate-100  text-slate-600  dark:bg-slate-700    dark:text-slate-400'  },
  submitted: { label: 'Submitted',  className: 'bg-blue-100   text-blue-700   dark:bg-blue-900/50  dark:text-blue-300'   },
  response:  { label: 'Response',   className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  interview: { label: 'Interview',  className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  offer:     { label: 'Offer',      className: 'bg-green-100  text-green-700  dark:bg-green-900/50 dark:text-green-300'  },
  rejected:  { label: 'Rejected',   className: 'bg-red-100    text-red-700    dark:bg-red-900/50   dark:text-red-300'    },
  withdrawn: { label: 'Withdrawn',  className: 'bg-gray-100   text-gray-500   dark:bg-gray-800     dark:text-gray-400'   },
};

function ApplicationTableRow({ application }: { application: Application }) {
  const navigate = useNavigate();
  const tier = getMatchTier(application.ats_score);
  const rag = getAtsRag(application.ats_score);
  const statusConfig = STATUS_CONFIG[application.outcome_status] || STATUS_CONFIG.draft;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<MatchHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!historyOpen) return;
    function handleClick(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [historyOpen]);

  async function handleScoreClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!application.job_id) return;
    setHistoryOpen(h => !h);
    if (history === null && !historyLoading) {
      setHistoryLoading(true);
      try {
        const res = await getMatchHistory(application.job_id);
        setHistory(res.history);
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
  }

  return (
    <tr
      className={`cursor-pointer ${rag ? RAG_ROW[rag] : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
      onClick={() => navigate(`/job/${application.job_id}`)}
    >
      <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">{application.job_title || application.job_name}</td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{application.company_name || '-'}</td>
      <td className="px-3 py-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.className}`}>{statusConfig.label}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">{application.backend}</span>
      </td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 text-xs truncate max-w-[120px]" title={application.model}>
        {application.model || '-'}
      </td>
      <td className="px-3 py-2 text-right relative" onClick={handleScoreClick}>
        {tier && rag ? (
          <div className="flex flex-col items-end cursor-pointer select-none" title="Click to see score history">
            <span className={`text-xs px-1.5 py-0.5 font-medium ${RAG_SCORE_PILL[rag]}`}>
              {tier.label}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{application.ats_score}%</span>
          </div>
        ) : tier ? (
          <div className="flex flex-col items-end cursor-pointer select-none" title="Click to see score history">
            <span className={`text-xs px-1.5 py-0.5 ${tier.bgColor} ${tier.color} ${tier.darkBgColor} ${tier.darkTextColor}`}>
              {tier.label}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{application.ats_score}%</span>
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
        {historyOpen && tier && (
          <div
            ref={historyRef}
            className="absolute right-0 top-full mt-1 z-50 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-lg text-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Score History</span>
            </div>
            {historyLoading && (
              <div className="px-3 py-3 flex items-center space-x-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {!historyLoading && history !== null && history.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-400">No history recorded.</div>
            )}
            {!historyLoading && history !== null && history.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                {[...history].reverse().map((entry, idx) => {
                  const isLatest = idx === 0;
                  const delta = entry.delta;
                  const deltaIcon = delta == null ? null
                    : delta > 0 ? <TrendingUp className="w-3 h-3 text-green-500" />
                    : delta < 0 ? <TrendingDown className="w-3 h-3 text-red-500" />
                    : <Minus className="w-3 h-3 text-slate-400" />;
                  const deltaText = delta == null ? null
                    : delta > 0 ? `+${delta}%`
                    : delta < 0 ? `${delta}%`
                    : '0%';
                  return (
                    <div key={entry.id} className={`px-3 py-2 ${isLatest ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">#{entry.iteration}</span>
                          {isLatest && <span className="text-[10px] px-1 bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300">latest</span>}
                        </div>
                        <div className="flex items-center space-x-1">
                          {deltaIcon}
                          {deltaText && <span className={`text-xs font-mono ${delta! > 0 ? 'text-green-600 dark:text-green-400' : delta! < 0 ? 'text-red-500' : 'text-slate-400'}`}>{deltaText}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-100">{entry.score}%</span>
                        {entry.matched != null && entry.total != null && (
                          <span className="text-[10px] text-slate-400 font-mono">{entry.matched}/{entry.total} kw</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 text-xs font-mono">
        {formatTimestamp(application.timestamp)}
      </td>
    </tr>
  );
}

function formatTimestamp(timestamp: string): string {
  const match = timestamp.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  if (!match) return timestamp;
  const [, , month, day, hour, minute] = match;
  return `${day}/${month} ${hour}:${minute}`;
}

// ── Saved Jobs / Wishlist (Idea #491) ─────────────────────────────────────────

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];

function SavedJobsSection({
  savedJobs,
  onDelete,
  onCreated,
}: {
  savedJobs: SavedJob[];
  onDelete: (jobId: string) => void;
  onCreated: (job: SavedJob) => void;
}) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [salary, setSalary] = useState('');
  const [empType, setEmpType] = useState('');

  function resetForm() {
    setTitle(''); setCompany(''); setUrl(''); setJdText(''); setSalary(''); setEmpType('');
    setFormError(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !company.trim()) {
      setFormError('Job title and company are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const job = await createSavedJob({
        job_title: title.trim(),
        company_name: company.trim(),
        listing_url: url.trim() || undefined,
        job_description_text: jdText.trim() || undefined,
        salary: salary.trim() || undefined,
        employment_type: empType || undefined,
      });
      onCreated(job as SavedJob);
      resetForm();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save job.');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePromote(job: SavedJob) {
    navigate('/new', {
      state: {
        savedJob: {
          title: job.job_title,
          company: job.company_name,
          jdText: job.job_description_text || '',
        },
      },
    });
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bookmark className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            Saved Jobs
          </span>
          {savedJobs.length > 0 && (
            <span className="text-xs text-slate-400 font-mono">({savedJobs.length})</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showForm ? 'Cancel' : 'Add'}</span>
        </button>
      </div>

      {/* Quick-add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Job Title *</label>
              <input
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:border-slate-400"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Engineer"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Company *</label>
              <input
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:border-slate-400"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Acme Ltd"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Listing URL</label>
              <input
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:border-slate-400"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Salary</label>
              <input
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:border-slate-400"
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="e.g. 60,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Employment Type</label>
            <select
              className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:border-slate-400"
              value={empType}
              onChange={e => setEmpType(e.target.value)}
            >
              <option value="">— select —</option>
              {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Job Description</label>
            <textarea
              className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 focus:outline-none focus:border-slate-400 resize-none"
              rows={4}
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the job description here..."
            />
          </div>
          {formError && (
            <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 dark:bg-slate-600 text-white text-xs font-medium hover:bg-slate-900 dark:hover:bg-slate-500 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{submitting ? 'Saving...' : 'Save Job'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Saved jobs list */}
      {savedJobs.length === 0 && !showForm ? (
        <div className="p-4 text-center text-sm text-slate-400">
          No saved jobs. Click Add to capture a job before you apply.
        </div>
      ) : savedJobs.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Job</th>
              <th className="text-left px-3 py-2 font-medium">Company</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Salary</th>
              <th className="text-right px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {savedJobs.map(job => (
              <tr key={job.job_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                  <div className="flex items-center space-x-1.5">
                    <span className="truncate">{job.job_title}</span>
                    {job.listing_url && (
                      <a
                        href={job.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{job.company_name}</td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">{job.employment_type || '-'}</td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">{job.salary || '-'}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handlePromote(job)}
                      className="text-xs px-2 py-0.5 bg-slate-800 dark:bg-slate-600 text-white hover:bg-slate-900 dark:hover:bg-slate-500"
                    >
                      Prepare
                    </button>
                    <button
                      onClick={() => onDelete(job.job_id)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                      title="Remove from saved"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export default Dashboard;
