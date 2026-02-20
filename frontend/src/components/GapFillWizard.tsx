import { useEffect, useState } from 'react';
import { Loader2, ChevronRight, CheckCircle } from 'lucide-react';
import { gapFill, getBackends } from '../api';
import type { GapAnalysis, GapQuestion, GapAnswer, ApplySuggestionsResponse, Backend } from '../types';

interface GapFillWizardProps {
  jobId: string;
  cvVersionId: number | null;
  gapAnalysis: GapAnalysis;
  onRevised: (result: ApplySuggestionsResponse) => void;
}

type WizardState = 'idle' | 'active' | 'submitting' | 'done';

function generateQuestions(gapAnalysis: GapAnalysis): GapQuestion[] {
  const questions: GapQuestion[] = [];

  // Critical gaps (up to 4)
  const critical = [
    ...gapAnalysis.critical_gaps.missing_critical_keywords,
    ...gapAnalysis.critical_gaps.missing_required_skills,
  ];
  const seenCritical = new Set<string>();
  for (const skill of critical) {
    if (seenCritical.has(skill.toLowerCase()) || questions.length >= 4) break;
    seenCritical.add(skill.toLowerCase());
    questions.push({
      id: `critical-${skill}`,
      gap_type: 'critical',
      skill,
      question: `**${skill}** is a critical requirement in this JD. Do you have experience with this that isn't currently on your CV?`,
      section_hint: 'Best placed in: Experience or Skills',
    });
  }

  // Evidence gaps (up to 3)
  for (const skill of gapAnalysis.evidence_gaps.weak_evidence_skills) {
    if (questions.length >= 7) break;
    questions.push({
      id: `evidence-${skill}`,
      gap_type: 'evidence',
      skill,
      question: `Your CV mentions **${skill}** but without strong examples. Can you describe a specific project or achievement where you used it?`,
      section_hint: 'Best placed in: Experience (adds metrics/context)',
    });
  }

  // Semantic gaps (up to 2)
  for (const concept of gapAnalysis.semantic_gaps.missing_concepts) {
    if (questions.length >= 8) break;
    questions.push({
      id: `semantic-${concept}`,
      gap_type: 'semantic',
      skill: concept,
      question: `The JD emphasises **${concept}**. Do you have relevant experience with this, even under a different name?`,
      section_hint: 'Best placed in: Experience or Summary',
    });
  }

  return questions.slice(0, 8);
}

function renderQuestion(text: string): React.ReactNode {
  // Render **bold** markers
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

function GapFillWizard({ jobId, cvVersionId, gapAnalysis, onRevised }: GapFillWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>('idle');
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplySuggestionsResponse | null>(null);

  // Backend/model selection (shown on last step)
  const [backends, setBackends] = useState<Backend[]>([]);
  const [selectedBackend, setSelectedBackend] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    getBackends().then(data => {
      const list = (data as any)?.backends || data || [];
      setBackends(list);
    }).catch(() => {});
  }, []);

  function handleStart() {
    const qs = generateQuestions(gapAnalysis);
    if (qs.length === 0) return;
    setQuestions(qs);
    setCurrentStep(0);
    setAnswers({});
    setError(null);
    setWizardState('active');
  }

  function handleNext() {
    if (currentStep < questions.length - 1) {
      setCurrentStep(s => s + 1);
    }
  }

  function handleSkip() {
    handleNext();
  }

  async function handleSubmit() {
    if (!cvVersionId) {
      setError('No CV version linked to this job.');
      return;
    }

    const gapAnswers: GapAnswer[] = questions
      .map(q => ({
        skill: q.skill,
        gap_type: q.gap_type,
        user_content: answers[q.id] || '',
      }))
      .filter(a => a.user_content.trim());

    if (gapAnswers.length === 0) {
      setError('No answers provided. Fill in at least one answer to continue.');
      return;
    }

    setWizardState('submitting');
    setError(null);

    try {
      const res = await gapFill(
        jobId,
        cvVersionId,
        gapAnswers,
        selectedBackend || undefined,
        selectedModel || undefined,
      );
      setResult(res);
      setWizardState('done');
      onRevised(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to incorporate experiences');
      setWizardState('active');
    }
  }

  function handleBackendChange(id: string) {
    setSelectedBackend(id);
    setSelectedModel('');
  }

  const activeBackend = backends.find(b => b.id === selectedBackend);
  const availableModels = activeBackend?.models || [];
  const isLastStep = currentStep === questions.length - 1;
  const filledCount = questions.filter(q => (answers[q.id] || '').trim()).length;

  if (wizardState === 'idle') {
    const questionCount = generateQuestions(gapAnalysis).length;
    if (questionCount === 0) return null;

    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Answer {questionCount} short question{questionCount !== 1 ? 's' : ''} to surface real experience you
          haven't documented yet. The LLM will incorporate only what you provide — no fabrication.
        </p>
        <button
          onClick={handleStart}
          className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          Start ({questionCount} question{questionCount !== 1 ? 's' : ''})
        </button>
      </div>
    );
  }

  if (wizardState === 'submitting') {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-700 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Loader2 className="w-4 h-4 animate-spin" />
        Incorporating your experiences into the CV...
      </div>
    );
  }

  if (wizardState === 'done' && result) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">CV updated with {result.applied_count} experience{result.applied_count !== 1 ? 's' : ''}</span>
        </div>
        {result.changelog && (
          <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-3 space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">Changes made:</p>
            {result.changelog.split('\n').filter(Boolean).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Open the CV Editor to review and save the revised version.
        </p>
      </div>
    );
  }

  // Active step
  const question = questions[currentStep];

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-700 space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>Question {currentStep + 1} of {questions.length}</span>
        <span className="text-teal-600 dark:text-teal-400">{filledCount} answered</span>
      </div>
      <div className="w-full h-1 bg-slate-200 dark:bg-slate-600 rounded-full">
        <div
          className="h-1 bg-teal-500 rounded-full transition-all"
          style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-3 space-y-2">
        <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {question.gap_type}
        </span>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {renderQuestion(question.question)}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{question.section_hint}</p>
      </div>

      <textarea
        value={answers[question.id] || ''}
        onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
        placeholder="Describe your experience here, or leave blank to skip..."
        rows={3}
        className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      {/* Backend/model selectors on last step */}
      {isLastStep && backends.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedBackend}
            onChange={e => handleBackendChange(e.target.value)}
            className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
          >
            <option value="">Default backend</option>
            {backends.filter(b => b.available).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {availableModels.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
            >
              <option value="">Default model</option>
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSkip}
          disabled={isLastStep}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-0"
        >
          Skip
        </button>
        {isLastStep ? (
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
          >
            Submit &amp; Update CV
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 flex items-center gap-2"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default GapFillWizard;
