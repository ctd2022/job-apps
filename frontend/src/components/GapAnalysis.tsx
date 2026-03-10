import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Lightbulb, Target, UserCheck, Zap } from 'lucide-react';
import type { ActionableSuggestion, EvidenceGapDetail, GapAnalysis as GapAnalysisData } from '../types';
import { createSkill } from '../api';
import CollapsibleSection from './CollapsibleSection';

interface GapAnalysisProps {
  gapAnalysis: GapAnalysisData;
  semanticAvailable?: boolean;
  evidenceGapDetails?: EvidenceGapDetail[];
  onOpenExperiencePanel?: (skill: string) => void;
}

// Priority badge styling
function getPriorityStyle(priority: ActionableSuggestion['priority']) {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'required':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'hard_skills':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'preferred':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
}

function getPriorityLabel(priority: ActionableSuggestion['priority']) {
  switch (priority) {
    case 'critical':
      return 'Critical';
    case 'required':
      return 'Required';
    case 'hard_skills':
      return 'Hard Skill';
    case 'preferred':
      return 'Preferred';
    default:
      return priority;
  }
}

function getSectionBadgeStyle(section: string): string {
  switch (section) {
    case 'experience': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'skills':     return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'projects':   return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    default:           return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function GapAnalysis({ gapAnalysis, semanticAvailable = true, evidenceGapDetails, onOpenExperiencePanel }: GapAnalysisProps) {
  const { critical_gaps, evidence_gaps, semantic_gaps, experience_gaps, actionable_suggestions } = gapAnalysis;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setChecked(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const [addingSkills, setAddingSkills] = useState<Set<string>>(new Set());
  const [expandedExperienceKey, setExpandedExperienceKey] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Merged, deduplicated list of missing critical + required skills
  const allCriticalMissing = [
    ...critical_gaps.missing_critical_keywords,
    ...critical_gaps.missing_required_skills.filter(
      s => !critical_gaps.missing_critical_keywords.map(k => k.toLowerCase()).includes(s.toLowerCase())
    ),
  ];

  const hasCriticalGaps = allCriticalMissing.length > 0;
  const hasEvidenceGaps = evidence_gaps.weak_evidence_skills.length > 0;
  const hasSemanticGaps = semanticAvailable && semantic_gaps.missing_concepts.length > 0;
  const hasExperienceGaps = experience_gaps.gap > 0;
  const hasExperienceMatch = experience_gaps.experience_match === true;
  const hasActionableSuggestions = actionable_suggestions && actionable_suggestions.length > 0;

  async function handleCheck(suggestion: ActionableSuggestion, key: string, done: boolean) {
    if (done) { toggle(key); return; }
    const section = suggestion.recommended_section.toLowerCase();
    if (section.includes('skill')) {
      if (addingSkills.has(suggestion.skill)) return;
      setAddingSkills(prev => { const next = new Set(prev); next.add(suggestion.skill); return next; });
      try {
        await createSkill({ name: suggestion.skill, category: null, display_order: 0 });
        toggle(key);
        setToastError(false);
        setToast(`Added "${suggestion.skill}" to Profile Skills`);
      } catch {
        setToastError(true);
        setToast(`Failed to add "${suggestion.skill}" — please try again`);
      } finally {
        setAddingSkills(prev => { const next = new Set(prev); next.delete(suggestion.skill); return next; });
      }
    } else if (section.includes('experience')) {
      // Two-step inline routing prompt (Tier 2.5 panel flow)
      setExpandedExperienceKey(prev => prev === key ? null : key);
    } else {
      toggle(key);
    }
  }

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
          // hasExperienceMatch is a positive signal — not counted as a gap
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
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Critical &amp; Required Gaps</h3>
                  <ul className="mt-2 text-xs text-red-700 dark:text-red-400 list-disc list-inside space-y-0.5">
                    {allCriticalMissing.map(kw => (
                      <li key={kw}>{kw}</li>
                    ))}
                  </ul>
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
                <div className="ml-3 w-full">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Evidence Gaps</h3>
                  {evidenceGapDetails && evidenceGapDetails.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {evidenceGapDetails.map(detail => (
                        <div
                          key={detail.skill}
                          className="rounded px-2 py-1.5 bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-800 text-xs"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{detail.skill}</span>
                            {detail.found_in.length === 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                not found
                              </span>
                            ) : (
                              detail.found_in.map(section => (
                                <span
                                  key={section}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getSectionBadgeStyle(section)}`}
                                >
                                  {section}
                                </span>
                              ))
                            )}
                          </div>
                          <p className="mt-1 text-yellow-700 dark:text-yellow-400">{detail.advice}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                      <p>The following skills are mentioned in your CV but may lack strong evidence (e.g., metrics, specific examples):</p>
                      <ul className="list-disc list-inside">
                        {evidence_gaps.weak_evidence_skills.map(skill => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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

          {/* Experience — positive match */}
          {hasExperienceMatch && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Experience Match</h3>
                  <div className="mt-1 text-xs text-green-700 dark:text-green-400">
                    <p>
                      Your <strong>{experience_gaps.cv_years} years</strong> of experience meets the{' '}
                      <strong>{experience_gaps.jd_years}-year</strong> requirement.
                      {experience_gaps.cv_years_source === 'profile' && (
                        <span className="ml-1 opacity-70">(calculated from your Profile)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Experience Gap */}
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
                      The job requires <strong>{experience_gaps.jd_years}</strong> years of experience
                      {experience_gaps.cv_years
                        ? <>, and your profile shows <strong>{experience_gaps.cv_years}</strong> years</>
                        : null
                      }.
                      {' '}This is a gap of <strong>{experience_gaps.gap}</strong> years.
                      {experience_gaps.cv_years_source === 'profile' && (
                        <span className="ml-1 opacity-70">(calculated from your Profile)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actionable Suggestions - Idea #87 */}
          {hasActionableSuggestions && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3 w-full">
                  {toast && (
                    <div className={`mb-2 px-3 py-2 rounded text-xs font-medium ${
                      toastError
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {toast}
                    </div>
                  )}
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Actionable Suggestions</h3>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">Where to add missing skills for maximum impact:</p>
                  <div className="mt-3 space-y-2">
                    {actionable_suggestions!.map((suggestion, idx) => {
                      const key = `${suggestion.skill}-${idx}`;
                      const done = checked.has(key);
                      const section = suggestion.recommended_section.toLowerCase();
                      const isExperience = section.includes('experience');
                      const isExpanded = expandedExperienceKey === key;

                      return (
                        <div key={key}>
                          <label
                            className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 border cursor-pointer select-none transition-opacity ${
                              done
                                ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50'
                                : isExpanded
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                                  : 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => handleCheck(suggestion, key, done)}
                              disabled={addingSkills.has(suggestion.skill)}
                              className="w-3.5 h-3.5 accent-green-600 flex-shrink-0"
                            />
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityStyle(suggestion.priority)}`}>
                              {getPriorityLabel(suggestion.priority)}
                            </span>
                            <span className={`font-medium text-gray-800 dark:text-gray-200 ${done ? 'line-through' : ''}`}>
                              {suggestion.skill}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">→</span>
                            <span className={`text-gray-600 dark:text-gray-400 ${done ? 'line-through' : ''}`}>
                              {suggestion.recommended_section}
                            </span>
                          </label>

                          {/* Inline routing prompt — experience suggestions only (Tier 2.5) */}
                          {isExperience && isExpanded && !done && (
                            <div className="mx-1 mb-1 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-t-0 border-amber-300 dark:border-amber-700 rounded-b text-xs">
                              <p className="text-amber-700 dark:text-amber-400 mb-2">
                                Add a bullet to a relevant work experience entry to evidence{' '}
                                <strong>{suggestion.skill}</strong>.
                                After saving, use <em>Pull from Profile</em> in the CV editor to apply it.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.preventDefault();
                                    setExpandedExperienceKey(null);
                                    // Do NOT mark done here — work hasn't been done yet.
                                    // User manually ticks the suggestion after updating the CV.
                                    if (onOpenExperiencePanel) {
                                      onOpenExperiencePanel(suggestion.skill);
                                    } else {
                                      navigate(`/profile?skill=${encodeURIComponent(suggestion.skill)}&hint=experience`);
                                    }
                                  }}
                                  className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                                >
                                  Open Work Experience
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.preventDefault();
                                    setExpandedExperienceKey(null);
                                  }}
                                  className="px-3 py-1 text-amber-700 dark:text-amber-400 text-xs hover:text-amber-900 dark:hover:text-amber-200"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
