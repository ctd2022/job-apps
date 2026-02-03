import { useEffect, useState } from 'react';
import { Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { getPipelineDiagnosis } from '../api';
import type { PipelineDiagnosis } from '../types';

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

  if (loading) {
    return null; // Or a loading spinner
  }

  if (error || !diagnosis) {
    return null; // Don't render anything on error
  }

  const getIcon = () => {
    if (diagnosis.diagnosis.includes('low')) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    if (diagnosis.diagnosis.includes('healthy')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Lightbulb className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 mt-3">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{diagnosis.diagnosis}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{diagnosis.advice}</p>
        </div>
      </div>
    </div>
  );
}

export default PipelineDiagnosis;
