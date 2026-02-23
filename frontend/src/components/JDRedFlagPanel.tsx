import type { JDAnalysisData, JDRedFlag } from '../types';
import CollapsibleSection from './CollapsibleSection';
import { ShieldAlert } from 'lucide-react';

interface Props {
  analysis: JDAnalysisData;
}

const RISK_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const SEVERITY_CARD: Record<string, string> = {
  high: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
  medium: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
  low: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
};

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

const CATEGORY_LABEL: Record<string, string> = {
  unrealistic_requirements: 'Unrealistic Requirements',
  culture_warning: 'Culture Warning',
  scope_overload: 'Scope Overload',
  transparency: 'Transparency',
};

function RedFlagCard({ flag }: { flag: JDRedFlag }) {
  return (
    <div className={`border rounded-lg p-3 space-y-1.5 ${SEVERITY_CARD[flag.severity]}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[flag.severity]}`}>
          {flag.severity.toUpperCase()}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {CATEGORY_LABEL[flag.category] || flag.category}
        </span>
        <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{flag.title}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{flag.detail}</p>
      {flag.evidence && (
        <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-2 text-xs italic text-slate-500 dark:text-slate-400">
          "{flag.evidence}"
        </blockquote>
      )}
    </div>
  );
}

function JDRedFlagPanel({ analysis }: Props) {
  const { red_flags, green_flags, overall_risk, summary, total_red_flags } = analysis;

  const isHighRisk = overall_risk === 'high' || overall_risk === 'critical';

  const byPriority: JDRedFlag[] = [
    ...red_flags.filter(f => f.severity === 'high'),
    ...red_flags.filter(f => f.severity === 'medium'),
    ...red_flags.filter(f => f.severity === 'low'),
  ];

  const countBadge = total_red_flags > 0 ? `${total_red_flags} flag${total_red_flags === 1 ? '' : 's'}` : 'No issues';
  const badgeColor = total_red_flags === 0
    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : RISK_BADGE[overall_risk] ?? RISK_BADGE.medium;

  return (
    <CollapsibleSection
      title="Job Description Analysis"
      icon={ShieldAlert}
      badge={countBadge}
      badgeColor={badgeColor}
      defaultExpanded={isHighRisk}
    >
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RISK_BADGE[overall_risk]}`}>
            Risk: {overall_risk.toUpperCase()}
          </span>
          {summary && (
            <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">{summary}</p>
          )}
        </div>

        {/* Red flags */}
        {byPriority.length === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">No concerns detected in this job description.</p>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Red Flags</h4>
            {byPriority.map((flag, i) => (
              <RedFlagCard key={i} flag={flag} />
            ))}
          </div>
        )}

        {/* Green flags */}
        {green_flags.length > 0 && (
          <CollapsibleSection title={`Green Flags (${green_flags.length})`}>
            <div className="space-y-2">
              {green_flags.map((gf, i) => (
                <div key={i} className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{gf.category}</span>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{gf.title}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{gf.detail}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default JDRedFlagPanel;
