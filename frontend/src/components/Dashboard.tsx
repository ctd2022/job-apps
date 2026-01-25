import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { getHealth, getJobs, getApplications, getMetrics } from '../api';
import type { Job, Application, HealthStatus, Metrics } from '../types';

function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [healthData, jobsData, appsData, metricsData] = await Promise.all([
        getHealth(),
        getJobs(),
        getApplications(),
        getMetrics(),
      ]);
      setHealth(healthData);
      setJobs(Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []));
      setApplications(Array.isArray(appsData) ? appsData : (appsData?.applications || []));
      setMetrics(metricsData);
      setError(null);
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }

  const activeJobs = (jobs || []).filter(j => j.status === 'processing' || j.status === 'pending');
  const recentApps = (applications || []).slice(0, 8);

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
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Application Funnel</span>
          </div>
          <div className="p-3">
            <FunnelChart metrics={metrics} />
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
              <RateBox label="Response Rate" value={metrics.rates.response_rate} />
              <RateBox label="Interview Rate" value={metrics.rates.interview_rate} />
              <RateBox label="Offer Rate" value={metrics.rates.offer_rate} />
            </div>
            {metrics.avg_time_to_response_days !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                Avg time to response: {metrics.avg_time_to_response_days} days
              </p>
            )}
          </div>
        </div>
      )}

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

function FunnelChart({ metrics }: { metrics: Metrics }) {
  const stages = [
    { key: 'submitted', label: 'Submitted', count: metrics.funnel.submitted, color: 'bg-blue-500' },
    { key: 'response', label: 'Response', count: metrics.funnel.response, color: 'bg-indigo-500' },
    { key: 'interview', label: 'Interview', count: metrics.funnel.interview, color: 'bg-purple-500' },
    { key: 'offer', label: 'Offer', count: metrics.funnel.offer, color: 'bg-green-500' },
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((stage, index) => {
        const width = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 10 : 0);
        const prevCount = index > 0 ? stages[index - 1].count : metrics.funnel.submitted;
        const conversionRate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;

        return (
          <div key={stage.key} className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 w-20">{stage.label}</span>
            <div className="flex-1 bg-slate-100 dark:bg-slate-600 h-5 relative">
              <div
                className={`${stage.color} h-5 transition-all`}
                style={{ width: `${width}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-700 dark:text-slate-200">
                {stage.count}
              </span>
            </div>
            {index > 0 && stage.count > 0 && (
              <span className="text-xs text-slate-400 w-12 text-right">{conversionRate}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RateBox({ label, value }: { label: string; value: number }) {
  const color = value >= 30 ? 'text-green-600 dark:text-green-400' : value >= 15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-400';
  return (
    <div className="text-center">
      <div className={`text-lg font-semibold font-mono ${color}`}>{value}%</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const navigate = useNavigate();
  return (
    <div className="px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => navigate(`/job/${job.id}`)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-1.5 py-0.5 ${
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
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  response: { label: 'Response', className: 'bg-indigo-100 text-indigo-700' },
  interview: { label: 'Interview', className: 'bg-purple-100 text-purple-700' },
  offer: { label: 'Offer', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-500' },
};

function ApplicationTableRow({ application }: { application: Application }) {
  const navigate = useNavigate();
  const atsColor = application.ats_score
    ? application.ats_score >= 70 ? 'text-green-600 dark:text-green-400' : application.ats_score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
    : 'text-slate-400';

  const statusConfig = STATUS_CONFIG[application.outcome_status] || STATUS_CONFIG.draft;

  return (
    <tr
      className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
      onClick={() => navigate(`/job/${application.job_id}`)}
    >
      <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">{application.job_title || application.job_name}</td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{application.company_name || '-'}</td>
      <td className="px-3 py-2">
        <span className={`text-xs px-1.5 py-0.5 ${statusConfig.className}`}>{statusConfig.label}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">{application.backend}</span>
      </td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 text-xs truncate max-w-[120px]" title={application.model}>
        {application.model || '-'}
      </td>
      <td className={`px-3 py-2 text-right font-mono ${atsColor}`}>
        {application.ats_score ? `${application.ats_score}%` : '-'}
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

export default Dashboard;
