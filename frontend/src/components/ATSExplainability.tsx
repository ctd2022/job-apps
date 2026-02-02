import { useMemo } from 'react';
import { BarChart3, AlertTriangle, CheckCircle2, Brain, Target } from 'lucide-react';
import type { ATSAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface ATSExplainabilityProps {
  analysis: ATSAnalysisData;
}

const CATEGORY_LABELS: Record<string, string> = {
  critical_keywords: 'Critical Keywords',
  required: 'Required Skills',
  hard_skills: 'Technical Skills',
  soft_skills: 'Soft Skills',
  preferred: 'Nice to Have',
  certifications: 'Certifications',
  industry_terms: 'Industry Terms',
};

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  required: { label: 'Required', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  hard_skills: { label: 'Technical', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
};

function ATSExplainability({ analysis }: ATSExplainabilityProps) {
  const { hybrid_scoring, scores_by_category, section_analysis, semantic_analysis } = analysis;

  // Score breakdown
  const scoreRows = useMemo(() => {
    if (!hybrid_scoring) return [];
    return [
      { label: 'Lexical', score: hybrid_scoring.lexical_score, weight: hybrid_scoring.lexical_weight, contribution: hybrid_scoring.lexical_contribution },
      { label: 'Semantic', score: hybrid_scoring.semantic_score, weight: hybrid_scoring.semantic_weight, contribution: hybrid_scoring.semantic_contribution },
      { label: 'Evidence', score: hybrid_scoring.evidence_score, weight: hybrid_scoring.evidence_weight, contribution: hybrid_scoring.evidence_contribution },
    ];
  }, [hybrid_scoring]);

  // Top matched requirements
  const topMatches = useMemo(() => {
    if (!section_analysis) return [];
    const matches: { keyword: string; section: string }[] = [];
    for (const kw of section_analysis.experience_matches || []) {
      matches.push({ keyword: kw, section: 'Experience' });
    }
    for (const kw of section_analysis.skills_matches || []) {
      matches.push({ keyword: kw, section: 'Skills' });
    }
    for (const kw of section_analysis.projects_matches || []) {
      matches.push({ keyword: kw, section: 'Projects' });
    }
    return matches.slice(0, 12);
  }, [section_analysis]);

  // Biggest penalties — missing items from critical/required categories
  const penalties = useMemo(() => {
    const items: { keyword: string; severity: string }[] = [];
    for (const [catKey, severityKey] of [
      ['critical_keywords', 'critical'],
      ['required', 'required'],
      ['hard_skills', 'hard_skills'],
    ] as const) {
      const cat = scores_by_category[catKey];
      if (cat?.items_missing?.length) {
        for (const kw of cat.items_missing) {
          items.push({ keyword: kw, severity: severityKey });
        }
      }
    }
    return items;
  }, [scores_by_category]);

  // Category completion
  const categoryBars = useMemo(() => {
    return Object.entries(scores_by_category)
      .map(([key, cat]) => {
        const total = cat.matched + cat.missing;
        const pct = total > 0 ? Math.round((cat.matched / total) * 100) : 0;
        return { key, label: CATEGORY_LABELS[key] || key, matched: cat.matched, total, pct };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [scores_by_category]);

  return (
    <div className="space-y-3">
      {/* Score Breakdown */}
      {hybrid_scoring && (
        <CollapsibleSection title="Score Breakdown" icon={BarChart3} defaultExpanded>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-1">Component</th>
                <th className="pb-1 text-right">Score</th>
                <th className="pb-1 text-right">Weight</th>
                <th className="pb-1 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.map(row => (
                <tr key={row.label} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{row.label}</td>
                  <td className="py-1.5 text-right font-mono text-slate-800 dark:text-slate-200">{row.score.toFixed(1)}%</td>
                  <td className="py-1.5 text-right font-mono text-slate-500 dark:text-slate-400">{(row.weight * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-right font-mono text-slate-800 dark:text-slate-200">{row.contribution.toFixed(1)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="pt-1.5 text-slate-800 dark:text-slate-200">Final Score</td>
                <td colSpan={2} />
                <td className="pt-1.5 text-right font-mono text-slate-900 dark:text-slate-100">{hybrid_scoring.final_score.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </CollapsibleSection>
      )}

      {/* Category Completion */}
      {categoryBars.length > 0 && (
        <CollapsibleSection title="Category Completion" icon={Target} defaultExpanded>
          <div className="space-y-2">
            {categoryBars.map(c => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-slate-700 dark:text-slate-300">{c.label}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">{c.matched}/{c.total} ({c.pct}%)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      c.pct >= 80 ? 'bg-green-500' : c.pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Biggest Penalties */}
      {penalties.length > 0 && (
        <CollapsibleSection
          title="Biggest Penalties"
          icon={AlertTriangle}
          badge={penalties.length}
          badgeColor="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
        >
          <div className="flex flex-wrap gap-1.5">
            {penalties.map(p => {
              const cfg = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.hard_skills;
              return (
                <span
                  key={`${p.severity}-${p.keyword}`}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${cfg.className}`}
                >
                  <span className="font-medium">{cfg.label}:</span> {p.keyword}
                </span>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Top Matched Requirements */}
      {topMatches.length > 0 && (
        <CollapsibleSection title="Top Matches" icon={CheckCircle2}>
          <div className="flex flex-wrap gap-1.5">
            {topMatches.map(m => (
              <span
                key={`${m.section}-${m.keyword}`}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              >
                {m.keyword}
                <span className="text-green-500 dark:text-green-500 text-[10px]">({m.section})</span>
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Semantic Insights */}
      {semantic_analysis?.available && (
        <CollapsibleSection title="Semantic Insights" icon={Brain}>
          <div className="space-y-3 text-sm">
            {/* Entity support ratio */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Entity Support Ratio</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {(semantic_analysis.entity_support_ratio * 100).toFixed(0)}%
              </span>
            </div>

            {/* Section similarities */}
            {semantic_analysis.section_similarities && Object.keys(semantic_analysis.section_similarities).length > 0 && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Section Similarities</span>
                <div className="space-y-1">
                  {Object.entries(semantic_analysis.section_similarities).map(([section, sim]) => (
                    <div key={section} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{section}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${(sim as number) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-10 text-right">
                          {((sim as number) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {semantic_analysis.gaps?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Semantic Gaps</span>
                <div className="flex flex-wrap gap-1.5">
                  {semantic_analysis.gaps.map(gap => (
                    <span key={gap} className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

export default ATSExplainability;
