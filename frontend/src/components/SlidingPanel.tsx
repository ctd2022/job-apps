import { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlidingPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function SlidingPanel({ open, onClose, title, subtitle, children }: SlidingPanelProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile: bottom sheet / Desktop: right drawer */}
      <div
        className={[
          'fixed z-40 bg-white dark:bg-slate-800 shadow-xl flex flex-col',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 max-h-[80vh] rounded-t-xl',
          // Desktop: right drawer
          'lg:bottom-0 lg:top-0 lg:left-auto lg:right-0 lg:w-[440px] lg:max-h-none lg:rounded-none',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-2 flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </>
  );
}

export default SlidingPanel;
