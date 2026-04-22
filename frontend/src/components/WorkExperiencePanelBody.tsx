import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { JobHistoryRecord, JobHistoryUpdate } from '../types';
import { updateJobHistoryRecord } from '../api';

interface WorkExperiencePanelBodyProps {
  skill: string;
  jobs: JobHistoryRecord[];
  onJobUpdated: (updated: JobHistoryRecord) => void;
  onClose: () => void;
}

function formatDateRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const fmt = (d: string | null) => {
    if (!d) return '';
    const parts = d.split('-');
    const year = parts[0];
    const month = parseInt(parts[1] ?? '0', 10);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return month > 0 ? `${months[month - 1]} ${year}` : year;
  };
  const s = fmt(start);
  const e = isCurrent ? 'Present' : fmt(end);
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} \u2013 ${e}`;
}

function WorkExperiencePanelBody({ skill, jobs, onJobUpdated, onClose }: WorkExperiencePanelBodyProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<number, { description: string; details: string }>>({});

  // Auto-expand the first (most recent) entry when opened in skill-context mode (#672)
  useEffect(() => {
    if (skill && jobs.length > 0) {
      const first = jobs[0];
      setExpandedId(first.id);
      setEditValues({ [first.id]: { description: first.description ?? '', details: first.details ?? '' } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleExpand(job: JobHistoryRecord) {
    if (expandedId === job.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(job.id);
    if (!editValues[job.id]) {
      setEditValues(prev => ({
        ...prev,
        [job.id]: {
          description: job.description ?? '',
          details: job.details ?? '',
        },
      }));
    }
  }

  function handleChange(id: number, field: 'description' | 'details', value: string) {
    setEditValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleSave(job: JobHistoryRecord) {
    setSavingId(job.id);
    try {
      const vals = editValues[job.id];
      const update: JobHistoryUpdate = {
        description: vals.description || null,
        details: vals.details || null,
      };
      const updated = await updateJobHistoryRecord(job.id, update);
      onJobUpdated(updated);
      setExpandedId(null);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Persistent skill badge (#672) — only shown when panel is in skill-context mode */}
      {skill && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 flex items-center gap-2 text-xs">
          <span className="text-amber-600 dark:text-amber-400">Adding evidence for</span>
          <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 rounded font-medium">{skill}</span>
          <span className="text-amber-500 dark:text-amber-500 ml-auto">Edit the role below, then save.</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 min-h-0">
        {jobs.length === 0 && (
          <p className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
            No work experience on your profile yet.
            Add entries in the Profile page first.
          </p>
        )}

        {jobs.map(job => {
          const isExpanded = expandedId === job.id;
          const isSaving = savingId === job.id;
          const dateRange = formatDateRange(job.start_date, job.end_date, job.is_current);

          return (
            <div key={job.id}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleExpand(job)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {job.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {job.employer}
                    {dateRange && <span className="ml-2">· {dateRange}</span>}
                  </p>
                </div>
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                  : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                }
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-700/30 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                    Add evidence for{' '}
                    <strong className="text-slate-700 dark:text-slate-300">{skill}</strong>.{' '}
                    Employer, title, and dates are edited in the Profile page.
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Role description
                    </label>
                    <textarea
                      value={editValues[job.id]?.description ?? ''}
                      onChange={e => handleChange(job.id, 'description', e.target.value)}
                      rows={3}
                      className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 resize-y focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Brief overview of the role..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Key achievements &amp; details
                      {skill && <span className="ml-1 font-normal text-blue-500 dark:text-blue-500">— add your {skill} evidence here</span>}
                    </label>
                    <textarea
                      value={editValues[job.id]?.details ?? ''}
                      onChange={e => handleChange(job.id, 'details', e.target.value)}
                      rows={5}
                      className="w-full text-xs border-2 border-blue-400 dark:border-blue-500 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={skill ? `Add a bullet showing your experience with ${skill} — e.g. "Used ${skill} to..."` : 'Bullet points, achievements, metrics...'}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setExpandedId(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(job)}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700 dark:hover:bg-slate-500"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default WorkExperiencePanelBody;
