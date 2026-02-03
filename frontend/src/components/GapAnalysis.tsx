import { AlertTriangle, Lightbulb, UserCheck, Zap } from 'lucide-react';
import type { GapAnalysis as GapAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface GapAnalysisProps {
  gapAnalysis: GapAnalysisData;
}

function GapAnalysis({ gapAnalysis }: GapAnalysisProps) {
  const { critical_gaps, evidence_gaps, semantic_gaps, experience_gaps } = gapAnalysis;

  const hasCriticalGaps =
    critical_gaps.missing_critical_keywords.length > 0 || critical_gaps.missing_required_skills.length > 0;
  const hasEvidenceGaps = evidence_gaps.weak_evidence_skills.length > 0;
  const hasSemanticGaps = semantic_gaps.missing_concepts.length > 0;
  const hasExperienceGaps = experience_gaps.gap > 0;

  return (
    <div className="space-y-3">
      <CollapsibleSection
        title="Gap Analysis"
        icon={AlertTriangle}
        defaultExpanded
        badge={
          (hasCriticalGaps ? 1 : 0) +
          (hasEvidenceGaps ? 1 : 0) +
          (hasSemanticGaps ? 1 : 0) +
          (hasExperienceGaps ? 1 : 0)
        }
        badgeColor="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      >
        <div className="space-y-4 p-1">
          {/* Critical Gaps */}
          {hasCriticalGaps && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Zap className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Critical Gaps</h3>
                  <div className="mt-2 text-xs text-red-700 dark:text-red-400 space-y-1">
                    {critical_gaps.missing_critical_keywords.length > 0 && (
                      <div>
                        <p className="font-semibold">Missing Critical Keywords:</p>
                        <ul className="list-disc list-inside">
                          {critical_gaps.missing_critical_keywords.map(kw => (
                            <li key={kw}>{kw}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {critical_gaps.missing_required_skills.length > 0 && (
                      <div>
                        <p className="font-semibold">Missing Required Skills:</p>
                        <ul className="list-disc list-inside">
                          {critical_gaps.missing_required_skills.map(kw => (
                            <li key={kw}>{kw}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Gaps */}
          {hasEvidenceGaps && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Evidence Gaps</h3>
                  <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                    <p>The following skills are mentioned in your CV but may lack strong evidence (e.g., metrics, specific examples):</p>
                    <ul className="list-disc list-inside">
                      {evidence_gaps.weak_evidence_skills.map(skill => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Semantic Gaps */}
          {hasSemanticGaps && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Semantic Gaps</h3>
                   <div className="mt-2 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <p>Your CV may be missing these concepts or related ideas from the job description:</p>
                    <ul className="list-disc list-inside">
                      {semantic_gaps.missing_concepts.map(concept => (
                        <li key={concept}>{concept}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Experience Gaps */}
          {hasExperienceGaps && (
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-purple-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">Experience Gap</h3>
                  <div className="mt-2 text-xs text-purple-700 dark:text-purple-400">
                    <p>
                      The job requires <strong>{experience_gaps.jd_years}</strong> years of experience, and your CV shows <strong>{experience_gaps.cv_years}</strong> years. 
                      This is a gap of <strong>{experience_gaps.gap}</strong> years.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default GapAnalysis;
