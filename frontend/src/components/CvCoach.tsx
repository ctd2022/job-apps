import { useState, useEffect, useCallback, useRef } from 'react';
import { GraduationCap, RefreshCw, Save, CheckCircle, AlertCircle, ChevronRight, History, RotateCcw, Download } from 'lucide-react';
import type { StoredCV, CVVersion, CVCoachAssessment, CoachingSuggestion } from '../types';
import { getCVs, getCV, getCVVersions, getCVVersionById, updateCVContent, assessCVCoach, assembleCV } from '../api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatVersionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function firstLine(s: string | undefined): string {
  return (s ?? '').split('\n')[0].trim();
}

// ── Animated score hook ──────────────────────────────────────────────────────

function useAnimatedScore(target: number | null): number {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (target === null) return;
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return display;
}

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({
  score,
  issueCount,
  assessing,
}: {
  score: number;
  issueCount: number;
  assessing: boolean;
}) {
  const color =
    score >= 80 ? 'text-green-500 dark:text-green-400' :
    score >= 60 ? 'text-amber-500 dark:text-amber-400' :
                  'text-red-500 dark:text-red-400';
  const barColor =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-amber-500' :
                  'bg-red-500';
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Needs Work';

  return (
    <div className="flex items-center gap-6 px-5 py-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className={`flex items-end gap-1.5 min-w-[88px] ${assessing ? 'opacity-40' : ''} transition-opacity duration-300`}>
        <span className={`text-5xl font-bold tabular-nums leading-none ${color}`}>{score}</span>
        <span className="text-slate-400 text-base mb-0.5">/100</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${color}`}>{label}</span>
          <span className="text-xs text-slate-400">
            {assessing
              ? 'Checking…'
              : issueCount === 0
                ? 'No issues found'
                : `${issueCount} issue${issueCount !== 1 ? 's' : ''} to fix`}
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Suggestion card ──────────────────────────────────────────────────────────

const P_STYLES: Record<CoachingSuggestion['priority'], {
  border: string; bg: string; badge: string; icon: string;
}> = {
  high: {
    border: 'border-l-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
    icon: 'text-red-400',
  },
  medium: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    icon: 'text-amber-400',
  },
  low: {
    border: 'border-l-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    icon: 'text-blue-400',
  },
};

function SuggestionCard({
  suggestion,
  onJump,
}: {
  suggestion: CoachingSuggestion;
  onJump: (hint: string) => void;
}) {
  const s = P_STYLES[suggestion.priority];
  return (
    <div className={`border-l-4 ${s.border} ${s.bg} rounded-r-xl p-4`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertCircle className={`w-4 h-4 flex-shrink-0 ${s.icon}`} />
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${s.badge}`}>
            {suggestion.priority}
          </span>
          <span className="text-xs text-slate-400 capitalize">{suggestion.category}</span>
        </div>
        {suggestion.section_hint !== 'general' && (
          <button
            onClick={() => onJump(suggestion.section_hint)}
            className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
          >
            Jump <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{suggestion.message}</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CvCoach() {
  const [cvs, setCvs] = useState<StoredCV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [versions, setVersions] = useState<CVVersion[]>([]);
  const [viewingVersion, setViewingVersion] = useState<CVVersion | null>(null); // null = current
  const [cvText, setCvText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [assessment, setAssessment] = useState<CVCoachAssessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pullingProfile, setPullingProfile] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayScore = useAnimatedScore(assessment?.quality_score ?? null);
  const isDirty = cvText !== originalText;

  // ── Assess ─────────────────────────────────────────────────────────────────

  const runAssess = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setAssessing(true);
    setError(null);
    try {
      setAssessment(await assessCVCoach(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment failed');
    } finally {
      setAssessing(false);
    }
  }, []);

  // Debounced auto-assess on every keystroke
  const handleTextChange = (text: string) => {
    setCvText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runAssess(text), 1500);
  };

  // ── Jump to section ─────────────────────────────────────────────────────────

  const jumpToSection = (hint: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const upper = ta.value.toUpperCase();
    const KEYWORDS: Record<string, string[]> = {
      experience: ['EXPERIENCE', 'WORK HISTORY', 'EMPLOYMENT', 'CAREER HISTORY'],
      skills:     ['SKILLS', 'TECHNICAL SKILLS', 'COMPETENCIES', 'EXPERTISE'],
      education:  ['EDUCATION', 'ACADEMIC', 'QUALIFICATIONS', 'TRAINING'],
      projects:   ['PROJECTS', 'PROJECT', 'PORTFOLIO'],
      contact:    [],
    };
    const candidates = KEYWORDS[hint] ?? [];
    let idx = hint === 'contact' ? 0 : -1;
    for (const kw of candidates) {
      const found = upper.indexOf(kw);
      if (found !== -1) { idx = found; break; }
    }
    if (idx === -1) return;
    ta.focus();
    ta.setSelectionRange(idx, Math.min(idx + 30, ta.value.length));
    const linesBefore = ta.value.substring(0, idx).split('\n').length - 1;
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 18;
    ta.scrollTop = Math.max(0, linesBefore * lineHeight - ta.clientHeight / 3);
  };

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    getCVs()
      .then(list => {
        setCvs(list);
        const def = list.find(c => c.is_default) ?? list[0];
        if (def) setSelectedCvId(def.id);
      })
      .catch(() => setError('Failed to load CVs'));
  }, []);

  // Load current CV text + version list when CV changes
  useEffect(() => {
    if (selectedCvId === null) return;
    setAssessment(null);
    setViewingVersion(null);
    setVersions([]);
    Promise.all([getCV(selectedCvId), getCVVersions(selectedCvId)])
      .then(([cv, vers]) => {
        const text = cv.content ?? '';
        setCvText(text);
        setOriginalText(text);
        setVersions(vers);
        runAssess(text);
      })
      .catch(() => setError('Failed to load CV content'));
  }, [selectedCvId, runAssess]);

  // Load a specific version into the editor
  const handleVersionChange = async (versionId: string) => {
    if (!selectedCvId) return;
    if (!versionId) {
      // Back to current
      setViewingVersion(null);
      setChangeSummary('');
      const cv = await getCV(selectedCvId).catch(() => null);
      if (cv) {
        const text = cv.content ?? '';
        setCvText(text);
        setOriginalText(text);
        runAssess(text);
      }
      return;
    }
    const ver = await getCVVersionById(Number(versionId)).catch(() => null);
    if (!ver) return;
    const text = ver.content ?? '';
    setViewingVersion(ver);
    setCvText(text);
    setOriginalText(text);
    setChangeSummary(`Restored from v${ver.version_number}`);
    runAssess(text);
  };

  // ── Pull from Profile ───────────────────────────────────────────────────────

  function stripContactHeader(text: string): string {
    return text.replace(/<!-- CONTACT_START -->[\s\S]*?<!-- CONTACT_END -->\n?/, '');
  }

  const handlePullFromProfile = async () => {
    setPullingProfile(true);
    try {
      const { experience_text, contact_header } = await assembleCV();

      let newContent = stripContactHeader(cvText); // idempotent

      const expPattern = /^#{1,3}\s*(work\s+)?experience\s*$/i;
      const lines = newContent.split('\n');
      const expIdx = lines.findIndex(l => expPattern.test(l.trim()));

      if (experience_text) {
        if (expIdx === -1) {
          newContent = newContent.trimEnd() + '\n\n## Experience\n\n' + experience_text;
        } else {
          let nextSection = lines.length;
          for (let i = expIdx + 1; i < lines.length; i++) {
            if (/^#{1,3}\s/.test(lines[i])) { nextSection = i; break; }
          }
          const before = lines.slice(0, expIdx + 1);
          const after = lines.slice(nextSection);
          newContent = [...before, '', experience_text, '', ...after].join('\n');
        }
      }

      if (contact_header) {
        newContent = contact_header + '\n\n' + newContent.trimStart();
      }

      handleTextChange(newContent); // triggers debounced re-assess
    } catch {
      // Silent — non-critical
    } finally {
      setPullingProfile(false);
    }
  };

  // ── Save / Restore ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedCvId || !isDirty) return;
    setSaving(true);
    try {
      await updateCVContent(selectedCvId, {
        content: cvText,
        change_summary: changeSummary || undefined,
      });
      setOriginalText(cvText);
      setChangeSummary('');
      setViewingVersion(null);
      // Refresh version list
      getCVVersions(selectedCvId).then(setVersions).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // One-click restore (no edits needed)
  const handleRestore = async () => {
    if (!selectedCvId || !viewingVersion) return;
    setSaving(true);
    try {
      await updateCVContent(selectedCvId, {
        content: cvText,
        change_summary: `Restored from v${viewingVersion.version_number}`,
      });
      setOriginalText(cvText);
      setChangeSummary('');
      setViewingVersion(null);
      getCVVersions(selectedCvId).then(setVersions).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const suggestions = assessment?.coaching_suggestions ?? [];
  const allClear = assessment !== null && !assessing && suggestions.length === 0;

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">CV Coach</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            Feedback updates as you type
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* CV picker */}
          <select
            value={selectedCvId ?? ''}
            onChange={e => setSelectedCvId(Number(e.target.value))}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cvs.map(cv => (
              <option key={cv.id} value={cv.id}>
                {cv.name}{cv.is_default ? ' (default)' : ''}
              </option>
            ))}
          </select>
          {/* Version picker */}
          {versions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={viewingVersion?.id ?? ''}
                onChange={e => handleVersionChange(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">v{versions[0]?.version_number} (current)</option>
                {versions.slice(1).map(v => {
                  const summary = firstLine(v.change_summary);
                  const label = `v${v.version_number} · ${formatVersionDate(v.created_at)}${summary ? ' · ' + summary.slice(0, 28) : ''}`;
                  return <option key={v.id} value={v.id}>{label}</option>;
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Version restore banner */}
      {viewingVersion && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <History className="w-4 h-4 flex-shrink-0" />
            <span>
              Viewing <strong>v{viewingVersion.version_number}</strong> · {formatVersionDate(viewingVersion.created_at)}
              {firstLine(viewingVersion.change_summary) && (
                <span className="text-amber-600 dark:text-amber-400"> · {firstLine(viewingVersion.change_summary).slice(0, 50)}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRestore}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restore as current
            </button>
            <button
              onClick={() => handleVersionChange('')}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
            >
              Back to current
            </button>
          </div>
        </div>
      )}

      {/* Score bar */}
      <ScoreBar
        score={displayScore}
        issueCount={suggestions.length}
        assessing={assessing}
      />

      {/* Two-column main area */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Editor */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={cvText}
            onChange={e => handleTextChange(e.target.value)}
            className="w-full h-full font-mono text-xs leading-relaxed p-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ minHeight: '520px' }}
            placeholder={
              `Paste or edit your CV here — feedback updates as you type…\n\n` +
              `Tips:\n` +
              `  • Use clear section headers: EXPERIENCE, SKILLS, EDUCATION, PROJECTS\n` +
              `  • Start bullets with action verbs and add metrics (e.g. "reduced cost by 30%")\n` +
              `  • Put your email address at the very top`
            }
            spellCheck={false}
          />
        </div>

        {/* Coaching panel */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-2">

          {/* Initial loading spinner */}
          {assessing && !assessment && (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-sm">Analysing your CV…</span>
            </div>
          )}

          {/* All-clear state */}
          {allClear && (
            <div className="flex flex-col items-center gap-3 p-8 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                Looking strong!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                No major issues detected. Keep editing — the score updates live.
              </p>
            </div>
          )}

          {/* Suggestion cards */}
          {suggestions.map((s, i) => (
            <SuggestionCard key={`${s.category}-${s.priority}-${i}`} suggestion={s} onJump={jumpToSection} />
          ))}

          {/* Footer meta */}
          {assessment && (
            <div className="mt-1 px-1 flex items-center justify-between text-xs text-slate-400">
              <span>{assessment.sections_detected.length} section{assessment.sections_detected.length !== 1 ? 's' : ''} detected</span>
              <span>{assessment.cv_char_count} chars</span>
              {assessing && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> re-checking
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handlePullFromProfile}
          disabled={pullingProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 transition-colors"
          title="Pull contact info and job history from your Profile"
        >
          {pullingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Pull from Profile
        </button>
        <input
          type="text"
          value={changeSummary}
          onChange={e => setChangeSummary(e.target.value)}
          placeholder="Change summary (optional)…"
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSave}
          disabled={saving || !isDirty || !selectedCvId}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
