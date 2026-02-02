import { History } from 'lucide-react';
import type { MatchHistoryEntry } from '../types';

interface MatchHistoryTableProps {
  history: MatchHistoryEntry[];
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function MatchHistoryTable({ history }: MatchHistoryTableProps) {
  if (history.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-1">
        <History className="w-4 h-4" />
        <span>Match History ({history.length} iterations)</span>
      </h4>
      <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
              <th className="px-3 py-1.5 text-left">#</th>
              <th className="px-3 py-1.5 text-left">CV Version</th>
              <th className="px-3 py-1.5 text-right">Score</th>
              <th className="px-3 py-1.5 text-right">Delta</th>
              <th className="px-3 py-1.5 text-right">Keywords</th>
              <th className="px-3 py-1.5 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, idx) => (
              <tr
                key={entry.id}
                className={`border-t border-slate-100 dark:border-slate-700 ${
                  idx === history.length - 1 ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                }`}
              >
                <td className="px-3 py-1.5 text-slate-400">{entry.iteration}</td>
                <td className="px-3 py-1.5">
                  {entry.version_number ? (
                    <span className="text-slate-700 dark:text-slate-200">
                      v{entry.version_number}
                      {entry.change_summary && (
                        <span className="text-xs text-slate-400 ml-1 truncate inline-block max-w-[150px] align-bottom">
                          {entry.change_summary}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-mono font-medium text-slate-700 dark:text-slate-200">
                  {entry.score}%
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {entry.delta != null ? (
                    <span className={
                      entry.delta > 0 ? 'text-green-600 dark:text-green-400' :
                      entry.delta < 0 ? 'text-red-600 dark:text-red-400' :
                      'text-slate-400'
                    }>
                      {entry.delta > 0 ? '+' : ''}{entry.delta}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">-</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-slate-500 dark:text-slate-400">
                  {entry.matched != null && entry.total != null
                    ? `${entry.matched}/${entry.total}`
                    : '-'}
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-slate-500 dark:text-slate-400">
                  {formatShortDate(entry.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MatchHistoryTable;
