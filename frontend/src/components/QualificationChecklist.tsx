import { CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import type { QualificationChecklist as QualificationChecklistType } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface QualificationChecklistProps {
  checklist: QualificationChecklistType;
}

function QualificationRow({ statement, matched }: { statement: string; matched: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {matched ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400 dark:text-red-400 shrink-0 mt-0.5" />
      )}
      <span className={`text-sm ${matched ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
        {statement}
      </span>
    </div>
  );
}

function QualificationChecklist({ checklist }: QualificationChecklistProps) {
  const { required, preferred, summary } = checklist;

  if (summary.required_total === 0 && summary.preferred_total === 0) return null;

  const summaryBadge = summary.required_total > 0
    ? `${summary.required_matched}/${summary.required_total} required`
    : undefined;

  const badgeColor = summary.required_total === 0
    ? undefined
    : summary.required_matched === summary.required_total
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : summary.required_matched >= Math.ceil(summary.required_total / 2)
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

  return (
    <CollapsibleSection
      title="Skills & Requirements Match"
      icon={ClipboardList}
      badge={summaryBadge}
      badgeColor={badgeColor}
      defaultExpanded
    >
      <div className="space-y-3">
        {required.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Required — {summary.required_matched} of {summary.required_total} matched
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {required.map(item => (
                <QualificationRow key={item.statement} statement={item.statement} matched={item.matched} />
              ))}
            </div>
          </div>
        )}

        {preferred.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Preferred — {summary.preferred_matched} of {summary.preferred_total} matched
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {preferred.map(item => (
                <QualificationRow key={item.statement} statement={item.statement} matched={item.matched} />
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default QualificationChecklist;
