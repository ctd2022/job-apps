import { useEffect, useState } from 'react';
import { Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { getPipelineDiagnosis } from '../api';
import type { PipelineDiagnosis } from '../types';

type Variant = 'start' | 'warn' | 'stuck' | 'mixed' | 'healthy';

function getVariant(m: PipelineDiagnosis['metrics']): Variant {
  if (m.total_submitted < 5) return 'start';
  if (m.total_submitted > 20 && m.interview_rate === 0) return 'stuck';
  if (m.interview_rate < 10 && m.total_submitted > 10) return 'warn';
  if (m.interview_rate > 20 && m.offer_rate < 10) return 'mixed';
  return 'healthy';
}

const VARIANT_STYLES: Record<Variant, { Icon: typeof Lightbulb; iconClass: string; borderClass: string }> = {
  start:   { Icon: Lightbulb,       iconClass: 'text-blue-500',   borderClass: 'border-blue-200 dark:border-blue-700' },
  warn:    { Icon: AlertTriangle,   iconClass: 'text-red-500',    borderClass: 'border-red-200 dark:border-red-700' },
  stuck:   { Icon: AlertTriangle,   iconClass: 'text-red-500',    borderClass: 'border-red-200 dark:border-red-700' },
  mixed:   { Icon: AlertTriangle,   iconClass: 'text-yellow-500', borderClass: 'border-yellow-200 dark:border-yellow-700' },
  healthy: { Icon: CheckCircle,     iconClass: 'text-green-500',  borderClass: 'border-green-200 dark:border-green-700' },
};

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
      <span className="font-medium">{value}</span> {label}
    </span>
  );
}

function PipelineDiagnosis() {
  const [diagnosis, setDiagnosis] = useState<PipelineDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiagnosis() {
      try {
        const data = await getPipelineDiagnosis();
        setDiagnosis(data);
        setError(null);
      } catch (err) {
        console.error('API Error:', err);
        setError('Failed to load pipeline diagnosis');
      } finally {
        setLoading(false);
      }
    }
    loadDiagnosis();
  }, []);

  if (loading) return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mt-3 animate-pulse h-16" />
  );

  if (error || !diagnosis) return null;

  const variant = getVariant(diagnosis.metrics);
  const { Icon, iconClass, borderClass } = VARIANT_STYLES[variant];
  const m = diagnosis.metrics;

  return (
    <div className={`bg-white dark:bg-slate-800 border ${borderClass} rounded-lg p-3 mt-3`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${iconClass}`} />
        </div>
        <div>
          <div className="flex gap-3 mb-2 text-xs">
            <StatChip label="applied" value={m.total_submitted} />
            <StatChip label="interview rate" value={`${m.interview_rate.toFixed(0)}%`} />
            <StatChip label="offer rate" value={`${m.offer_rate.toFixed(0)}%`} />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{diagnosis.diagnosis}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{diagnosis.advice}</p>
        </div>
      </div>
    </div>
  );
}

export default PipelineDiagnosis;
