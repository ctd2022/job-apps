/**
 * Match Score Tier utility
 * Converts raw ATS percentage scores to intuitive tier labels
 */

export interface MatchTier {
  label: string;
  color: string;        // Text color for light mode
  bgColor: string;      // Background color for light mode
  darkBgColor: string;  // Background color for dark mode
  darkTextColor: string; // Text color for dark mode
}

/**
 * Get the tier label and colors for a given ATS score
 *
 * Tiers:
 * - >= 85%: "Top Match" (green)
 * - 60-84%: "Good Fit" (blue)
 * - < 60%: "Reach" (grey)
 */
export function getMatchTier(score: number | undefined | null): MatchTier | null {
  if (score === undefined || score === null) {
    return null;
  }

  if (score >= 85) {
    return {
      label: 'Top Match',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      darkBgColor: 'dark:bg-green-900/50',
      darkTextColor: 'dark:text-green-300',
    };
  }

  if (score >= 60) {
    return {
      label: 'Good Fit',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      darkBgColor: 'dark:bg-blue-900/50',
      darkTextColor: 'dark:text-blue-300',
    };
  }

  return {
    label: 'Reach',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    darkBgColor: 'dark:bg-slate-700',
    darkTextColor: 'dark:text-slate-300',
  };
}

/**
 * Get the color class for the score progress bar
 */
export function getScoreBarColor(score: number): string {
  if (score >= 85) {
    return 'bg-green-500';
  }
  if (score >= 60) {
    return 'bg-blue-500';
  }
  return 'bg-slate-400';
}
