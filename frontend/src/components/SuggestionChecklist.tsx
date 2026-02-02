import { useState, useMemo } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import type { ATSAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface SuggestionChecklistProps {
  analysis: ATSAnalysisData;
  onApply: (keywords: string[], weakSkills: string[]) => void;
  applying: boolean;
}

interface CategoryGroup {
  key: string;
  label: string;
  items: string[];
  colorClass: string;
  checkboxColor: string;
}

function SuggestionChecklist({ analysis, onApply, applying }: SuggestionChecklistProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [selectedWeakSkills, setSelectedWeakSkills] = useState<Set<string>>(new Set());

  const categories = useMemo<CategoryGroup[]>(() => {
    const cats = analysis.scores_by_category;
    const groups: CategoryGroup[] = [];

    if (cats.critical_keywords?.items_missing?.length) {
      groups.push({
        key: 'critical',
        label: 'Critical',
        items: cats.critical_keywords.items_missing,
        colorClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        checkboxColor: 'accent-red-600',
      });
    }
    if (cats.required?.items_missing?.length) {
      groups.push({
        key: 'required',
        label: 'Required',
        items: cats.required.items_missing,
        colorClass: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        checkboxColor: 'accent-orange-600',
      });
    }
    if (cats.hard_skills?.items_missing?.length) {
      groups.push({
        key: 'hard_skills',
        label: 'Technical Skills',
        items: cats.hard_skills.items_missing,
        colorClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        checkboxColor: 'accent-yellow-600',
      });
    }
    if (cats.preferred?.items_missing?.length) {
      groups.push({
        key: 'preferred',
        label: 'Nice to Have',
        items: cats.preferred.items_missing,
        colorClass: 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600',
        checkboxColor: 'accent-slate-600',
      });
    }
    return groups;
  }, [analysis]);

  const weakSkills = analysis.evidence_analysis?.weak_skills || [];

  const totalSelected = selectedKeywords.size + selectedWeakSkills.size;
  const totalAvailable = categories.reduce((n, c) => n + c.items.length, 0) + weakSkills.length;

  if (totalAvailable === 0) return null;

  function toggleKeyword(kw: string) {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }

  function toggleWeakSkill(s: string) {
    setSelectedWeakSkills(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleAllInCategory(items: string[]) {
    const allSelected = items.every(i => selectedKeywords.has(i));
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      for (const item of items) {
        if (allSelected) next.delete(item);
        else next.add(item);
      }
      return next;
    });
  }

  function handleApply() {
    onApply([...selectedKeywords], [...selectedWeakSkills]);
  }

  return (
    <CollapsibleSection
      title="Improve CV"
      icon={Wand2}
      badge={totalAvailable}
      badgeColor="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
      defaultExpanded
    >
      <div className="space-y-3">
        {/* Keyword categories */}
        {categories.map(cat => {
          const allSelected = cat.items.every(i => selectedKeywords.has(i));
          return (
            <div key={cat.key} className={`p-2 border rounded-lg ${cat.colorClass}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {cat.label}
                </span>
                <button
                  type="button"
                  onClick={() => toggleAllInCategory(cat.items)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map(kw => {
                  const checked = selectedKeywords.has(kw);
                  return (
                    <label
                      key={kw}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded cursor-pointer select-none transition-colors ${
                        checked
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100 ring-1 ring-purple-300 dark:ring-purple-600'
                          : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className={`w-3 h-3 ${cat.checkboxColor}`}
                        checked={checked}
                        onChange={() => toggleKeyword(kw)}
                      />
                      {kw}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Weak skills */}
        {weakSkills.length > 0 && (
          <div className="p-2 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 block mb-1.5">
              Strengthen Evidence
            </span>
            <div className="flex flex-wrap gap-1.5">
              {weakSkills.map(s => {
                const checked = selectedWeakSkills.has(s);
                return (
                  <label
                    key={s}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 ring-1 ring-blue-300 dark:ring-blue-600'
                        : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-3 h-3 accent-blue-600"
                      checked={checked}
                      onChange={() => toggleWeakSkill(s)}
                    />
                    {s}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Apply button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {totalSelected} selected
          </span>
          <button
            type="button"
            onClick={handleApply}
            disabled={totalSelected === 0 || applying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Apply Selected
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default SuggestionChecklist;
