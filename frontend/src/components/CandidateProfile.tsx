import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Lock, X, Check, Loader, ExternalLink, ChevronRight, Eye, EyeOff, Wand2, RefreshCw } from 'lucide-react';
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
  listProfessionalDevelopment,
  createProfessionalDevelopment,
  updateProfessionalDevelopment,
  deleteProfessionalDevelopment,
  reorderProfessionalDevelopment,
  listIssuingOrgs,
  createIssuingOrg,
  updateIssuingOrg,
  deleteIssuingOrg,
  listEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  reorderEducation,
  assembleCV,
  generateSummary,
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
  ProfessionalDevelopment,
  ProfessionalDevelopmentCreate,
  ProfessionalDevelopmentUpdate,
  PDType,
  PDStatus,
  IssuingOrganisation,
  IssuingOrgCreate,
  Education,
  EducationCreate,
  SectionConfig,
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
  issuing_org_id: number | null;
  date_obtained: string;
  no_expiry: boolean;
  expiry_date: string;
  credential_id: string;
  credential_url: string;
}

const EMPTY_CERT_FORM: CertFormState = {
  name: '',
  issuing_org: '',
  issuing_org_id: null,
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
    issuing_org_id: cert.issuing_org_id,
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
    issuing_org_id: form.issuing_org_id,
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
  orgs: IssuingOrganisation[];
  onSave: (form: CertFormState) => void;
  onClose: () => void;
  onOrgCreated: (org: IssuingOrganisation) => void;
}

function CertModal({ initial, title, saving, orgs, onSave, onClose, onOrgCreated }: CertModalProps) {
  const [form, setForm] = useState<CertFormState>(initial);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);

  const set = <K extends keyof CertFormState>(key: K, value: CertFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const selectOrg = (orgIdStr: string) => {
    if (orgIdStr === '__new__') return;
    if (orgIdStr === '') {
      set('issuing_org_id', null);
      set('issuing_org', '');
    } else {
      const org = orgs.find(o => o.id === Number(orgIdStr));
      if (org) {
        set('issuing_org_id', org.id);
        set('issuing_org', org.name);
      }
    }
  };

  const handleQuickCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const created = await createIssuingOrg({ name: newOrgName.trim(), display_label: null, colour: '#6366f1', logo_url: null });
      onOrgCreated(created);
      set('issuing_org_id', created.id);
      set('issuing_org', created.name);
      setNewOrgName('');
    } finally {
      setCreatingOrg(false);
    }
  };

  const selectedOrg = orgs.find(o => o.id === form.issuing_org_id);
  const valid = form.name.trim() !== '' && (form.issuing_org_id !== null || form.issuing_org.trim() !== '');

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
            <div className="flex items-center gap-2">
              {selectedOrg && (
                <span className="inline-block w-4 h-4 rounded-full flex-shrink-0 border border-slate-200" style={{ background: selectedOrg.colour }} />
              )}
              <select
                value={form.issuing_org_id !== null ? String(form.issuing_org_id) : ''}
                onChange={e => selectOrg(e.target.value)}
                className={inputCls + ' flex-1'}
              >
                <option value="">— select or type below —</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.display_label ? `${o.name} (${o.display_label})` : o.name}</option>
                ))}
              </select>
            </div>
            {/* Fallback free-text if no org selected */}
            {form.issuing_org_id === null && (
              <input
                value={form.issuing_org}
                onChange={e => set('issuing_org', e.target.value)}
                className={inputCls + ' mt-1'}
                placeholder="Or type org name directly…"
              />
            )}
            {/* Quick-create inline */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                value={newOrgName}
                onChange={e => setNewOrgName(e.target.value)}
                placeholder="Create new org…"
                className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              <button
                onClick={handleQuickCreateOrg}
                disabled={!newOrgName.trim() || creatingOrg}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                {creatingOrg ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add
              </button>
            </div>
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

// ─── Issuing Organisations Admin ──────────────────────────────────────────────

interface IssuingOrgsAdminProps {
  orgs: IssuingOrganisation[];
  onChange: (orgs: IssuingOrganisation[]) => void;
}

function IssuingOrgsAdmin({ orgs, onChange }: IssuingOrgsAdminProps) {
  const [expanded, setExpanded] = useState(false);
  const [addName, setAddName] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addColour, setAddColour] = useState('#6366f1');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editColour, setEditColour] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const data: IssuingOrgCreate = { name: addName.trim(), display_label: addLabel.trim() || null, colour: addColour, logo_url: null };
      const created = await createIssuingOrg(data);
      onChange([...orgs, created]);
      setAddName('');
      setAddLabel('');
      setAddColour('#6366f1');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (org: IssuingOrganisation) => {
    setEditingId(org.id);
    setEditColour(org.colour);
    setEditLabel(org.display_label ?? '');
  };

  const handleSaveEdit = async (org: IssuingOrganisation) => {
    setSavingId(org.id);
    try {
      const updated = await updateIssuingOrg(org.id, { colour: editColour, display_label: editLabel || null });
      onChange(orgs.map(o => o.id === org.id ? updated : o));
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteIssuingOrg(id);
      onChange(orgs.filter(o => o.id !== id));
    } catch {
      alert('Cannot delete: certifications are linked to this organisation.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Issuing Organisations</span>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
          {orgs.length === 0 && (
            <p className="text-xs text-slate-400 italic">No organisations yet.</p>
          )}
          {orgs.map(org => (
            <div key={org.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="inline-block w-5 h-5 rounded-full flex-shrink-0 border border-slate-200" style={{ background: org.colour }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{org.name}</span>
                {org.display_label && <span className="ml-1.5 text-xs text-slate-400">({org.display_label})</span>}
              </div>
              {editingId === org.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={editColour}
                    onChange={e => setEditColour(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-300"
                    title="Brand colour"
                  />
                  <input
                    value={editColour}
                    onChange={e => setEditColour(e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    placeholder="#6366f1"
                  />
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="short label"
                  />
                  <button
                    onClick={() => handleSaveEdit(org)}
                    disabled={savingId === org.id}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    {savingId === org.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(org)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Edit colour/label">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(org.id)}
                    disabled={deletingId === org.id}
                    className="p-1 text-slate-400 hover:text-red-600 rounded disabled:opacity-50"
                    title="Delete (only if no certs use it)"
                  >
                    {deletingId === org.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add org row */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="color"
              value={addColour}
              onChange={e => setAddColour(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-slate-300 flex-shrink-0"
              title="Brand colour"
            />
            <input
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Organisation name *"
              className="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
            <input
              value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              placeholder="Short label"
              className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
            <button
              onClick={handleAdd}
              disabled={!addName.trim() || adding}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
            >
              {adding ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add
            </button>
          </div>
        </div>
      )}
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
  orgs: IssuingOrganisation[];
  groupingMode: 'flat' | 'by_org';
  onChange: (certs: Certification[]) => void;
  onGroupingModeChange: (mode: 'flat' | 'by_org') => void;
  onOrgCreated: (org: IssuingOrganisation) => void;
}

function CertificationsSection({ certifications, orgs, groupingMode, onChange, onGroupingModeChange, onOrgCreated }: CertificationsSectionProps) {
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

  const certAccentColour = (cert: Certification) => cert.org_colour ?? '#6366f1';

  const renderCertCard = (cert: Certification, idx: number, total: number) => (
    <div
      key={cert.id}
      className="flex items-start gap-2 rounded-md border bg-slate-50 dark:bg-slate-900 p-3"
      style={{ borderColor: certAccentColour(cert), borderLeftWidth: '3px' }}
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
          disabled={idx === total - 1}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cert info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          <span className="font-semibold" style={{ color: certAccentColour(cert) }}>{cert.name}</span>
          <span className="font-normal text-slate-500 dark:text-slate-400"> | {cert.org_display_label ?? cert.issuing_org}</span>
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
  );

  // Group by org for grouped view
  const orgMap = new Map(orgs.map(o => [o.id, o]));
  const grouped = new Map<number | null, Certification[]>();
  for (const cert of certifications) {
    const key = cert.issuing_org_id ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cert);
  }
  const sortedOrgIds = [...orgs]
    .filter(o => grouped.has(o.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(o => o.id);
  if (grouped.has(null)) sortedOrgIds.push(null as unknown as number);

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Certifications</h2>
          <div className="flex items-center gap-2">
            {/* Grouping toggle */}
            <div className="flex rounded overflow-hidden border border-slate-200 dark:border-slate-600 text-xs">
              <button
                onClick={() => onGroupingModeChange('flat')}
                className={`px-2.5 py-1 ${groupingMode === 'flat' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
              >Flat</button>
              <button
                onClick={() => onGroupingModeChange('by_org')}
                className={`px-2.5 py-1 ${groupingMode === 'by_org' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
              >By Issuer</button>
            </div>
            <button
              onClick={() => setAddingCert(true)}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Cert
            </button>
          </div>
        </div>

        {certifications.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">
            No certifications yet — click "Add Cert" to get started.
          </p>
        ) : groupingMode === 'by_org' ? (
          <div className="space-y-4">
            {sortedOrgIds.map(orgId => {
              const group = grouped.get(orgId as number | null) ?? [];
              const org = orgId !== null ? orgMap.get(orgId as number) : null;
              const label = org ? (org.display_label ?? org.name) : 'Other';
              const colour = org?.colour ?? '#94a3b8';
              return (
                <div key={String(orgId)}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: colour }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colour }}>{label}</span>
                  </div>
                  <div className="space-y-2">
                    {group.map(cert => renderCertCard(cert, certifications.indexOf(cert), certifications.length))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {certifications.map((cert, idx) => renderCertCard(cert, idx, certifications.length))}
          </div>
        )}
      </div>

      {addingCert && (
        <CertModal
          initial={EMPTY_CERT_FORM}
          title="Add Certification"
          saving={savingCert}
          orgs={orgs}
          onSave={handleAddCert}
          onClose={() => setAddingCert(false)}
          onOrgCreated={onOrgCreated}
        />
      )}
      {editingCert && (
        <CertModal
          initial={certToForm(editingCert)}
          title="Edit Certification"
          saving={savingCert}
          orgs={orgs}
          onSave={handleUpdateCert}
          onClose={() => setEditingCert(null)}
          onOrgCreated={onOrgCreated}
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
  const existingCategories = [...new Set(skills.map(s => s.category).filter(Boolean) as string[])].sort();

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
            <div key={cat || '__uncategorised__'} className={!cat && categoryOrder.length > 1 ? 'pt-2' : ''}>
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

// ─── Professional Development ─────────────────────────────────────────────────

const PD_TYPES: PDType[] = [
  'Certification',
  'Course / Training',
  'Degree / Qualification',
  'Professional Membership',
  'Conference / Event',
  'Self-directed',
];

const STATUS_BY_TYPE: Record<PDType, PDStatus[]> = {
  'Certification': ['In Progress', 'Studying', 'Paused', 'Completed'],
  'Course / Training': ['In Progress', 'Studying', 'Paused', 'Completed'],
  'Degree / Qualification': ['In Progress', 'Studying', 'Paused', 'Completed'],
  'Professional Membership': ['Ongoing'],
  'Conference / Event': ['Completed', 'In Progress'],
  'Self-directed': ['In Progress', 'Paused', 'Completed'],
};

const PD_TYPE_COLOURS: Record<PDType, string> = {
  'Certification': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'Course / Training': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'Degree / Qualification': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  'Professional Membership': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'Conference / Event': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  'Self-directed': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

interface PDFormState {
  type: PDType;
  title: string;
  provider: string;
  status: PDStatus;
  start_date: string;
  target_completion: string;
  completed_date: string;
  leads_to_credential: boolean;
  credential_url: string;
  show_on_cv: boolean;
  notes: string;
}

const EMPTY_PD_FORM: PDFormState = {
  type: 'Course / Training',
  title: '',
  provider: '',
  status: 'In Progress',
  start_date: '',
  target_completion: '',
  completed_date: '',
  leads_to_credential: false,
  credential_url: '',
  show_on_cv: true,
  notes: '',
};

function pdToForm(pd: ProfessionalDevelopment): PDFormState {
  return {
    type: pd.type,
    title: pd.title,
    provider: pd.provider ?? '',
    status: pd.status,
    start_date: pd.start_date ?? '',
    target_completion: pd.target_completion ?? '',
    completed_date: pd.completed_date ?? '',
    leads_to_credential: pd.leads_to_credential,
    credential_url: pd.credential_url ?? '',
    show_on_cv: pd.show_on_cv,
    notes: pd.notes ?? '',
  };
}

function formToPDCreate(form: PDFormState, display_order = 0): ProfessionalDevelopmentCreate {
  return {
    type: form.type,
    title: form.title.trim(),
    provider: form.provider.trim() || null,
    status: form.type === 'Professional Membership' ? 'Ongoing' : form.status,
    start_date: form.start_date.trim() || null,
    target_completion: form.status === 'Completed' || form.type === 'Professional Membership' ? null : (form.target_completion.trim() || null),
    completed_date: form.status === 'Completed' ? (form.completed_date.trim() || null) : null,
    leads_to_credential: form.leads_to_credential,
    credential_url: form.leads_to_credential ? (form.credential_url.trim() || null) : null,
    show_on_cv: form.show_on_cv,
    notes: form.notes.trim() || null,
    display_order,
  };
}

interface PDModalProps {
  initial: PDFormState;
  title: string;
  saving: boolean;
  onSave: (form: PDFormState) => void;
  onClose: () => void;
}

function PDModal({ initial, title, saving, onSave, onClose }: PDModalProps) {
  const [form, setForm] = useState<PDFormState>(initial);

  const set = <K extends keyof PDFormState>(key: K, value: PDFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleTypeChange = (newType: PDType) => {
    const allowedStatuses = STATUS_BY_TYPE[newType];
    const newStatus: PDStatus = newType === 'Professional Membership'
      ? 'Ongoing'
      : (allowedStatuses.includes(form.status) ? form.status : allowedStatuses[0]);
    setForm(prev => ({ ...prev, type: newType, status: newStatus }));
  };

  const isMembership = form.type === 'Professional Membership';
  const showLeadsToCredential = form.type === 'Certification' || form.type === 'Course / Training';
  const showTargetCompletion = form.status !== 'Completed' && !isMembership;
  const showCompletedDate = form.status === 'Completed';
  const allowedStatuses = STATUS_BY_TYPE[form.type];

  const valid = form.title.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => handleTypeChange(e.target.value as PDType)}
              className={inputCls}
            >
              {PD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className={inputCls}
              placeholder="AWS Solutions Architect"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Provider / Organisation</label>
            <input
              value={form.provider}
              onChange={e => set('provider', e.target.value)}
              className={inputCls}
              placeholder="Amazon Web Services"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as PDStatus)}
                disabled={isMembership}
                className={`${inputCls} disabled:opacity-60`}
              >
                {allowedStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
              <input
                type="month"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {showTargetCompletion && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Target Completion</label>
              <input
                type="month"
                value={form.target_completion}
                onChange={e => set('target_completion', e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {showCompletedDate && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Completed Date</label>
              <input
                type="month"
                value={form.completed_date}
                onChange={e => set('completed_date', e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {showLeadsToCredential && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.leads_to_credential}
                onChange={e => set('leads_to_credential', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Leads to a credential / certificate</span>
            </label>
          )}

          {form.leads_to_credential && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Credential URL</label>
              <input
                value={form.credential_url}
                onChange={e => set('credential_url', e.target.value)}
                className={inputCls}
                placeholder="https://verify.example.com/..."
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.show_on_cv}
              onChange={e => set('show_on_cv', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Show on CV
              {form.type === 'Conference / Event' && <span className="text-xs text-slate-400 ml-1">(default off for events)</span>}
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className={`${inputCls} resize-y`}
              placeholder="Optional notes..."
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

// ─── Professional Development Section ─────────────────────────────────────────

interface ProfessionalDevelopmentSectionProps {
  pdItems: ProfessionalDevelopment[];
  certifications: Certification[];
  onChange: (items: ProfessionalDevelopment[]) => void;
  onCertificationsChange: (certs: Certification[]) => void;
}

function ProfessionalDevelopmentSection({ pdItems, certifications, onChange, onCertificationsChange }: ProfessionalDevelopmentSectionProps) {
  const [addingPD, setAddingPD] = useState(false);
  const [editingPD, setEditingPD] = useState<ProfessionalDevelopment | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingPD, setSavingPD] = useState(false);

  const movePD = useCallback(async (index: number, direction: -1 | 1) => {
    const newList = [...pdItems];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    onChange(newList);
    await reorderProfessionalDevelopment(newList.map(p => p.id));
  }, [pdItems, onChange]);

  const handleAddPD = async (form: PDFormState) => {
    setSavingPD(true);
    try {
      const data: ProfessionalDevelopmentCreate = formToPDCreate(form, pdItems.length);
      const created = await createProfessionalDevelopment(data);
      onChange([...pdItems, created]);
      setAddingPD(false);

      if (
        created.status === 'Completed' &&
        created.type === 'Certification' &&
        created.leads_to_credential
      ) {
        if (window.confirm('Add this to your Certifications section?')) {
          const newCert = await createCertification({
            name: created.title,
            issuing_org: created.provider ?? '',
            issuing_org_id: null,
            date_obtained: created.completed_date ?? null,
            no_expiry: false,
            expiry_date: null,
            credential_id: null,
            credential_url: created.credential_url ?? null,
            display_order: certifications.length,
          });
          onCertificationsChange([...certifications, newCert]);
        }
      }
    } finally {
      setSavingPD(false);
    }
  };

  const handleUpdatePD = async (form: PDFormState) => {
    if (!editingPD) return;
    const prevStatus = editingPD.status;
    setSavingPD(true);
    try {
      const data: ProfessionalDevelopmentUpdate = formToPDCreate(form, editingPD.display_order);
      const updated = await updateProfessionalDevelopment(editingPD.id, data);
      onChange(pdItems.map(p => p.id === editingPD.id ? updated : p));
      setEditingPD(null);

      // Promotion flow: Cert + Completed + leads_to_credential → offer to add to Certifications
      if (
        prevStatus !== 'Completed' &&
        updated.status === 'Completed' &&
        updated.type === 'Certification' &&
        updated.leads_to_credential
      ) {
        if (window.confirm('This certification is now complete. Add it to your Certifications section?')) {
          const newCert = await createCertification({
            name: updated.title,
            issuing_org: updated.provider ?? '',
            issuing_org_id: null,
            date_obtained: updated.completed_date ?? null,
            no_expiry: false,
            expiry_date: null,
            credential_id: null,
            credential_url: updated.credential_url ?? null,
            display_order: certifications.length,
          });
          onCertificationsChange([...certifications, newCert]);
        }
      }
    } finally {
      setSavingPD(false);
    }
  };

  const handleDeletePD = async (id: number) => {
    if (!window.confirm('Delete this professional development item?')) return;
    setDeletingId(id);
    try {
      await deleteProfessionalDevelopment(id);
      onChange(pdItems.filter(p => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const formatPDMeta = (pd: ProfessionalDevelopment) => {
    const parts: string[] = [];
    if (pd.status === 'Completed' && pd.completed_date) parts.push(`Completed ${pd.completed_date}`);
    else if (pd.status === 'Ongoing') parts.push('Ongoing');
    else if (pd.target_completion) parts.push(`Expected ${pd.target_completion}`);
    else parts.push(pd.status);
    if (pd.start_date) parts.unshift(`Since ${pd.start_date}`);
    return parts.join(' · ');
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Professional Development</h2>
          <button
            onClick={() => setAddingPD(true)}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Activity
          </button>
        </div>

        {pdItems.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">
            No activities yet — click "Add Activity" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {pdItems.map((pd, idx) => (
              <div
                key={pd.id}
                className={`flex items-start gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 ${!pd.show_on_cv ? 'opacity-50' : ''}`}
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    onClick={() => movePD(idx, -1)}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => movePD(idx, 1)}
                    disabled={idx === pdItems.length - 1}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* PD info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block text-xs font-medium rounded px-1.5 py-0.5 ${PD_TYPE_COLOURS[pd.type]}`}>
                      {pd.type}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{pd.title}</p>
                    {pd.provider && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">| {pd.provider}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatPDMeta(pd)}</p>
                  {!pd.show_on_cv && (
                    <p className="text-xs text-slate-400 italic">Hidden from CV</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {pd.credential_url && (
                    <a
                      href={pd.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                      title="View credential"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setEditingPD(pd)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePD(pd.id)}
                    disabled={deletingId === pd.id}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === pd.id
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

      {addingPD && (
        <PDModal
          initial={EMPTY_PD_FORM}
          title="Add Professional Development Activity"
          saving={savingPD}
          onSave={handleAddPD}
          onClose={() => setAddingPD(false)}
        />
      )}
      {editingPD && (
        <PDModal
          initial={pdToForm(editingPD)}
          title="Edit Professional Development Activity"
          saving={savingPD}
          onSave={handleUpdatePD}
          onClose={() => setEditingPD(null)}
        />
      )}
    </>
  );
}

// ─── Education form state ────────────────────────────────────────────────────

interface EduFormState {
  institution: string;
  qualification: string;
  grade: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const EMPTY_EDU_FORM: EduFormState = {
  institution: '',
  qualification: '',
  grade: '',
  field_of_study: '',
  start_date: '',
  end_date: '',
  is_current: false,
};

function eduToForm(edu: Education): EduFormState {
  return {
    institution: edu.institution,
    qualification: edu.qualification,
    grade: edu.grade ?? '',
    field_of_study: edu.field_of_study ?? '',
    start_date: edu.start_date ?? '',
    end_date: edu.end_date ?? '',
    is_current: edu.is_current,
  };
}

function formToEduCreate(form: EduFormState, display_order = 0): EducationCreate {
  return {
    institution: form.institution.trim(),
    qualification: form.qualification.trim(),
    grade: form.grade.trim() || null,
    field_of_study: form.field_of_study.trim() || null,
    start_date: form.start_date.trim() || null,
    end_date: form.is_current ? null : (form.end_date.trim() || null),
    is_current: form.is_current,
    display_order,
  };
}

// ─── Education Modal ───────────────────────────────────────────────────────────

interface EduModalProps {
  initial: EduFormState;
  title: string;
  saving: boolean;
  onSave: (form: EduFormState) => void;
  onClose: () => void;
}

function EduModal({ initial, title, saving, onSave, onClose }: EduModalProps) {
  const [form, setForm] = useState<EduFormState>(initial);

  const set = <K extends keyof EduFormState>(key: K, value: EduFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const valid = form.institution.trim() !== '' && form.qualification.trim() !== '';

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
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qualification *</label>
              <input
                value={form.qualification}
                onChange={e => set('qualification', e.target.value)}
                className={inputCls}
                placeholder="BSc Computer Science"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Institution *</label>
              <input
                value={form.institution}
                onChange={e => set('institution', e.target.value)}
                className={inputCls}
                placeholder="University of London"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Field of Study</label>
              <input
                value={form.field_of_study}
                onChange={e => set('field_of_study', e.target.value)}
                className={inputCls}
                placeholder="Computer Vision, ML"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Grade</label>
              <input
                value={form.grade}
                onChange={e => set('grade', e.target.value)}
                className={inputCls}
                placeholder="2:1 Honours"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Year</label>
              <input
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className={inputCls}
                placeholder="2018"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">End Year</label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_current}
                    onChange={e => set('is_current', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  Current
                </label>
              </div>
              {form.is_current ? (
                <div className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 italic">
                  Present
                </div>
              ) : (
                <input
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                  className={inputCls}
                  placeholder="2021"
                />
              )}
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

// ─── Education Section ─────────────────────────────────────────────────────────

interface EducationSectionProps {
  education: Education[];
  onChange: (items: Education[]) => void;
}

function EducationSection({ education, onChange }: EducationSectionProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Education | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const moveEdu = useCallback(async (index: number, direction: -1 | 1) => {
    const newList = [...education];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    onChange(newList);
    await reorderEducation(newList.map(e => e.id));
  }, [education, onChange]);

  const handleAdd = async (form: EduFormState) => {
    setSaving(true);
    try {
      const created = await createEducation(formToEduCreate(form, education.length));
      onChange([...education, created]);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: EduFormState) => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await updateEducation(editing.id, formToEduCreate(form, editing.display_order));
      onChange(education.map(e => e.id === editing.id ? updated : e));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this education record?')) return;
    setDeletingId(id);
    try {
      await deleteEducation(id);
      onChange(education.filter(e => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Education</h2>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {education.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">
            No education yet — click "Add" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {education.map((edu, idx) => (
              <div
                key={edu.id}
                className="flex items-start gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3"
              >
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    onClick={() => moveEdu(idx, -1)}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveEdu(idx, 1)}
                    disabled={idx === education.length - 1}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {edu.qualification}
                    <span className="font-normal text-slate-500 dark:text-slate-400"> | {edu.institution}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {edu.start_date ?? '?'}{' – '}{edu.is_current ? 'Present' : (edu.end_date ?? '?')}
                  </p>
                  {(edu.grade || edu.field_of_study) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {[edu.grade ? `Grade: ${edu.grade}` : null, edu.field_of_study].filter(Boolean).join(' | ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(edu)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(edu.id)}
                    disabled={deletingId === edu.id}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === edu.id
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

      {adding && (
        <EduModal
          initial={EMPTY_EDU_FORM}
          title="Add Education"
          saving={saving}
          onSave={handleAdd}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <EduModal
          initial={eduToForm(editing)}
          title="Edit Education"
          saving={saving}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ─── Default section config ────────────────────────────────────────────────────

const DEFAULT_SECTION_CONFIG: SectionConfig[] = [
  { key: 'summary',                  label: 'Professional Summary', visible: true },
  { key: 'experience',               label: 'Work Experience',       visible: true },
  { key: 'education',                label: 'Education',             visible: true },
  { key: 'certifications',           label: 'Certifications',        visible: true },
  { key: 'skills',                   label: 'Skills',                visible: true },
  { key: 'professional_development', label: 'Professional Development', visible: true },
];

// ─── Section Config Panel ─────────────────────────────────────────────────────

interface SectionConfigPanelProps {
  config: SectionConfig[];
  onChange: (config: SectionConfig[]) => void;
}

function SectionConfigPanel({ config, onChange }: SectionConfigPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleVisible = async (key: string) => {
    const updated = config.map(s => s.key === key ? { ...s, visible: !s.visible } : s);
    onChange(updated);
    await updateProfile({ section_config: JSON.stringify(updated) } as ProfileUpdate);
  };

  const moveSection = async (index: number, direction: -1 | 1) => {
    const newList = [...config];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    onChange(newList);
    await updateProfile({ section_config: JSON.stringify(newList) } as ProfileUpdate);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">CV Section Order</span>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1">
          {config.map((section, idx) => (
            <div key={section.key} className="flex items-center gap-2 py-1">
              <button
                onClick={() => toggleVisible(section.key)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={section.visible ? 'Hide section' : 'Show section'}
              >
                {section.visible
                  ? <Eye className="w-4 h-4 text-blue-500" />
                  : <EyeOff className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                }
              </button>
              <span className={`flex-1 text-sm ${section.visible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {section.label}
              </span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => moveSection(idx, -1)}
                  disabled={idx === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-25"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveSection(idx, 1)}
                  disabled={idx === config.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-25"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Section ──────────────────────────────────────────────────────────

interface SummarySectionProps {
  profile: ProfileType | null;
  onSaved: (p: ProfileType) => void;
}

function SummarySection({ profile, onSaved }: SummarySectionProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showJD, setShowJD] = useState(false);
  const [jd, setJd] = useState('');

  useEffect(() => {
    setText(profile?.summary ?? '');
  }, [profile?.summary]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({ summary: text } as ProfileUpdate);
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!showJD) { setShowJD(true); return; }
    setGenerating(true);
    try {
      const assembled = await assembleCV();
      const result = await generateSummary(assembled.experience_text, jd || undefined);
      setText(result.summary);
    } finally {
      setGenerating(false);
    }
  };

  const dirty = text !== (profile?.summary ?? '');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Professional Summary</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
            title="Generate summary using AI"
          >
            {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Generate
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-3 h-3 animate-spin" /> : null}
              Save
            </button>
          )}
        </div>
      </div>

      {showJD && (
        <div className="mb-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Job description (optional — for a targeted summary)
          </label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            rows={3}
            className={`${inputCls} resize-y mb-1`}
            placeholder="Paste job description here…"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2.5 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? <Loader className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Generate now
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        className={`${inputCls} resize-y`}
        placeholder="A concise professional summary (3–4 sentences)…"
      />
      <p className="text-xs text-slate-400 mt-1">{text.length} characters</p>
    </div>
  );
}

// ─── Profile Preview ──────────────────────────────────────────────────────────

function ProfilePreview() {
  const [expanded, setExpanded] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await assembleCV();
      const parts: string[] = [];
      if (result.contact_header) parts.push(result.contact_header);
      for (const section of result.sections) {
        if (section.visible && section.text) {
          parts.push(section.text);
        }
      }
      setPreviewText(parts.join('\n\n'));
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    const wasExpanded = expanded;
    setExpanded(v => !v);
    if (!wasExpanded) refresh();
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">CV Preview</span>
        <div className="flex items-center gap-2">
          {expanded && (
            <button
              onClick={e => { e.stopPropagation(); refresh(); }}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              title="Refresh preview"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-200 dark:border-slate-700 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Loader className="w-4 h-4 animate-spin" /> Assembling CV…
            </div>
          ) : (
            <textarea
              readOnly
              value={previewText}
              rows={20}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-y focus:outline-none"
            />
          )}
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
  const [pdItems, setPdItems] = useState<ProfessionalDevelopment[]>([]);
  const [orgs, setOrgs] = useState<IssuingOrganisation[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig[]>(DEFAULT_SECTION_CONFIG);
  const [groupingMode, setGroupingMode] = useState<'flat' | 'by_org'>('flat');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingJob, setAddingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<JobHistoryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingJob, setSavingJob] = useState(false);

  const handleGroupingModeChange = useCallback(async (mode: 'flat' | 'by_org') => {
    setGroupingMode(mode);
    await updateProfile({ cert_grouping_mode: mode } as ProfileUpdate);
  }, []);

  const load = useCallback(async () => {
    try {
      const [p, jobs, certs, skillList, pdList, orgList, eduList] = await Promise.all([
        getProfile(),
        listJobHistory(),
        listCertifications(),
        listSkills(),
        listProfessionalDevelopment(),
        listIssuingOrgs(),
        listEducation(),
      ]);
      setProfile(p);
      setJobHistory(jobs);
      setCertifications(certs);
      setSkills(skillList);
      setPdItems(pdList);
      setOrgs(orgList);
      setEducation(eduList);
      // Restore grouping mode from profile if available
      if (p.cert_grouping_mode === 'by_org' || p.cert_grouping_mode === 'flat') setGroupingMode(p.cert_grouping_mode);
      // Restore section config from profile if available
      if (p.section_config) {
        try {
          const parsed = JSON.parse(p.section_config) as SectionConfig[];
          if (Array.isArray(parsed) && parsed.length > 0) setSectionConfig(parsed);
        } catch { /* ignore malformed JSON */ }
      }
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
        {/* Left column */}
        <div className="space-y-4">
          <SectionConfigPanel config={sectionConfig} onChange={setSectionConfig} />
          <SummarySection profile={profile} onSaved={setProfile} />
          <PersonalInfoSection profile={profile} onSaved={setProfile} />
          <IssuingOrgsAdmin orgs={orgs} onChange={setOrgs} />
          <CertificationsSection
            certifications={certifications}
            orgs={orgs}
            groupingMode={groupingMode}
            onChange={setCertifications}
            onGroupingModeChange={handleGroupingModeChange}
            onOrgCreated={org => setOrgs(prev => [...prev, org])}
          />
          <ProfessionalDevelopmentSection
            pdItems={pdItems}
            certifications={certifications}
            onChange={setPdItems}
            onCertificationsChange={setCertifications}
          />
        </div>

        {/* Right column: Work Experience + Education + Skills */}
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

          {/* Education */}
          <EducationSection education={education} onChange={setEducation} />

          {/* Skills */}
          <SkillsSection skills={skills} onChange={setSkills} />
        </div>
      </div>

      {/* Full-width CV Preview */}
      <ProfilePreview />

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
