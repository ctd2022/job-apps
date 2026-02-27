import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { getPositionProfile } from '../api';
import type { PositionProfileData, SkillFrequency } from '../types';

// ── Skill frequency row ───────────────────────────────────────────────────────

function SkillRow({ skill, totalJobs }: { skill: SkillFrequency; totalJobs: number }) {
  const matchedBarPct = (skill.matched_count / totalJobs) * 100;
  const missedBarPct = ((skill.frequency - skill.matched_count) / totalJobs) * 100;

  const rateBadge =
    skill.match_rate >= 0.7
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : skill.match_rate >= 0.5
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';

  const rateLabel =
    skill.match_rate >= 0.7 ? 'Strong' : skill.match_rate >= 0.5 ? 'Partial' : 'Gap';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      {/* Skill name */}
      <span className="w-48 flex-shrink-0 text-sm text-slate-700 dark:text-slate-200 capitalize truncate" title={skill.skill}>
        {skill.skill}
      </span>

      {/* Split bar: green = matched, red/amber = missed */}
      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 rounded-l-full"
          style={{ width: `${matchedBarPct}%` }}
        />
        <div
          className="h-full bg-red-300 dark:bg-red-700"
          style={{ width: `${missedBarPct}%` }}
        />
      </div>

      {/* Count */}
      <span className="w-20 flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 text-right tabular-nums">
        {skill.frequency}/{totalJobs} jobs
      </span>

      {/* Match rate badge */}
      <span className={`w-16 flex-shrink-0 text-xs font-medium text-center px-1.5 py-0.5 rounded ${rateBadge}`}>
        {rateLabel}
      </span>
    </div>
  );
}

// ── Insight headline ─────────────────────────────────────────────────────────

function InsightHeadline({ data }: { data: PositionProfileData }) {
  const topRole = data.role_distribution[0]?.title;
  const topStrength = data.strengths[0]?.skill;
  const topGap = data.consistent_gaps[0]?.skill;

  const rolePhrase = topRole
    ? `primarily targeting ${topRole} roles`
    : `${data.job_count} analysed roles`;

  const strengthPhrase = topStrength
    ? `Your CV consistently demonstrates ${topStrength}`
    : 'Your CV covers the core requirements well';

  const gapPhrase = topGap
    ? ` — but ${topGap} is a recurring gap worth addressing.`
    : '. No significant skill gaps detected.';

  return (
    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
      Based on <strong>{data.job_count}</strong> selected jobs ({rolePhrase}). {strengthPhrase}{gapPhrase}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PositionProfile() {
  const [data, setData] = useState<PositionProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCorpus, setShowCorpus] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getPositionProfile());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load position profile');
    } finally {
      setLoading(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

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

  // ── Empty / too few jobs ───────────────────────────────────────────────────

  if (!data || data.job_count === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Header jobCount={0} />
        <div className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No analysed jobs selected</p>
          <p className="text-xs text-slate-400">
            Go to{' '}
            <Link to="/history" className="text-indigo-600 dark:text-indigo-400 hover:underline">History</Link>
            {' '}and make sure at least 3 jobs with ATS analysis have the position profile checkbox ticked.
          </p>
        </div>
      </div>
    );
  }

  if (data.job_count < 3) {
    return (
      <div className="flex flex-col gap-4">
        <Header jobCount={data.job_count} />
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Only <strong>{data.job_count}</strong> job{data.job_count !== 1 ? 's' : ''} selected — add at least 3 analysed jobs in{' '}
            <Link to="/history" className="underline">History</Link> for meaningful insights.
          </span>
        </div>
      </div>
    );
  }

  // ── Full profile ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      <Header jobCount={data.job_count} onRefresh={load} />

      {/* Insight headline */}
      <InsightHeadline data={data} />

      {/* Role distribution */}
      <Section title="Role Types Targeted">
        <div className="flex flex-wrap gap-2">
          {data.role_distribution.map(r => (
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
          {data.role_distribution.length === 0 && (
            <p className="text-sm text-slate-400">No job titles recorded in selected roles.</p>
          )}
        </div>
      </Section>

      {/* Skills the market requires */}
      <Section title="What the Market Requires" subtitle="Top skills across your selected roles — green = your CV matched it, red = missed">
        <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          <span className="w-48 flex-shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Skill</span>
          <span className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Coverage</span>
          <span className="w-20 flex-shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Frequency</span>
          <span className="w-16 flex-shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-center">Match</span>
        </div>
        {data.skill_frequency.length > 0
          ? data.skill_frequency.map(s => (
              <SkillRow key={s.skill} skill={s} totalJobs={data.job_count} />
            ))
          : <p className="text-sm text-slate-400 py-2">No skill data — ATS analysis may not have parsed entities for these jobs.</p>
        }
      </Section>

      {/* Two-column: gaps + strengths */}
      <div className="grid grid-cols-2 gap-4">

        {/* Consistent gaps */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Consistent Gaps</h3>
          </div>
          {data.consistent_gaps.length === 0 ? (
            <p className="text-sm text-slate-400">No significant gaps — your CV covers what these roles need.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.consistent_gaps.map(g => (
                <div key={g.skill} className="flex items-center justify-between gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/40">
                  <span className="text-sm text-slate-700 dark:text-slate-200 capitalize">{g.skill}</span>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {g.frequency}/{data.job_count} roles
                    </div>
                    <div className="text-xs text-slate-400">
                      matched {Math.round(g.match_rate * 100)}%
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-1">
                These skills appear frequently in your target roles but your CV rarely demonstrates them.{' '}
                <Link to="/cv-coach" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Address in CV Coach <ArrowRight className="w-3 h-3 inline-block" />
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Strengths */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your Strengths</h3>
          </div>
          {data.strengths.length === 0 ? (
            <p className="text-sm text-slate-400">No high-frequency strengths identified yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.strengths.map(s => (
                <span
                  key={s.skill}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-lg capitalize"
                  title={`${s.frequency} roles · matched ${Math.round(s.match_rate * 100)}%`}
                >
                  {s.skill}
                  <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                    {Math.round(s.match_rate * 100)}%
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Corpus jobs (collapsible) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCorpus(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <span>{data.job_count} jobs included in this profile</span>
          {showCorpus ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showCorpus && (
          <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            {data.corpus_jobs.map(job => (
              <Link
                key={job.job_id}
                to={`/job/${job.job_id}`}
                className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="text-sm text-slate-700 dark:text-slate-200">
                  {job.job_title || 'Untitled'}{job.company_name ? ` — ${job.company_name}` : ''}
                </div>
                {job.ats_score != null && (
                  <span className="text-xs font-mono text-slate-400">{Math.round(job.ats_score)}%</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ jobCount, onRefresh }: { jobCount: number; onRefresh?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Position Profile</h1>
        {jobCount > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {jobCount} job{jobCount !== 1 ? 's' : ''} analysed
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/history"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
        >
          Manage selection in History <ArrowRight className="w-3 h-3" />
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
