import { BarChart2 } from 'lucide-react';
import type { ConfidenceData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface ConfidenceScorePanelProps {
  confidence: ConfidenceData;
}

function barColor(pct: number): string {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 55) return 'bg-yellow-500';
  return 'bg-red-500';
}

function badgeColor(score: number): string {
  if (score >= 75) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  if (score >= 55) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}

interface BarRowProps {
  label: string;
  value: number;
}

function BarRow({ label, value }: BarRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor(value)} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ConfidenceScorePanel({ confidence }: ConfidenceScorePanelProps) {
  const { confidence_score, confidence_message, evidence_component, clarity_component, coverage_component } = confidence;

  return (
    <CollapsibleSection
      title="Presentation Quality"
      icon={BarChart2}
      badge={`${confidence_score.toFixed(0)}%`}
      badgeColor={badgeColor(confidence_score)}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">{confidence_message}</p>
        <div className="space-y-3">
          <BarRow label="Evidence Quality" value={evidence_component} />
          <BarRow label="Communication Clarity" value={clarity_component} />
          <BarRow label="Coverage" value={coverage_component} />
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default ConfidenceScorePanel;
