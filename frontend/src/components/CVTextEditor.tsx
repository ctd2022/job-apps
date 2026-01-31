import { useEffect, useState } from 'react';
import { Loader2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { getCVVersionById, updateCVContent } from '../api';
import type { CVVersion } from '../types';

interface CVTextEditorProps {
  cvVersionId: number;
  onClose: () => void;
  onSaved: () => void;
}

function CVTextEditor({ cvVersionId, onClose, onSaved }: CVTextEditorProps) {
  const [version, setVersion] = useState<CVVersion | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedVersionNumber, setSavedVersionNumber] = useState<number | null>(null);

  const isDirty = content !== originalContent;

  useEffect(() => {
    loadVersion();
  }, [cvVersionId]);

  async function loadVersion() {
    try {
      setLoading(true);
      setError(null);
      const v = await getCVVersionById(cvVersionId);
      setVersion(v);
      setContent(v.content || '');
      setOriginalContent(v.content || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load CV version');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!version || !isDirty || saving) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await updateCVContent(version.cv_id, {
        content,
        change_summary: changeSummary || undefined,
      });
      setSavedVersionNumber(updated.version_number ?? null);
      setOriginalContent(content);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save CV');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Edit CV
            </h3>
            {version && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Editing version {version.version_number} — changes save as a new version
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : error && !version ? (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <>
              {/* Success banner */}
              {savedVersionNumber !== null && (
                <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-3 py-2 rounded text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved as version {savedVersionNumber}</span>
                </div>
              )}

              {/* Save error */}
              {error && (
                <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 rounded text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 font-mono text-sm p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                spellCheck={false}
              />

              {/* Change summary */}
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Change summary (optional)
                </label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g. Added missing Python keyword, rewrote summary"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save New Version</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CVTextEditor;
