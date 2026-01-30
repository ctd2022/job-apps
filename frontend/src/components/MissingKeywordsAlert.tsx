import { AlertTriangle, XCircle, AlertCircle, Info } from 'lucide-react';
import type { ATSAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface MissingKeywordsAlertProps {
  analysis: ATSAnalysisData;
}

function MissingKeywordsAlert({ analysis }: MissingKeywordsAlertProps) {
  const { scores_by_category, missing_keywords } = analysis;

  // Categorize missing keywords by priority
  const criticalMissing = scores_by_category.critical_keywords?.items_missing || [];
  const requiredMissing = scores_by_category.required?.items_missing || [];
  const hardSkillsMissing = scores_by_category.hard_skills?.items_missing || [];
  const preferredMissing = scores_by_category.preferred?.items_missing || [];

  // Calculate total missing count
  const totalMissing = criticalMissing.length + requiredMissing.length + hardSkillsMissing.length + preferredMissing.length;

  // Determine badge color based on severity
  const badgeColor = criticalMissing.length > 0
    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    : requiredMissing.length > 0
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';

  // If no missing keywords, show success state
  if (totalMissing === 0) {
    return (
      <CollapsibleSection
        title="Missing Keywords"
        icon={AlertTriangle}
        badge="None"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      >
        <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
          <span className="text-sm">Excellent! Your CV covers all identified keywords.</span>
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
      defaultExpanded={criticalMissing.length > 0}
    >
      <div className="space-y-4">
        {/* Critical Missing */}
        {criticalMissing.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Critical - High Priority
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalMissing.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              These keywords appear frequently in the job description and should be prioritized.
            </p>
          </div>
        )}

        {/* Required Missing */}
        {requiredMissing.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Required Skills
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredMissing.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hard Skills Missing */}
        {hardSkillsMissing.length > 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Technical Skills
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hardSkillsMissing.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Missing */}
        {preferredMissing.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Nice to Have
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferredMissing.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adding these keywords naturally to your CV may improve ATS match score.
            Focus on critical and required keywords first.
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default MissingKeywordsAlert;
