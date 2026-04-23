import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Briefcase,
  Target,
  X,
  Loader,
} from 'lucide-react';
import { getSearchScope, generateSearchScopeSuggestions, updateProfile } from '../api';
import type { SearchScopeData, SearchScopeSuggestions, ProfileUpdate } from '../types';

// ── Seniority bar ──────────────────────────────────────────────────────────────

function SeniorityBar({ data }: { data: SearchScopeData }) {
  const { senior_or_above, junior_or_associate, unspecified } = data.seniority_summary;
  const total = data.job_count;
  if (total === 0) return null;

  const pctSenior = Math.round((senior_or_above / total) * 100);
  const pctJunior = Math.round((junior_or_associate / total) * 100);
  const pctUnspecified = 100 - pctSenior - pctJunior;

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-2">
        {pctSenior > 0 && (
          <div className="bg-indigo-500" style={{ width: `${pctSenior}%` }} title={`Senior/Lead/Manager: ${senior_or_above}`} />
        )}
        {pctJunior > 0 && (
          <div className="bg-emerald-400" style={{ width: `${pctJunior}%` }} title={`Junior/Associate: ${junior_or_associate}`} />
        )}
        {pctUnspecified > 0 && (
          <div className="bg-slate-200 dark:bg-slate-600" style={{ width: `${pctUnspecified}%` }} title={`Unspecified: ${unspecified}`} />
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {senior_or_above > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            Senior / Lead / Manager — {senior_or_above} role{senior_or_above !== 1 ? 's' : ''} ({pctSenior}%)
          </span>
        )}
        {junior_or_associate > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Junior / Associate — {junior_or_associate} role{junior_or_associate !== 1 ? 's' : ''} ({pctJunior}%)
          </span>
        )}
        {unspecified > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
            Unspecified level — {unspecified} role{unspecified !== 1 ? 's' : ''} ({pctUnspecified}%)
          </span>
        )}
      </div>
    </div>
  );
}

// ── AI Suggestions panel ──────────────────────────────────────────────────────

function SuggestionsPanel({ data }: { data: SearchScopeData }) {
  const [suggestions, setSuggestions] = useState<SearchScopeSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setSuggestions(await generateSearchScopeSuggestions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  }

  if (!suggestions && !loading && !error) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
        <Sparkles className="w-6 h-6 text-indigo-400" />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">AI Search Insights</p>
          <p className="text-xs text-slate-400">
            {data.has_jd_text
              ? 'Generate adjacent role suggestions, JD themes, and observations based on your full job corpus.'
              : 'No JD text found — suggestions will be inferred from role titles only.'}
          </p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate insights
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center justify-center gap-2 text-sm text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Analysing your job corpus...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
        <button onClick={generate} className="ml-auto text-xs underline flex-shrink-0">Retry</button>
      </div>
    );
  }

  if (!suggestions) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* Adjacent roles */}
      {suggestions.adjacent_roles.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Roles You Might Be Missing</h3>
              <p className="text-xs text-slate-400 mt-0.5">Adjacent roles that share skill DNA with your current targets</p>
            </div>
            <button
              onClick={generate}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.adjacent_roles.map((r) => (
              <div
                key={r.role}
                className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg"
              >
                <Briefcase className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.role}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JD themes + Observations side by side */}
      <div className="grid grid-cols-2 gap-4">

        {suggestions.jd_themes.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recurring JD Themes</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.jd_themes.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {suggestions.search_observations.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Search Shape</h3>
            <ul className="flex flex-col gap-2">
              {suggestions.search_observations.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SearchScope() {
  const [data, setData] = useState<SearchScopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getSearchScope();
      setData(result);
      setTargetRoles(result.target_roles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load search scope data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTargetRole(role: string) {
    const next = targetRoles.filter(r => r !== role);
    setSavingRole(true);
    try {
      await updateProfile({ target_roles: JSON.stringify(next) } as ProfileUpdate);
      setTargetRoles(next);
    } finally {
      setSavingRole(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
        <button onClick={load} className="ml-auto text-xs underline">Retry</button>
      </div>
    );
  }

  if (!data || data.job_count === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader jobCount={0} />
        <div className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <Compass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No jobs added yet</p>
          <p className="text-xs text-slate-400">
            Add jobs via{' '}
            <Link to="/new" className="text-indigo-600 dark:text-indigo-400 hover:underline">New Application</Link>
            {' '}or the{' '}
            <Link to="/history" className="text-indigo-600 dark:text-indigo-400 hover:underline">History</Link>
            {' '}wishlist to start building your corpus.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      <PageHeader jobCount={data.job_count} onRefresh={load} />

      {/* Insight summary */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
        Based on <strong>{data.job_count}</strong> job{data.job_count !== 1 ? 's' : ''} in your tracker
        {data.role_distribution.length > 0
          ? ` — primarily targeting ${data.role_distribution[0].title}${data.role_distribution.length > 1 ? ` and ${data.role_distribution.length - 1} other role type${data.role_distribution.length > 2 ? 's' : ''}` : ''}`
          : ''}.
        {' '}This view analyses the shape of your search — not how well your CV fits, but whether you are casting the right net.
      </div>

      {/* Declared target roles (Idea #673) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Declared Target Roles</h3>
          </div>
          <Link
            to="/profile"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
          >
            Edit in Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs text-slate-400 mb-3">Roles you have explicitly declared you are targeting — drives AI suggestions</p>
        {targetRoles.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No target roles set.{' '}
            <Link to="/profile" className="text-indigo-600 dark:text-indigo-400 hover:underline">Add them in your Profile</Link>
            {' '}to get more accurate adjacent role suggestions.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {targetRoles.map((role) => (
              <span
                key={role}
                className="flex items-center gap-1 pl-2.5 pr-1 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 text-sm rounded-full"
              >
                <Target className="w-3 h-3 text-indigo-400" />
                {role}
                <button
                  onClick={() => handleRemoveTargetRole(role)}
                  disabled={savingRole}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-700 text-indigo-500 dark:text-indigo-400 disabled:opacity-40"
                  aria-label={`Remove ${role}`}
                >
                  {savingRole ? <Loader className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Role distribution */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Role Types in Your Corpus</h3>
        <p className="text-xs text-slate-400 mb-3">All jobs you have added, grouped by title</p>
        <div className="flex flex-wrap gap-2">
          {data.role_distribution.map((r) => (
            <span
              key={r.title}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-full"
            >
              {r.title}
              <span className="text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full px-1.5 py-0.5 font-mono">
                {r.count}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Seniority breakdown */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Seniority Mix</h3>
        <p className="text-xs text-slate-400 mb-3">Inferred from job titles</p>
        <SeniorityBar data={data} />
      </div>

      {/* AI Suggestions (lazy, user-triggered) */}
      <SuggestionsPanel data={data} />

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PageHeader({ jobCount, onRefresh }: { jobCount: number; onRefresh?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Compass className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Search Scope</h1>
        {jobCount > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {jobCount} job{jobCount !== 1 ? 's' : ''} across all statuses
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/position-profile"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
        >
          CV fit analysis in Position Profile <ArrowRight className="w-3 h-3" />
        </Link>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
