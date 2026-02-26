import { TrendingUp, Layers, BarChart2 } from 'lucide-react';
import type { ATSAnalysisData, PlacementSuggestion } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface KeywordPlacementSuggestionsProps {
  analysis: ATSAnalysisData;
}

const TYPE_META: Record<PlacementSuggestion['type'], { label: string; color: string }> = {
  skills_only: {
    label: 'Demonstrate in Experience',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  projects_not_experience: {
    label: 'Promote from Projects',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  weak_evidence: {
    label: 'Strengthen Evidence',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

const PRIORITY_BORDER: Record<PlacementSuggestion['priority'], string> = {
  high: 'border-l-4 border-l-red-400',
  medium: 'border-l-4 border-l-amber-400',
  low: 'border-l-4 border-l-slate-300',
};

function KeywordPlacementSuggestions({ analysis }: KeywordPlacementSuggestionsProps) {
  const suggestions = analysis.keyword_placement ?? [];

  if (suggestions.length === 0) {
    return (
      <CollapsibleSection
        title="Surface Hidden Strengths"
        icon={TrendingUp}
        badge="None"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      >
        <p className="text-sm text-green-600 dark:text-green-400">
          Your key skills are well demonstrated across your CV sections.
        </p>
      </CollapsibleSection>
    );
  }

  const highCount = suggestions.filter(s => s.priority === 'high').length;
  const badgeColor = highCount > 0
    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';

  return (
    <CollapsibleSection
      title="Surface Hidden Strengths"
      icon={TrendingUp}
      badge={suggestions.length}
      badgeColor={badgeColor}
      defaultExpanded={highCount > 0}
    >
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 pb-1">
          These skills are already in your CV but could be positioned more effectively to score higher.
        </p>

        {suggestions.map((s, idx) => {
          const meta = TYPE_META[s.type];
          const Icon = s.type === 'weak_evidence' ? BarChart2 : s.type === 'projects_not_experience' ? Layers : TrendingUp;
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 ${PRIORITY_BORDER[s.priority]}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 capitalize">{s.skill}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                  {meta.label}
                </span>
                {s.priority === 'high' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 font-medium">
                    High priority
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed ml-5">
                {s.message}
              </p>
            </div>
          );
        })}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These are strengths you already have — restructuring or expanding them costs nothing and improves both ATS and human review.
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default KeywordPlacementSuggestions;
