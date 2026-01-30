import { CheckSquare, Square, Award, Briefcase, GraduationCap, FolderKanban, BadgeCheck, FileText } from 'lucide-react';
import type { ATSAnalysisData } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface CVCompletenessMeterProps {
  analysis: ATSAnalysisData;
}

interface SectionCheck {
  name: string;
  icon: typeof CheckSquare;
  detected: boolean;
  weight: number;
  suggestion?: string;
}

function CVCompletenessMeter({ analysis }: CVCompletenessMeterProps) {
  const { section_analysis, evidence_analysis, parsed_entities } = analysis;

  // Determine which sections are present based on analysis data
  const skillsDetected = (parsed_entities.cv_hard_skills?.length || 0) > 0;
  const experienceDetected = (section_analysis.experience_matches?.length || 0) > 0;
  const projectsDetected = (section_analysis.projects_matches?.length || 0) > 0;

  // Build section checklist
  const sections: SectionCheck[] = [
    {
      name: 'Skills Section',
      icon: Award,
      detected: skillsDetected,
      weight: 25,
      suggestion: 'Add a clear SKILLS section listing your technical and soft skills',
    },
    {
      name: 'Work Experience',
      icon: Briefcase,
      detected: experienceDetected,
      weight: 30,
      suggestion: 'Include detailed WORK EXPERIENCE with achievements and metrics',
    },
    {
      name: 'Education',
      icon: GraduationCap,
      detected: section_analysis.cv_sections_detected > 0, // Assume education if sections detected
      weight: 15,
      suggestion: 'Add EDUCATION section with degrees and certifications',
    },
    {
      name: 'Projects',
      icon: FolderKanban,
      detected: projectsDetected,
      weight: 15,
      suggestion: 'Add PROJECTS section to demonstrate practical experience',
    },
    {
      name: 'Evidence & Metrics',
      icon: BadgeCheck,
      detected: evidence_analysis.strong_evidence_count > 0,
      weight: 15,
      suggestion: 'Add quantifiable achievements (e.g., "Improved performance by 30%")',
    },
  ];

  // Calculate completeness percentage
  const completeness = sections.reduce((acc, section) => {
    return acc + (section.detected ? section.weight : 0);
  }, 0);

  // Get color based on completeness
  const getCompletenessColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get suggestions for missing sections
  const suggestions = sections
    .filter(s => !s.detected && s.suggestion)
    .map(s => s.suggestion!);

  return (
    <CollapsibleSection
      title="CV Completeness"
      icon={FileText}
      badge={`${completeness}%`}
      badgeColor={
        completeness >= 80
          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          : completeness >= 60
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      }
    >
      <div className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Overall Completeness</span>
            <span className={`text-lg font-bold ${getCompletenessColor(completeness)}`}>
              {completeness}%
            </span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressBarColor(completeness)} transition-all`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Section Checklist */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Section Checklist
          </h4>
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded ${
                    section.detected
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-slate-50 dark:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {section.detected ? (
                      <CheckSquare className="w-4 h-4 text-green-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <Icon className={`w-4 h-4 ${section.detected ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`} />
                    <span className={`text-sm ${
                      section.detected
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {section.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {section.weight}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entity Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
              {parsed_entities.cv_hard_skills?.length || 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Hard Skills Found</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
              {evidence_analysis.strong_evidence_count || 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Skills with Evidence</div>
          </div>
          {parsed_entities.cv_years_experience !== null && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {parsed_entities.cv_years_experience}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Years Experience</div>
            </div>
          )}
          {parsed_entities.jd_years_required !== null && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {parsed_entities.jd_years_required}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Years Required (JD)</div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Suggestions
            </h4>
            <ul className="space-y-1">
              {suggestions.slice(0, 3).map((suggestion, idx) => (
                <li key={idx} className="text-xs text-slate-500 dark:text-slate-400 flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">-</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default CVCompletenessMeter;
