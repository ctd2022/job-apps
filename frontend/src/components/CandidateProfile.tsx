import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Lock, X, Check, Loader } from 'lucide-react';
import {
  getProfile,
  updateProfile,
  listJobHistory,
  createJobHistoryRecord,
  updateJobHistoryRecord,
  deleteJobHistoryRecord,
  reorderJobHistory,
} from '../api';
import type { CandidateProfile as ProfileType, JobHistoryRecord, ProfileUpdate, JobHistoryCreate, JobHistoryUpdate } from '../types';

// ─── Job modal form state ────────────────────────────────────────────────────

interface JobFormState {
  employer: string;
  title: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  details: string;
  tags_raw: string; // comma-separated input
}

const EMPTY_JOB_FORM: JobFormState = {
  employer: '',
  title: '',
  start_date: '',
  end_date: '',
  is_current: false,
  details: '',
  tags_raw: '',
};

function jobToForm(job: JobHistoryRecord): JobFormState {
  return {
    employer: job.employer,
    title: job.title,
    start_date: job.start_date ?? '',
    end_date: job.end_date ?? '',
    is_current: job.is_current,
    details: job.details ?? '',
    tags_raw: job.tags.join(', '),
  };
}

function formToCreate(form: JobFormState): JobHistoryCreate {
  return {
    employer: form.employer.trim(),
    title: form.title.trim(),
    start_date: form.start_date.trim() || null,
    end_date: form.is_current ? null : (form.end_date.trim() || null),
    is_current: form.is_current,
    details: form.details.trim() || null,
    display_order: 0,
    tags: form.tags_raw.split(',').map(t => t.trim()).filter(Boolean),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PIIBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
      <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>
        <strong>Privacy:</strong> Employer names are stored locally and never sent to AI. They are
        automatically replaced with placeholders before any LLM call.
      </span>
    </div>
  );
}

// ─── Job Modal ────────────────────────────────────────────────────────────────

interface JobModalProps {
  initial: JobFormState;
  title: string;
  saving: boolean;
  onSave: (form: JobFormState) => void;
  onClose: () => void;
}

function JobModal({ initial, title, saving, onSave, onClose }: JobModalProps) {
  const [form, setForm] = useState<JobFormState>(initial);

  const set = (key: keyof JobFormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const valid = form.employer.trim() !== '' && form.title.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Employer *</label>
              <input
                value={form.employer}
                onChange={e => set('employer', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Job Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Senior Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
              <input
                type="month"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Date</label>
              <input
                type="month"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                disabled={form.is_current}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={e => set('is_current', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            Currently working here
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Experience bullets (safe to send to AI)
            </label>
            <textarea
              value={form.details}
              onChange={e => set('details', e.target.value)}
              rows={4}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
              placeholder="- Led migration to microservices, reducing latency by 40%&#10;- Mentored 3 junior engineers"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Skills / Tags (comma-separated)
            </label>
            <input
              value={form.tags_raw}
              onChange={e => set('tags_raw', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Python, AWS, Kubernetes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Personal Info Section ────────────────────────────────────────────────────

interface PersonalInfoSectionProps {
  profile: ProfileType | null;
  onSaved: (p: ProfileType) => void;
}

function PersonalInfoSection({ profile, onSaved }: PersonalInfoSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileUpdate>({});

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        location: profile.location ?? '',
        linkedin: profile.linkedin ?? '',
        website: profile.website ?? '',
        headline: profile.headline ?? '',
      });
    }
  }, [profile]);

  const set = (key: keyof ProfileUpdate, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      onSaved(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof ProfileUpdate, placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">{label}</label>
      {editing ? (
        <input
          value={(form[key] as string) ?? ''}
          onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
          {(profile?.[key] as string) || <span className="text-slate-400 italic">—</span>}
        </p>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Personal Info</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-3 h-3 animate-spin" /> : null}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {field('Full Name', 'full_name', 'David Smith')}
        {field('Headline', 'headline', 'Senior Software Engineer')}
        {field('Email', 'email', 'david@example.com')}
        {field('Phone', 'phone', '+44 7700 000000')}
        {field('Location', 'location', 'London, UK')}
        {field('LinkedIn', 'linkedin', 'linkedin.com/in/david')}
        {field('Website', 'website', 'davidsmith.dev')}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateProfile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingJob, setAddingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<JobHistoryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingJob, setSavingJob] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, jobs] = await Promise.all([getProfile(), listJobHistory()]);
      setProfile(p);
      setJobHistory(jobs);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reorder helpers
  const moveJob = useCallback(async (index: number, direction: -1 | 1) => {
    const newList = [...jobHistory];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    setJobHistory(newList);
    await reorderJobHistory(newList.map(j => j.id));
  }, [jobHistory]);

  const handleAddJob = useCallback(async (form: JobFormState) => {
    setSavingJob(true);
    try {
      const data: JobHistoryCreate = {
        ...formToCreate(form),
        display_order: jobHistory.length,
      };
      const created = await createJobHistoryRecord(data);
      setJobHistory(prev => [...prev, created]);
      setAddingJob(false);
    } finally {
      setSavingJob(false);
    }
  }, [jobHistory.length]);

  const handleUpdateJob = useCallback(async (form: JobFormState) => {
    if (!editingJob) return;
    setSavingJob(true);
    try {
      const data: JobHistoryUpdate = formToCreate(form);
      const updated = await updateJobHistoryRecord(editingJob.id, data);
      setJobHistory(prev => prev.map(j => j.id === editingJob.id ? updated : j));
      setEditingJob(null);
    } finally {
      setSavingJob(false);
    }
  }, [editingJob]);

  const handleDeleteJob = useCallback(async (id: number) => {
    if (!window.confirm('Delete this job record?')) return;
    setDeletingId(id);
    try {
      await deleteJobHistoryRecord(id);
      setJobHistory(prev => prev.filter(j => j.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        <Loader className="w-5 h-5 animate-spin mr-2" /> Loading profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Candidate Profile</h1>
      </div>

      <PIIBanner />

      {/* Personal Info */}
      <PersonalInfoSection profile={profile} onSaved={setProfile} />

      {/* Work Experience */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Work Experience</h2>
          <button
            onClick={() => setAddingJob(true)}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Job
          </button>
        </div>

        {jobHistory.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">
            No jobs yet — click "Add Job" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {jobHistory.map((job, idx) => (
              <div
                key={job.id}
                className="flex items-start gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3"
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    onClick={() => moveJob(idx, -1)}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveJob(idx, 1)}
                    disabled={idx === jobHistory.length - 1}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {job.title}
                    <span className="font-normal text-slate-500 dark:text-slate-400"> | {job.employer}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {job.start_date ?? '?'}
                    {' – '}
                    {job.is_current ? 'Present' : (job.end_date ?? '?')}
                  </p>
                  {job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {job.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingJob(job)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={deletingId === job.id}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === job.id
                      ? <Loader className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {addingJob && (
        <JobModal
          initial={EMPTY_JOB_FORM}
          title="Add Job"
          saving={savingJob}
          onSave={handleAddJob}
          onClose={() => setAddingJob(false)}
        />
      )}
      {editingJob && (
        <JobModal
          initial={jobToForm(editingJob)}
          title="Edit Job"
          saving={savingJob}
          onSave={handleUpdateJob}
          onClose={() => setEditingJob(null)}
        />
      )}
    </div>
  );
}
