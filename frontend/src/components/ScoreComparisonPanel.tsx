import { CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { ATSComparisonData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface ScoreComparisonPanelProps {
  comparison: ATSComparisonData;
}

const CATEGORY_LABELS: Record<string, string> = {
  critical_keywords: 'Critical Keywords',
  hard_skills: 'Technical Skills',
  required: 'Required Skills',
  preferred: 'Preferred',
  soft_skills: 'Soft Skills',
  frequency_keywords: 'Frequency Keywords',
};

function formatCategory(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function ScoreComparisonPanel({ comparison }: ScoreComparisonPanelProps) {
  const badgeColor = comparison.delta > 0
    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : comparison.delta < 0
      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

  return (
    <CollapsibleSection
      title="Score Comparison"
      icon={TrendingUp}
      badge={`${comparison.delta > 0 ? '+' : ''}${comparison.delta}`}
      badgeColor={badgeColor}
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Per-category breakdown */}
        <div className="space-y-1.5">
          {comparison.categories
            .filter(c => c.oldMatched + c.oldMissing + c.newMatched + c.newMissing > 0)
            .map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-700"
              >
                <span className="text-slate-600 dark:text-slate-300 truncate flex-1 mr-2">
                  {formatCategory(cat.category)}
                </span>
                <div className="flex items-center space-x-2 text-xs font-mono flex-shrink-0">
                  <span className="text-slate-400">
                    {cat.oldMatched}/{cat.oldMatched + cat.oldMissing}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">-&gt;</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {cat.newMatched}/{cat.newMatched + cat.newMissing}
                  </span>
                  <span className={`font-bold min-w-[3ch] text-right ${
                    cat.delta > 0 ? 'text-green-600 dark:text-green-400' :
                    cat.delta < 0 ? 'text-red-600 dark:text-red-400' :
                    'text-slate-400'
                  }`}>
                    {cat.delta > 0 ? '+' : ''}{cat.delta}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* Keywords now matched */}
        {comparison.keywordsAddressed.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>Keywords Now Matched ({comparison.keywordsAddressed.length})</span>
            </h5>
            <div className="flex flex-wrap gap-1">
              {comparison.keywordsAddressed.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Keywords still missing */}
        {comparison.keywordsStillMissing.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Still Missing ({comparison.keywordsStillMissing.length})</span>
            </h5>
            <div className="flex flex-wrap gap-1">
              {comparison.keywordsStillMissing.slice(0, 15).map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded"
                >
                  {kw}
                </span>
              ))}
              {comparison.keywordsStillMissing.length > 15 && (
                <span className="text-xs text-slate-400">
                  +{comparison.keywordsStillMissing.length - 15} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default ScoreComparisonPanel;
