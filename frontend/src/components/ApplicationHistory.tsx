import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
  Loader2,
  Save,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { getApplications, updateJobOutcome, toggleProfileInclude, getMatchHistory } from '../api';
import type { Application, MatchHistoryEntry, OutcomeStatus } from '../types';
import { getMatchTier } from '../utils/matchTier';

// Status configuration for display
const STATUS_CONFIG: Record<OutcomeStatus, { label: string; className: string }> = {
  saved: { label: 'Saved', className: 'bg-amber-100 text-amber-700' },
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
      setApplications(data);
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
                <th className="text-center px-3 py-2 font-medium w-10" title="Include in Position Profile">
                  <BarChart2 className="w-3.5 h-3.5 inline-block" />
                </th>
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
  const [included, setIncluded] = useState(application.include_in_profile !== false);
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

  async function handleProfileToggle(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const next = e.target.checked;
    setIncluded(next);
    try {
      await toggleProfileInclude(application.job_id, next);
    } catch {
      setIncluded(!next); // revert on failure
    }
  }

  const tier = getMatchTier(application.ats_score);

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
        <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium max-w-[200px]">
          <div className="flex items-center space-x-2">
            <span className="truncate">{application.job_name}</span>
            {application.employment_type && (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap border border-slate-200 dark:border-slate-600 rounded-sm">
                {application.employment_type}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{application.company_name || '-'}</td>
        <td className="px-3 py-2">
          <span className={`text-xs px-1.5 py-0.5 ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">{application.backend}</span>
        </td>
        <td className="px-3 py-2 text-right relative" onClick={handleScoreClick}>
          {tier ? (
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
        <td className="px-3 py-2 text-right text-slate-400 text-xs">
          {(application.files || []).length}
        </td>
        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
          {application.ats_score != null ? (
            <input
              type="checkbox"
              checked={included}
              onChange={handleProfileToggle}
              title={included ? 'Remove from Position Profile' : 'Include in Position Profile'}
              className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
            />
          ) : (
            <span className="text-slate-300 dark:text-slate-600 text-xs">–</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50 dark:bg-slate-700">
          <td colSpan={9} className="px-3 py-2">
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
