import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Star,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  Plus,
} from 'lucide-react';
import {
  getCVs,
  createCV,
  deleteCV,
  setDefaultCV,
  renameCV,
  getCVVersions,
  getCV,
  updateCVContent,
} from '../api';
import type { StoredCV, CVVersion } from '../types';

function CVManager() {
  const [cvs, setCvs] = useState<StoredCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDefault, setUploadDefault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Version expansion
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [versions, setVersions] = useState<Record<number, CVVersion[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<number | null>(null);

  // Editor modal
  const [editorCvId, setEditorCvId] = useState<number | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorOriginal, setEditorOriginal] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);

  useEffect(() => {
    loadCVs();
  }, []);

  async function loadCVs() {
    try {
      setLoading(true);
      const data = await getCVs();
      setCvs(data);
    } catch {
      setError('Failed to load CVs');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    try {
      await createCV(uploadFile, uploadName.trim(), uploadDefault);
      setShowUpload(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDefault(false);
      await loadCVs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleRename(cvId: number) {
    if (!renameValue.trim()) return;
    try {
      await renameCV(cvId, renameValue.trim());
      setRenamingId(null);
      await loadCVs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  }

  async function handleDelete(cvId: number) {
    try {
      await deleteCV(cvId);
      setDeletingId(null);
      if (expandedId === cvId) setExpandedId(null);
      await loadCVs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleSetDefault(cvId: number) {
    try {
      await setDefaultCV(cvId);
      await loadCVs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  }

  async function toggleVersions(cvId: number) {
    if (expandedId === cvId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(cvId);
    if (!versions[cvId]) {
      setLoadingVersions(cvId);
      try {
        const v = await getCVVersions(cvId);
        setVersions(prev => ({ ...prev, [cvId]: v }));
      } catch {
        setError('Failed to load versions');
      } finally {
        setLoadingVersions(null);
      }
    }
  }

  async function openEditor(cvId: number) {
    setEditorCvId(cvId);
    setLoadingEditor(true);
    setEditorSummary('');
    try {
      const cv = await getCV(cvId);
      setEditorContent(cv.content || '');
      setEditorOriginal(cv.content || '');
    } catch {
      setError('Failed to load CV content');
      setEditorCvId(null);
    } finally {
      setLoadingEditor(false);
    }
  }

  async function handleSaveContent() {
    if (!editorCvId || editorContent === editorOriginal) return;
    setSaving(true);
    try {
      await updateCVContent(editorCvId, {
        content: editorContent,
        change_summary: editorSummary || undefined,
      });
      setEditorCvId(null);
      // Refresh versions if expanded
      if (expandedId === editorCvId) {
        const v = await getCVVersions(editorCvId);
        setVersions(prev => ({ ...prev, [editorCvId]: v }));
      }
      await loadCVs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">CV Manager</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Upload CV</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 flex justify-between items-center">
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload New CV</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadFile ? uploadFile.name : 'Choose file'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploadFile(f);
                  if (!uploadName) setUploadName(f.name.replace(/\.[^.]+$/, ''));
                }
              }}
            />
          </div>
          <input
            type="text"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="CV name..."
            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={uploadDefault}
              onChange={(e) => setUploadDefault(e.target.checked)}
              className="rounded"
            />
            <span>Set as default</span>
          </label>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => { setShowUpload(false); setUploadFile(null); setUploadName(''); }}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadName.trim() || uploading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
            >
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Upload</span>
            </button>
          </div>
        </div>
      )}

      {/* CV list */}
      {cvs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No CVs uploaded yet. Click "Upload CV" to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">Name</th>
                <th className="text-left px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">Versions</th>
                <th className="text-left px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">Created</th>
                <th className="text-right px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {cvs.map((cv) => (
                <CVRow
                  key={cv.id}
                  cv={cv}
                  isExpanded={expandedId === cv.id}
                  versions={versions[cv.id]}
                  loadingVersions={loadingVersions === cv.id}
                  isRenaming={renamingId === cv.id}
                  renameValue={renameValue}
                  isDeleting={deletingId === cv.id}
                  onToggleVersions={() => toggleVersions(cv.id)}
                  onStartRename={() => { setRenamingId(cv.id); setRenameValue(cv.name); }}
                  onRenameChange={setRenameValue}
                  onRenameSubmit={() => handleRename(cv.id)}
                  onRenameCancel={() => setRenamingId(null)}
                  onDelete={() => handleDelete(cv.id)}
                  onConfirmDelete={() => setDeletingId(cv.id)}
                  onCancelDelete={() => setDeletingId(null)}
                  onSetDefault={() => handleSetDefault(cv.id)}
                  onEdit={() => openEditor(cv.id)}
                  formatDate={formatDate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {editorCvId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Edit CV: {cvs.find(c => c.id === editorCvId)?.name}
              </h3>
              <button onClick={() => setEditorCvId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            {loadingEditor ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 min-h-[400px] p-4 font-mono text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 resize-none focus:outline-none"
                />
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                  <input
                    type="text"
                    value={editorSummary}
                    onChange={(e) => setEditorSummary(e.target.value)}
                    placeholder="Change summary (optional)"
                    className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setEditorCvId(null)}
                    className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContent}
                    disabled={editorContent === editorOriginal || saving}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save as New Version</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Row sub-component ----------

interface CVRowProps {
  cv: StoredCV;
  isExpanded: boolean;
  versions?: CVVersion[];
  loadingVersions: boolean;
  isRenaming: boolean;
  renameValue: string;
  isDeleting: boolean;
  onToggleVersions: () => void;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onSetDefault: () => void;
  onEdit: () => void;
  formatDate: (iso: string) => string;
}

function CVRow({
  cv, isExpanded, versions, loadingVersions, isRenaming, renameValue, isDeleting,
  onToggleVersions, onStartRename, onRenameChange, onRenameSubmit, onRenameCancel,
  onDelete, onConfirmDelete, onCancelDelete, onSetDefault, onEdit, formatDate,
}: CVRowProps) {
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
        {/* Name */}
        <td className="px-4 py-2.5">
          <div className="flex items-center space-x-2">
            {isRenaming ? (
              <div className="flex items-center space-x-1">
                <input
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onRenameSubmit();
                    if (e.key === 'Escape') onRenameCancel();
                  }}
                  autoFocus
                  className="px-2 py-0.5 border border-blue-400 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                />
                <button onClick={onRenameSubmit} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                <button onClick={onRenameCancel} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{cv.name}</span>
                {cv.is_default && (
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                    <Star className="w-3 h-3 mr-0.5 fill-current" />
                    Default
                  </span>
                )}
              </>
            )}
          </div>
        </td>

        {/* Versions */}
        <td className="px-4 py-2.5">
          <button
            onClick={onToggleVersions}
            className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>v{cv.version_number || 1}</span>
            {cv.version_count && cv.version_count > 1 && (
              <span className="text-xs text-slate-400">({cv.version_count} total)</span>
            )}
          </button>
        </td>

        {/* Created */}
        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
          {formatDate(cv.created_at)}
        </td>

        {/* Actions */}
        <td className="px-4 py-2.5">
          {isDeleting ? (
            <div className="flex items-center justify-end space-x-2">
              <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
              <button onClick={onDelete} className="text-xs text-red-600 hover:text-red-700 font-medium">Yes</button>
              <button onClick={onCancelDelete} className="text-xs text-slate-500 hover:text-slate-700">No</button>
            </div>
          ) : (
            <div className="flex items-center justify-end space-x-1">
              <button onClick={onEdit} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" title="Edit content">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onStartRename} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" title="Rename">
                <FileText className="w-3.5 h-3.5" />
              </button>
              {!cv.is_default && (
                <button onClick={onSetDefault} className="p-1 text-slate-400 hover:text-amber-500" title="Set as default">
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onConfirmDelete} className="p-1 text-slate-400 hover:text-red-600" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded version list */}
      {isExpanded && (
        <tr>
          <td colSpan={4} className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
            {loadingVersions ? (
              <div className="flex items-center space-x-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-xs text-slate-500">Loading versions...</span>
              </div>
            ) : versions && versions.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
                    <th className="text-left py-1 pr-4 font-medium">Version</th>
                    <th className="text-left py-1 pr-4 font-medium">Date</th>
                    <th className="text-left py-1 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-300">
                  {versions.map((v) => (
                    <tr key={v.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-4 font-mono">v{v.version_number}</td>
                      <td className="py-1 pr-4">{formatDate(v.created_at)}</td>
                      <td className="py-1 text-slate-500 dark:text-slate-400">{v.change_summary || 'Initial upload'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 py-1">No version history available.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default CVManager;
