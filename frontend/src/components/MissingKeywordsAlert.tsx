import { AlertTriangle } from 'lucide-react';
import type { ATSAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface MissingKeywordsAlertProps {
  analysis: ATSAnalysisData;
  defaultCollapsed?: boolean;
}

const PRIORITY_BADGE: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200',
  LOW:    'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
};

function PriorityBadge({ keyword, priorities }: { keyword: string; priorities: Record<string, string> }) {
  const p = (priorities[keyword.toLowerCase()] ?? 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW';
  return (
    <span className={`px-1 py-0.5 text-[10px] font-semibold rounded ${PRIORITY_BADGE[p]}`}>
      {p[0]}
    </span>
  );
}

function MissingKeywordsAlert({ analysis, defaultCollapsed }: MissingKeywordsAlertProps) {
  const { criterion_breakdown, keyword_priorities = {} } = analysis;

  // Gather all missing keywords from criterion_breakdown (10-category system)
  const allMissing: { keyword: string; category: string }[] = [];
  for (const entry of criterion_breakdown ?? []) {
    for (const kw of entry.missing_keywords) {
      allMissing.push({ keyword: kw.keyword, category: entry.display_name });
    }
  }

  // Sort by priority: HIGH first, then MEDIUM, then LOW
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  allMissing.sort((a, b) => {
    const pa = order[keyword_priorities[a.keyword.toLowerCase()] ?? 'LOW'] ?? 2;
    const pb = order[keyword_priorities[b.keyword.toLowerCase()] ?? 'LOW'] ?? 2;
    return pa - pb;
  });

  const totalMissing = allMissing.length;
  const hasHigh = allMissing.some(k => (keyword_priorities[k.keyword.toLowerCase()] ?? 'LOW') === 'HIGH');

  const badgeColor = hasHigh
    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    : totalMissing > 0
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';

  if (totalMissing === 0) {
    return (
      <CollapsibleSection
        title="Missing Keywords"
        icon={AlertTriangle}
        badge="None"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      >
        <div className="text-sm text-green-600 dark:text-green-400">
          Excellent! Your CV covers all identified keywords.
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Missing Keywords"
      icon={AlertTriangle}
      badge={totalMissing}
      badgeColor={badgeColor}
      defaultExpanded={!defaultCollapsed && hasHigh}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {allMissing.map(({ keyword, category }, idx) => (
            <span
              key={idx}
              title={category}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded"
            >
              <PriorityBadge keyword={keyword} priorities={keyword_priorities} />
              {keyword}
            </span>
          ))}
        </div>
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            H = high priority, M = medium, L = low. Hover a keyword to see its category.
            Focus on high-priority gaps first.
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default MissingKeywordsAlert;
