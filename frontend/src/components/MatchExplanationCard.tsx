import { BarChart3, CheckCircle, Zap, Brain, FileCheck } from 'lucide-react';
import type { ATSAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface MatchExplanationCardProps {
  analysis: ATSAnalysisData;
}

function MatchExplanationCard({ analysis }: MatchExplanationCardProps) {
  const { hybrid_scoring, semantic_analysis, matched_keywords } = analysis;

  // Calculate bar widths for visualization
  const lexicalWidth = hybrid_scoring.lexical_contribution;
  const semanticWidth = hybrid_scoring.semantic_contribution;
  const evidenceWidth = hybrid_scoring.evidence_contribution;
  const maxWidth = Math.max(lexicalWidth + semanticWidth + evidenceWidth, 100);

  return (
    <CollapsibleSection
      title="Match Explanation"
      icon={BarChart3}
      badge={`${hybrid_scoring.final_score}%`}
      badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    >
      <div className="space-y-6">
        {/* Score Breakdown Bar */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Score Composition
          </h4>
          <div className="relative h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex">
              {/* Lexical */}
              <div
                className="h-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium transition-all"
                style={{ width: `${(lexicalWidth / maxWidth) * 100}%` }}
                title={`Lexical: ${hybrid_scoring.lexical_score}% x ${hybrid_scoring.lexical_weight * 100}%`}
              >
                {lexicalWidth >= 10 && `${lexicalWidth.toFixed(0)}`}
              </div>
              {/* Semantic */}
              {hybrid_scoring.semantic_available && (
                <div
                  className="h-full bg-purple-500 flex items-center justify-center text-xs text-white font-medium transition-all"
                  style={{ width: `${(semanticWidth / maxWidth) * 100}%` }}
                  title={`Semantic: ${hybrid_scoring.semantic_score}% x ${hybrid_scoring.semantic_weight * 100}%`}
                >
                  {semanticWidth >= 10 && `${semanticWidth.toFixed(0)}`}
                </div>
              )}
              {/* Evidence */}
              <div
                className="h-full bg-green-500 flex items-center justify-center text-xs text-white font-medium transition-all"
                style={{ width: `${(evidenceWidth / maxWidth) * 100}%` }}
                title={`Evidence: ${hybrid_scoring.evidence_score}% x ${hybrid_scoring.evidence_weight * 100}%`}
              >
                {evidenceWidth >= 5 && `${evidenceWidth.toFixed(0)}`}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-slate-600 dark:text-slate-400">
                Lexical ({(hybrid_scoring.lexical_weight * 100).toFixed(0)}%): {hybrid_scoring.lexical_score.toFixed(1)}%
              </span>
            </div>
            {hybrid_scoring.semantic_available && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span className="text-slate-600 dark:text-slate-400">
                  Semantic ({(hybrid_scoring.semantic_weight * 100).toFixed(0)}%): {hybrid_scoring.semantic_score.toFixed(1)}%
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-slate-600 dark:text-slate-400">
                Evidence ({(hybrid_scoring.evidence_weight * 100).toFixed(0)}%): {hybrid_scoring.evidence_score.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Top Keyword Matches */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Top Matched Keywords</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {matched_keywords.slice(0, 12).map((keyword, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Semantic Matches (if available) */}
        {semantic_analysis.available && semantic_analysis.top_matches.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span>Semantic Section Matches</span>
            </h4>
            <div className="space-y-2">
              {semantic_analysis.top_matches.slice(0, 4).map((match, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-700 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-600 dark:text-slate-300">{match.jd_section}</span>
                    <Zap className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{match.cv_section}</span>
                    {match.is_high_value && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded">
                        HIGH VALUE
                      </span>
                    )}
                  </div>
                  <span className={`font-medium ${
                    match.similarity >= 80 ? 'text-green-600 dark:text-green-400' :
                    match.similarity >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-slate-500 dark:text-slate-400'
                  }`}>
                    {match.similarity.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Suggestions */}
        {(semantic_analysis.gaps?.length > 0 || analysis.missing_keywords.length > 0) && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-amber-500" />
              <span>Suggestions to Improve</span>
            </h4>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {semantic_analysis.gaps?.slice(0, 2).map((gap, idx) => (
                <li key={`gap-${idx}`} className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">-</span>
                  <span>{gap}</span>
                </li>
              ))}
              {analysis.missing_keywords.length > 0 && (
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">-</span>
                  <span>Consider adding: {analysis.missing_keywords.slice(0, 3).join(', ')}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default MatchExplanationCard;
