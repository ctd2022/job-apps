import { Info, MessageSquare } from 'lucide-react';
import type { InferredCriterion } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface InferredInterviewCriteriaProps {
  criteria: InferredCriterion[];
}

function InferredInterviewCriteria({ criteria }: InferredInterviewCriteriaProps) {
  if (!criteria || criteria.length === 0) return null;

  return (
    <CollapsibleSection title="Likely assessed in interview" icon={MessageSquare}>
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            These are role-typical competencies inferred from the job title — not stated in the JD text.
          </p>
        </div>
        <div className="space-y-2">
          {criteria.map(item => (
            <div key={item.criterion} className="border-l-2 border-slate-200 dark:border-slate-600 pl-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.criterion}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.rationale}</p>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default InferredInterviewCriteria;
