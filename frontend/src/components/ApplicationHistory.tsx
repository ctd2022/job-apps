import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
  Loader2,
  Save
} from 'lucide-react';
import { getApplications, updateJobOutcome } from '../api';
import type { Application, OutcomeStatus } from '../types';

// Status configuration for display
const STATUS_CONFIG: Record<OutcomeStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  response: { label: 'Response', className: 'bg-indigo-100 text-indigo-700' },
  interview: { label: 'Interview', className: 'bg-purple-100 text-purple-700' },
  offer: { label: 'Offer', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-500' },
};

const ALL_STATUSES: OutcomeStatus[] = ['draft', 'submitted', 'response', 'interview', 'offer', 'rejected', 'withdrawn'];

function ApplicationHistory() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [backendFilter, setBackendFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<OutcomeStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Expanded rows
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const data = await getApplications();
      setApplications(Array.isArray(data) ? data : (data?.applications || []));
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  const backends = Array.from(new Set((applications || []).map(a => a.backend)));

  const filteredApplications = (applications || [])
    .filter(app => {
      const matchesSearch =
        app.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesBackend = backendFilter === 'all' || app.backend === backendFilter;
      const matchesStatus = statusFilter === 'all' || app.outcome_status === statusFilter;
      return matchesSearch && matchesBackend && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.timestamp.localeCompare(b.timestamp);
      } else if (sortBy === 'score') {
        comparison = (a.ats_score || 0) - (b.ats_score || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Stats
  const stats = {
    total: applications.length,
    avgScore: applications.length > 0
      ? Math.round(applications.filter(a => a.ats_score).reduce((sum, a) => sum + (a.ats_score || 0), 0) / applications.filter(a => a.ats_score).length) || 0
      : 0,
    highScore: Math.max(...applications.map(a => a.ats_score || 0), 0),
    thisMonth: applications.filter(a => {
      const appDate = parseTimestamp(a.timestamp);
      const now = new Date();
      return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
    }).length,
  };

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
            onClick={() => { setLoading(true); setError(null); loadApplications(); }}
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
      <div className="grid grid-cols-4 gap-2">
        <StatBox label="Total" value={stats.total} />
        <StatBox label="Avg ATS" value={`${stats.avgScore}%`} />
        <StatBox label="Best ATS" value={`${stats.highScore}%`} />
        <StatBox label="This Month" value={stats.thisMonth} />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center space-x-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search job or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
          />
        </div>

        <select
          value={backendFilter}
          onChange={(e) => setBackendFilter(e.target.value)}
          className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
        >
          <option value="all">All Backends</option>
          {backends.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OutcomeStatus | 'all')}
          className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <div className="flex border border-slate-300 dark:border-slate-600">
          <button
            onClick={() => {
              if (sortBy === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('date'); setSortOrder('desc'); }
            }}
            className={`px-2 py-1 text-xs ${sortBy === 'date' ? 'bg-slate-700 text-white dark:bg-slate-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
          >
            Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'score') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('score'); setSortOrder('desc'); }
            }}
            className={`px-2 py-1 text-xs border-l border-slate-300 dark:border-slate-600 ${sortBy === 'score' ? 'bg-slate-700 text-white dark:bg-slate-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
          >
            Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        {filteredApplications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-400">
            {searchQuery ? 'No matching applications' : 'No applications yet'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium w-8"></th>
                <th className="text-left px-3 py-2 font-medium">Job</th>
                <th className="text-left px-3 py-2 font-medium">Company</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Backend</th>
                <th className="text-right px-3 py-2 font-medium">ATS</th>
                <th className="text-right px-3 py-2 font-medium">Date</th>
                <th className="text-right px-3 py-2 font-medium">Files</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredApplications.map(app => (
                <ApplicationRow
                  key={app.folder_name || app.job_id}
                  application={app}
                  isExpanded={expandedRow === (app.folder_name || app.job_id)}
                  onToggle={() => setExpandedRow(expandedRow === (app.folder_name || app.job_id) ? null : (app.folder_name || app.job_id))}
                  onStatusUpdate={loadApplications}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        {filteredApplications.length} of {applications.length} applications
      </p>
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

function ApplicationRow({
  application,
  isExpanded,
  onToggle,
  onStatusUpdate
}: {
  application: Application;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusUpdate: () => void;
}) {
  const [newStatus, setNewStatus] = useState<OutcomeStatus>(application.outcome_status);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const atsColor = application.ats_score
    ? application.ats_score >= 70 ? 'text-green-600 dark:text-green-400' : application.ats_score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
    : 'text-slate-400';

  const statusConfig = STATUS_CONFIG[application.outcome_status] || STATUS_CONFIG.draft;

  async function handleSaveStatus() {
    if (!application.job_id) return;
    setSaving(true);
    try {
      await updateJobOutcome(application.job_id, {
        outcome_status: newStatus,
        notes: newNote || undefined,
      });
      setNewNote('');
      onStatusUpdate();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2 text-slate-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
        <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">{application.job_name}</td>
        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{application.company_name || '-'}</td>
        <td className="px-3 py-2">
          <span className={`text-xs px-1.5 py-0.5 ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">{application.backend}</span>
        </td>
        <td className={`px-3 py-2 text-right font-mono ${atsColor}`}>
          {application.ats_score ? `${application.ats_score}%` : '-'}
        </td>
        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 text-xs font-mono">
          {formatTimestamp(application.timestamp)}
        </td>
        <td className="px-3 py-2 text-right text-slate-400 text-xs">
          {(application.files || []).length}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50 dark:bg-slate-700">
          <td colSpan={8} className="px-3 py-2">
            {/* Files */}
            <div className="flex flex-wrap gap-1">
              {(application.files || []).map(file => (
                <span key={file} className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-xs text-slate-600 dark:text-slate-300">
                  <FileText className="w-3 h-3" />
                  <span>{file}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">outputs/{application.folder_name}</p>

            {/* Status Update Section */}
            {application.job_id && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Update Status:</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OutcomeStatus)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs border border-slate-300 dark:border-slate-500 px-2 py-1 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Add note (optional)..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs border border-slate-300 dark:border-slate-500 px-2 py-1 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-500"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveStatus(); }}
                    disabled={saving || (newStatus === application.outcome_status && !newNote)}
                    className="flex items-center space-x-1 text-xs bg-slate-700 text-white px-2 py-1 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Save</span>
                  </button>
                </div>

                {/* Display existing notes */}
                {application.notes && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 p-2">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Notes:</span>
                    <pre className="whitespace-pre-wrap mt-1">{application.notes}</pre>
                  </div>
                )}

                {/* Display key dates */}
                <div className="mt-2 flex space-x-4 text-xs text-slate-500 dark:text-slate-400">
                  {application.submitted_at && (
                    <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                  )}
                  {application.response_at && (
                    <span>Response: {new Date(application.response_at).toLocaleDateString()}</span>
                  )}
                  {application.outcome_at && (
                    <span>Outcome: {new Date(application.outcome_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function formatTimestamp(timestamp: string): string {
  const match = timestamp.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  if (!match) return timestamp;
  const [, , month, day, hour, minute] = match;
  return `${day}/${month} ${hour}:${minute}`;
}

function parseTimestamp(timestamp: string): Date {
  const match = timestamp.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return new Date();
  const [, year, month, day, hour, minute, second] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
}

export default ApplicationHistory;
