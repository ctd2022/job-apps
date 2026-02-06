import { useState } from 'react';
import { AlertTriangle, ArrowRight, Lightbulb, Loader2, Target, UserCheck, Wand2, Zap } from 'lucide-react';
import type { ActionableSuggestion, Backend, GapAnalysis as GapAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface GapAnalysisProps {
  gapAnalysis: GapAnalysisData;
  semanticAvailable?: boolean;
  onApply?: (keywords: string[], weakSkills: string[], backendType?: string, modelName?: string) => void;
  applying?: boolean;
  backends?: Backend[];
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

function GapAnalysis({ gapAnalysis, semanticAvailable = true, onApply, applying = false, backends }: GapAnalysisProps) {
  const { critical_gaps, evidence_gaps, semantic_gaps, experience_gaps, actionable_suggestions } = gapAnalysis;
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedBackend, setSelectedBackend] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const hasCriticalGaps =
    critical_gaps.missing_critical_keywords.length > 0 || critical_gaps.missing_required_skills.length > 0;
  const hasEvidenceGaps = evidence_gaps.weak_evidence_skills.length > 0;
  const hasSemanticGaps = semanticAvailable && semantic_gaps.missing_concepts.length > 0;
  const hasExperienceGaps = experience_gaps.gap > 0;
  const hasActionableSuggestions = actionable_suggestions && actionable_suggestions.length > 0;

  // Checkbox handlers for actionable suggestions
  function toggleSkill(skill: string) {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  function toggleAll() {
    if (!actionable_suggestions) return;
    const allSelected = actionable_suggestions.every(s => selectedSkills.has(s.skill));
    if (allSelected) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(actionable_suggestions.map(s => s.skill)));
    }
  }

  function handleApply() {
    if (!onApply) return;
    const keywords = [...selectedSkills];
    // Get weak evidence skills that are also selected
    const weakSkills = evidence_gaps.weak_evidence_skills.filter(s => selectedSkills.has(s));
    onApply(keywords, weakSkills, selectedBackend || undefined, selectedModel || undefined);
  }

  const activeBackend = backends?.find(b => b.id === selectedBackend);
  const availableModels = activeBackend?.models || [];

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

          {/* Actionable Suggestions - Idea #87 + #127 */}
          {hasActionableSuggestions && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3 w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                      Actionable Suggestions
                    </h3>
                    {onApply && (
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs text-green-600 dark:text-green-400 hover:underline"
                      >
                        {actionable_suggestions!.every(s => selectedSkills.has(s.skill)) ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    {onApply ? 'Select skills to add to your CV:' : 'Where to add missing skills for maximum impact:'}
                  </p>
                  <div className="mt-3 space-y-2">
                    {actionable_suggestions!.map((suggestion, idx) => {
                      const isSelected = selectedSkills.has(suggestion.skill);
                      return (
                        <label
                          key={`${suggestion.skill}-${idx}`}
                          className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-green-100 dark:bg-green-800/40 border-green-300 dark:border-green-700'
                              : 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                        >
                          {onApply && (
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 accent-green-600"
                              checked={isSelected}
                              onChange={() => toggleSkill(suggestion.skill)}
                            />
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityStyle(suggestion.priority)}`}>
                            {getPriorityLabel(suggestion.priority)}
                          </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {suggestion.skill}
                          </span>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Add to <strong>{suggestion.recommended_section}</strong>
                            <span className="ml-1 text-gray-400">({suggestion.section_score}% match)</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Backend picker + Apply button - Idea #127 */}
                  {onApply && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {backends && backends.length > 0 && (
                            <>
                              <select
                                value={selectedBackend}
                                onChange={(e) => { setSelectedBackend(e.target.value); setSelectedModel(''); }}
                                className="text-xs px-2 py-1 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                              >
                                <option value="">Default backend</option>
                                {backends.filter(b => b.available).map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                              {availableModels.length > 0 && (
                                <select
                                  value={selectedModel}
                                  onChange={(e) => setSelectedModel(e.target.value)}
                                  className="text-xs px-2 py-1 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                                >
                                  <option value="">Default model</option>
                                  {availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              )}
                            </>
                          )}
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {selectedSkills.size} selected
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleApply}
                          disabled={selectedSkills.size === 0 || applying}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
                  )}
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
