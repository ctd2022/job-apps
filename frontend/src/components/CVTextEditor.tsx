import { useEffect, useState } from 'react';
import { Loader2, Save, X, CheckCircle, AlertCircle, RefreshCw, Wand2, Sparkles } from 'lucide-react';
import { getCVVersionById, updateCVContent, rematchATS, getATSAnalysis, applySuggestions, getBackends, suggestSkills } from '../api';
import type { CVVersion, RematchResponse, ATSAnalysisData, ATSComparisonData, CategoryComparison, Backend } from '../types';
import SuggestionChecklist from './SuggestionChecklist';
import CVCompletenessMeter from './CVCompletenessMeter';
import ScoreComparisonPanel from './ScoreComparisonPanel';
import ATSExplainability from './ATSExplainability';
import FormattingTipsPanel from './FormattingTipsPanel';
import CollapsibleSection from './CollapsibleSection';

interface CVTextEditorProps {
  cvVersionId: number;
  onClose: () => void;
  onSaved: () => void;
  jobId?: string;
}

function computeComparison(
  oldAnalysis: ATSAnalysisData,
  newAnalysis: ATSAnalysisData,
  oldScore: number | null,
  newScore: number,
  delta: number,
): ATSComparisonData {
  const allCategories = new Set([
    ...Object.keys(oldAnalysis.scores_by_category),
    ...Object.keys(newAnalysis.scores_by_category),
  ]);

  const categories: CategoryComparison[] = [];
  const allAddressed: string[] = [];
  const allStillMissing: string[] = [];

  for (const cat of allCategories) {
    const oldCat = oldAnalysis.scores_by_category[cat];
    const newCat = newAnalysis.scores_by_category[cat];
    if (!oldCat || !newCat) continue;

    const newMatchedSet = new Set(newCat.items_matched);
    const newMissingSet = new Set(newCat.items_missing);

    const nowMatched = oldCat.items_missing.filter(k => newMatchedSet.has(k));
    const stillMissing = newCat.items_missing;
    const newlyMissing = oldCat.items_matched.filter(k => newMissingSet.has(k));

    categories.push({
      category: cat,
      oldMatched: oldCat.matched,
      oldMissing: oldCat.missing,
      newMatched: newCat.matched,
      newMissing: newCat.missing,
      delta: newCat.matched - oldCat.matched,
      keywordsNowMatched: nowMatched,
      keywordsStillMissing: stillMissing,
      keywordsNewlyMissing: newlyMissing,
    });

    allAddressed.push(...nowMatched);
    allStillMissing.push(...stillMissing);
  }

  return {
    oldScore,
    newScore,
    delta,
    categories,
    keywordsAddressed: [...new Set(allAddressed)],
    keywordsStillMissing: [...new Set(allStillMissing)],
  };
}

function CVTextEditor({ cvVersionId, onClose, onSaved, jobId }: CVTextEditorProps) {
  const [version, setVersion] = useState<CVVersion | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedVersionNumber, setSavedVersionNumber] = useState<number | null>(null);
  const [savedNewVersionId, setSavedNewVersionId] = useState<number | null>(null);

  // Re-match state
  const [rematching, setRematching] = useState(false);
  const [rematchResult, setRematchResult] = useState<RematchResponse | null>(null);
  const [rematchError, setRematchError] = useState<string | null>(null);

  // ATS Feedback state (#120)
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysisData | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Comparison state (#102)
  const [comparison, setComparison] = useState<ATSComparisonData | null>(null);

  // Apply suggestions state (#122)
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Backend picker state (#123)
  const [backends, setBackends] = useState<Backend[]>([]);

  // AI Skill Suggester state (#128)
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const isDirty = content !== originalContent;

  useEffect(() => {
    loadVersion();
  }, [cvVersionId]);

  useEffect(() => {
    if (jobId) {
      loadATSAnalysis();
      getBackends().then(data => {
        const list = (data as any)?.backends || data || [];
        setBackends(list);
      }).catch(() => {});
    }
  }, [jobId]);

  async function loadVersion() {
    try {
      setLoading(true);
      setError(null);
      const v = await getCVVersionById(cvVersionId);
      setVersion(v);
      setContent(v.content || '');
      setOriginalContent(v.content || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load CV version');
    } finally {
      setLoading(false);
    }
  }

  async function loadATSAnalysis() {
    if (!jobId) return;
    try {
      setLoadingAnalysis(true);
      const result = await getATSAnalysis(jobId);
      if (result.analysis) {
        setAtsAnalysis(result.analysis);
      }
    } catch {
      // Non-critical: right pane just stays empty
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function handleSave() {
    if (!version || !isDirty || saving) return;
    try {
      setSaving(true);
      setError(null);
      setRematchResult(null);
      setRematchError(null);
      setComparison(null);
      const updated = await updateCVContent(version.cv_id, {
        content,
        change_summary: changeSummary || undefined,
      });
      setSavedVersionNumber(updated.version_number ?? null);
      setSavedNewVersionId(updated.current_version_id ?? null);
      setOriginalContent(content);
    } catch (err: any) {
      setError(err?.message || 'Failed to save CV');
    } finally {
      setSaving(false);
    }
  }

  async function handleRematch() {
    if (!jobId || !savedNewVersionId || rematching) return;
    try {
      setRematching(true);
      setRematchError(null);
      setComparison(null);

      // Snapshot current analysis for comparison
      const snapshotAnalysis = atsAnalysis;

      const result = await rematchATS(jobId, savedNewVersionId);
      setRematchResult(result);

      // Update right pane with new analysis
      const newAnalysis = result.ats_details;
      setAtsAnalysis(newAnalysis);

      // Compute comparison if we had previous data
      if (snapshotAnalysis) {
        const comp = computeComparison(
          snapshotAnalysis,
          newAnalysis,
          result.old_score,
          result.new_score,
          result.delta,
        );
        setComparison(comp);
      }

      onSaved();
    } catch (err: any) {
      setRematchError(err?.message || 'Failed to re-match');
    } finally {
      setRematching(false);
    }
  }

  async function handleApplySuggestions(keywords: string[], weakSkills: string[], backendType?: string, modelName?: string) {
    if (!jobId || applying) return;
    const versionId = savedNewVersionId || cvVersionId;
    try {
      setApplying(true);
      setApplyError(null);
      const result = await applySuggestions(jobId, versionId, keywords, weakSkills, backendType, modelName);
      setContent(result.revised_cv);
      if (result.changelog) {
        setChangeSummary(`LLM (${result.model_name}):\n${result.changelog}`);
      } else {
        const kwCount = result.applied_count;
        const weakCount = weakSkills.length;
        const parts: string[] = [];
        if (kwCount > 0) parts.push(`${kwCount} keyword${kwCount > 1 ? 's' : ''}`);
        if (weakCount > 0) parts.push(`${weakCount} weak skill${weakCount > 1 ? 's' : ''} strengthened`);
        setChangeSummary(`LLM (${result.model_name}): ${parts.join(', ')}`);
      }
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to apply suggestions');
    } finally {
      setApplying(false);
    }
  }

  async function handleSuggestSkills() {
    if (!jobId || loadingSuggestions) return;
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const skills = await suggestSkills(jobId);
      setSuggestedSkills(skills);
    } catch (err: any) {
      setSuggestionError(err?.message || 'Failed to get suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handleDismissSuggestion(skill: string) {
    setSuggestedSkills(prev => prev.filter(s => s !== skill));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${
        jobId ? 'max-w-7xl' : 'max-w-4xl'
      } max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Edit CV
            </h3>
            {version && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Editing version {version.version_number} — changes save as a new version
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - split pane */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Pane: Editor */}
          <div className="flex-1 min-w-0 overflow-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : error && !version ? (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            ) : (
              <>
                {/* Success banner */}
                {savedVersionNumber !== null && (
                  <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-3 py-2 rounded text-sm text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved as version {savedVersionNumber}</span>
                  </div>
                )}

                {/* Re-match prompt */}
                {savedVersionNumber !== null && jobId && !rematchResult && !rematching && (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Re-run ATS analysis with your updated CV?
                    </span>
                    <button
                      onClick={handleRematch}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Re-match</span>
                    </button>
                  </div>
                )}

                {/* Re-match in progress */}
                {rematching && (
                  <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded text-sm text-blue-700 dark:text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running ATS analysis... This may take 15-60 seconds.</span>
                  </div>
                )}

                {/* Re-match result (compact - details in right pane) */}
                {rematchResult && (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-3 py-2 rounded text-sm">
                    <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      <span>ATS Re-Match Complete</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        {rematchResult.old_score != null ? `${rematchResult.old_score}%` : 'N/A'}
                      </span>
                      <span className="text-slate-400">-&gt;</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {rematchResult.new_score}%
                      </span>
                      <span className={`font-bold ${
                        rematchResult.delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : rematchResult.delta < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500'
                      }`}>
                        ({rematchResult.delta > 0 ? '+' : ''}{rematchResult.delta})
                      </span>
                    </div>
                  </div>
                )}

                {/* Re-match error */}
                {rematchError && (
                  <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 rounded text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>{rematchError}</span>
                  </div>
                )}

                {/* Apply suggestions in progress */}
                {applying && (
                  <div className="flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 px-3 py-2 rounded text-sm text-purple-700 dark:text-purple-300">
                    <Wand2 className="w-4 h-4" />
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Incorporating keywords... This may take 15-60 seconds.</span>
                  </div>
                )}

                {/* Apply suggestions error */}
                {applyError && (
                  <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 rounded text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>{applyError}</span>
                  </div>
                )}

                {/* Save error */}
                {error && (
                  <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 rounded text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[300px] h-96 font-mono text-sm p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  spellCheck={false}
                />

                <FormattingTipsPanel content={content} />

                {/* Change summary */}
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Change summary (optional)
                  </label>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="e.g. Added missing Python keyword, rewrote summary"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          {jobId && (
            <div className="w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          )}

          {/* Right Pane: ATS Feedback */}
          {jobId && (
            <div className="w-[400px] flex-shrink-0 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                ATS Feedback
              </h4>

              {/* Score comparison after re-match */}
              {comparison && (
                <ScoreComparisonPanel comparison={comparison} />
              )}

              {/* Loading analysis */}
              {loadingAnalysis && (
                <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading ATS analysis...</span>
                </div>
              )}

              {/* ATS Analysis components */}
              {atsAnalysis && !loadingAnalysis && (
                <>
                  <SuggestionChecklist
                    analysis={atsAnalysis}
                    onApply={handleApplySuggestions}
                    applying={applying}
                    backends={backends}
                  />
                  <CollapsibleSection title="AI Skill Suggester" icon={Sparkles}>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                        Get AI-powered suggestions for skills you might have missed, based on the job description.
                      </p>
                      <button
                        onClick={handleSuggestSkills}
                        disabled={loadingSuggestions}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {loadingSuggestions && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{loadingSuggestions ? 'Analyzing...' : 'Suggest Skills'}</span>
                      </button>
                      {suggestionError && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                          {suggestionError}
                        </div>
                      )}
                      {suggestedSkills.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Suggested Skills ({suggestedSkills.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {suggestedSkills.map((skill) => (
                              <div
                                key={skill}
                                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm"
                              >
                                <span>{skill}</span>
                                <button
                                  onClick={() => handleDismissSuggestion(skill)}
                                  className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                                  title="Dismiss"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                  <ATSExplainability
                    analysis={atsAnalysis}
                    onApply={handleApplySuggestions}
                    applying={applying}
                    backends={backends}
                  />
                  <CVCompletenessMeter analysis={atsAnalysis} />
                </>
              )}

              {!atsAnalysis && !loadingAnalysis && (
                <div className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                  No ATS analysis available for this job.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save New Version</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CVTextEditor;
