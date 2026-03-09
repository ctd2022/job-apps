import { useEffect, useState } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { assembleCV } from '../api';

interface CVPreviewModalProps {
  onClose: () => void;
}

export default function CVPreviewModal({ onClose }: CVPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await assembleCV();

      // Use sections array if populated (respects visibility/order config),
      // otherwise fall back to individual fields in default order.
      let sectionTexts: string[];
      if (data.sections.length > 0) {
        sectionTexts = data.sections
          .filter(s => s.visible && s.text?.trim())
          .map(s => s.text);
      } else {
        sectionTexts = [
          data.summary_text,
          data.experience_text,
          data.education_text,
          data.certifications_text,
          data.skills_text,
          data.professional_development_text,
        ].filter(t => t?.trim());
      }

      const full = data.contact_header
        ? data.contact_header + '\n\n' + sectionTexts.join('\n\n')
        : sectionTexts.join('\n\n');
      setText(full);
    } catch {
      setError('Failed to load CV preview. Is your Profile set up?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Assembled CV Preview
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={load}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
              title="Refresh"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Building preview...</span>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm p-2">{error}</div>
          )}
          {!loading && !error && (
            <textarea
              readOnly
              value={text}
              className="w-full min-h-[60vh] font-mono text-xs text-slate-700 dark:text-slate-200 bg-transparent resize-none focus:outline-none leading-relaxed"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400">
          Read-only. Use "Pull from Profile" in the editor to insert these sections into your CV.
        </div>
      </div>
    </div>
  );
}
