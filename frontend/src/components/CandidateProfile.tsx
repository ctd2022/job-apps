import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Lock, X, Check, Loader, ExternalLink } from 'lucide-react';
import {
  getProfile,
  updateProfile,
  listJobHistory,
  createJobHistoryRecord,
  updateJobHistoryRecord,
  deleteJobHistoryRecord,
  reorderJobHistory,
  listCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  reorderCertifications,
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} from '../api';
import type {
  CandidateProfile as ProfileType,
  JobHistoryRecord,
  ProfileUpdate,
  JobHistoryCreate,
  JobHistoryUpdate,
  Certification,
  CertificationCreate,
  CertificationUpdate,
  Skill,
  SkillCreate,
} from '../types';

// ─── Job modal form state ────────────────────────────────────────────────────

interface JobFormState {
  employer: string;
  title: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  details: string;
  tags_raw: string; // comma-separated input
}

const EMPTY_JOB_FORM: JobFormState = {
  employer: '',
  title: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: '',
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
    description: job.description ?? '',
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
    description: form.description.trim() || null,
    details: form.details.trim() || null,
    display_order: 0,
    tags: form.tags_raw.split(',').map(t => t.trim()).filter(Boolean),
  };
}

// ─── Certification modal form state ──────────────────────────────────────────

interface CertFormState {
  name: string;
  issuing_org: string;
  date_obtained: string;
  no_expiry: boolean;
  expiry_date: string;
  credential_id: string;
  credential_url: string;
}

const EMPTY_CERT_FORM: CertFormState = {
  name: '',
  issuing_org: '',
  date_obtained: '',
  no_expiry: false,
  expiry_date: '',
  credential_id: '',
  credential_url: '',
};

function certToForm(cert: Certification): CertFormState {
  return {
    name: cert.name,
    issuing_org: cert.issuing_org,
    date_obtained: cert.date_obtained ?? '',
    no_expiry: cert.no_expiry,
    expiry_date: cert.expiry_date ?? '',
    credential_id: cert.credential_id ?? '',
    credential_url: cert.credential_url ?? '',
  };
}

function formToCertCreate(form: CertFormState, display_order = 0): CertificationCreate {
  return {
    name: form.name.trim(),
    issuing_org: form.issuing_org.trim(),
    date_obtained: form.date_obtained.trim() || null,
    no_expiry: form.no_expiry,
    expiry_date: form.no_expiry ? null : (form.expiry_date.trim() || null),
    credential_id: form.credential_id.trim() || null,
    credential_url: form.credential_url.trim() || null,
    display_order,
  };
}

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls = "w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-xl">
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
                className={inputCls}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Job Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className={inputCls}
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
                className={inputCls}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">End Date</label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_current}
                    onChange={e => set('is_current', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  Present
                </label>
              </div>
              {form.is_current ? (
                <div className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 italic">
                  Present
                </div>
              ) : (
                <input
                  type="month"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Description
              <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">— safe to send to AI, do not include individual or company names</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className={`${inputCls} resize-y`}
              placeholder="Brief summary of the role and responsibilities"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Experience bullets
              <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">— safe to send to AI, do not include individual or company names</span>
            </label>
            <textarea
              value={form.details}
              onChange={e => set('details', e.target.value)}
              rows={4}
              className={`${inputCls} font-mono resize-y`}
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
              className={inputCls}
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

// ─── Certification Modal ──────────────────────────────────────────────────────

interface CertModalProps {
  initial: CertFormState;
  title: string;
  saving: boolean;
  onSave: (form: CertFormState) => void;
  onClose: () => void;
}

function CertModal({ initial, title, saving, onSave, onClose }: CertModalProps) {
  const [form, setForm] = useState<CertFormState>(initial);

  const set = (key: keyof CertFormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const valid = form.name.trim() !== '' && form.issuing_org.trim() !== '';

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
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Certification Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={inputCls}
              placeholder="AWS Solutions Architect – Associate"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Issuing Organisation *</label>
            <input
              value={form.issuing_org}
              onChange={e => set('issuing_org', e.target.value)}
              className={inputCls}
              placeholder="Amazon Web Services"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date Obtained</label>
              <input
                type="month"
                value={form.date_obtained}
                onChange={e => set('date_obtained', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Expiry Date</label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.no_expiry}
                    onChange={e => set('no_expiry', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  No expiry
                </label>
              </div>
              {form.no_expiry ? (
                <div className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 italic">
                  Does not expire
                </div>
              ) : (
                <input
                  type="month"
                  value={form.expiry_date}
                  onChange={e => set('expiry_date', e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Credential ID</label>
              <input
                value={form.credential_id}
                onChange={e => set('credential_id', e.target.value)}
                className={inputCls}
                placeholder="ABC123"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Credential URL</label>
              <input
                value={form.credential_url}
                onChange={e => set('credential_url', e.target.value)}
                className={inputCls}
                placeholder="https://verify.example.com/..."
              />
            </div>
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

// ─── Certifications Section ───────────────────────────────────────────────────

interface CertificationsSectionProps {
  certifications: Certification[];
  onChange: (certs: Certification[]) => void;
}

function CertificationsSection({ certifications, onChange }: CertificationsSectionProps) {
  const [addingCert, setAddingCert] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingCert, setSavingCert] = useState(false);

  const moveCert = useCallback(async (index: number, direction: -1 | 1) => {
    const newList = [...certifications];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    onChange(newList);
    await reorderCertifications(newList.map(c => c.id));
  }, [certifications, onChange]);

  const handleAddCert = async (form: CertFormState) => {
    setSavingCert(true);
    try {
      const data: CertificationCreate = formToCertCreate(form, certifications.length);
      const created = await createCertification(data);
      onChange([...certifications, created]);
      setAddingCert(false);
    } finally {
      setSavingCert(false);
    }
  };

  const handleUpdateCert = async (form: CertFormState) => {
    if (!editingCert) return;
    setSavingCert(true);
    try {
      const data: CertificationUpdate = formToCertCreate(form, editingCert.display_order);
      const updated = await updateCertification(editingCert.id, data);
      onChange(certifications.map(c => c.id === editingCert.id ? updated : c));
      setEditingCert(null);
    } finally {
      setSavingCert(false);
    }
  };

  const handleDeleteCert = async (id: number) => {
    if (!window.confirm('Delete this certification?')) return;
    setDeletingId(id);
    try {
      await deleteCertification(id);
      onChange(certifications.filter(c => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateRange = (cert: Certification) => {
    const parts: string[] = [];
    if (cert.date_obtained) parts.push(cert.date_obtained);
    if (cert.no_expiry) parts.push('No Expiry');
    else if (cert.expiry_date) parts.push(cert.expiry_date);
    return parts.join(' – ');
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Certifications</h2>
          <button
            onClick={() => setAddingCert(true)}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Cert
          </button>
        </div>

        {certifications.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">
            No certifications yet — click "Add Cert" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {certifications.map((cert, idx) => (
              <div
                key={cert.id}
                className="flex items-start gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3"
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    onClick={() => moveCert(idx, -1)}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveCert(idx, 1)}
                    disabled={idx === certifications.length - 1}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cert info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    <span className="font-semibold" style={{ color: '#FF9900' }}>{cert.name}</span>
                    <span className="font-normal text-slate-500 dark:text-slate-400"> | {cert.issuing_org}</span>
                  </p>
                  {formatDateRange(cert) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateRange(cert)}</p>
                  )}
                  {cert.credential_id && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">ID: {cert.credential_id}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                      title="View credential"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setEditingCert(cert)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCert(cert.id)}
                    disabled={deletingId === cert.id}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === cert.id
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

      {addingCert && (
        <CertModal
          initial={EMPTY_CERT_FORM}
          title="Add Certification"
          saving={savingCert}
          onSave={handleAddCert}
          onClose={() => setAddingCert(false)}
        />
      )}
      {editingCert && (
        <CertModal
          initial={certToForm(editingCert)}
          title="Edit Certification"
          saving={savingCert}
          onSave={handleUpdateCert}
          onClose={() => setEditingCert(null)}
        />
      )}
    </>
  );
}

// ─── Skills Section ───────────────────────────────────────────────────────────

interface SkillsSectionProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
}

function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Collect existing category names for datalist
  const existingCategories = [...new Set(skills.map(s => s.category).filter(Boolean) as string[])];

  // Group skills by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category || '';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const categoryOrder = Object.keys(grouped).sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  });

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const data: SkillCreate = {
        name: newName.trim(),
        category: newCategory.trim() || null,
        display_order: skills.length,
      };
      const created = await createSkill(data);
      onChange([...skills, created]);
      setNewName('');
      setNewCategory('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteSkill(id);
      onChange(skills.filter(s => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setEditName(skill.name);
    setEditCategory(skill.category ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingSkill || !editName.trim()) return;
    const updated = await updateSkill(editingSkill.id, {
      name: editName.trim(),
      category: editCategory.trim() || null,
    });
    onChange(skills.map(s => s.id === editingSkill.id ? updated : s));
    setEditingSkill(null);
  };

  const handleDeleteCategory = async (cat: string) => {
    setDeletingCategory(cat);
    try {
      const inCategory = skills.filter(s => s.category === cat);
      await Promise.all(inCategory.map(s => updateSkill(s.id, { category: null })));
      onChange(skills.map(s => s.category === cat ? { ...s, category: null } : s));
    } finally {
      setDeletingCategory(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Skills</h2>
      </div>

      {/* Add skill row */}
      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Skill name"
          className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          list="category-list"
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          placeholder="Category (optional)"
          className="w-36 px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="category-list">
          {existingCategories.map(cat => <option key={cat} value={cat} />)}
        </datalist>
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">
          No skills yet — add one above.
        </p>
      ) : (
        <div className="space-y-3">
          {categoryOrder.map(cat => (
            <div key={cat || '__uncategorised__'}>
              {cat && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {cat}
                  </p>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    disabled={deletingCategory === cat}
                    title="Remove category (skills kept, uncategorised)"
                    className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    {deletingCategory === cat
                      ? <Loader className="w-3 h-3 animate-spin" />
                      : <X className="w-3 h-3" />}
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {grouped[cat].map(skill => (
                  <div key={skill.id} className="group relative">
                    {editingSkill?.id === skill.id ? (
                      <div className="flex items-center gap-1 border border-blue-400 rounded-full px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingSkill(null); }}
                          className="text-xs w-24 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                          autoFocus
                        />
                        <input
                          list="category-list"
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          placeholder="category"
                          className="text-xs w-20 bg-transparent text-slate-500 dark:text-slate-400 focus:outline-none"
                        />
                        <button onClick={handleSaveEdit} className="text-blue-600 dark:text-blue-400 hover:text-blue-800">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingSkill(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => startEdit(skill)}
                        className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full px-2.5 py-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                        title="Click to edit"
                      >
                        {skill.name}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(skill.id); }}
                          disabled={deletingId === skill.id}
                          className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 ml-0.5"
                          title="Remove"
                        >
                          {deletingId === skill.id
                            ? <Loader className="w-2.5 h-2.5 animate-spin" />
                            : <X className="w-2.5 h-2.5" />
                          }
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateProfile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistoryRecord[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingJob, setAddingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<JobHistoryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingJob, setSavingJob] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, jobs, certs, skillList] = await Promise.all([
        getProfile(),
        listJobHistory(),
        listCertifications(),
        listSkills(),
      ]);
      setProfile(p);
      setJobHistory(jobs);
      setCertifications(certs);
      setSkills(skillList);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Candidate Profile</h1>
      </div>

      <PIIBanner />

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 items-start">
        {/* Left column: Personal Info + Certifications */}
        <div className="space-y-4">
          <PersonalInfoSection profile={profile} onSaved={setProfile} />
          <CertificationsSection certifications={certifications} onChange={setCertifications} />
        </div>

        {/* Right column: Work Experience + Skills */}
        <div className="space-y-4">
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

          {/* Skills */}
          <SkillsSection skills={skills} onChange={setSkills} />
        </div>
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
