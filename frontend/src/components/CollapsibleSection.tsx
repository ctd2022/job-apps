import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  defaultExpanded = false,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
          <span className="font-medium text-slate-700 dark:text-slate-200">{title}</span>
          {badge !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;
