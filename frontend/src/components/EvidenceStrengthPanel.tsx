import React from 'react';

import type { EvidenceAnalysis, EvidenceGaps } from '../types';

interface EvidenceStrengthPanelProps {
  evidenceAnalysis: EvidenceAnalysis;
  evidenceGaps?: EvidenceGaps;
}

const EvidenceStrengthPanel: React.FC<EvidenceStrengthPanelProps> = ({ evidenceAnalysis, evidenceGaps }) => {
  if (!evidenceAnalysis) {
    return null;
  }

  const { strong_evidence_count, moderate_evidence_count, weak_evidence_count, average_strength, strong_skills, weak_skills } = evidenceAnalysis;

  const totalSkillsWithEvidence = strong_evidence_count + moderate_evidence_count + weak_evidence_count;

  // Calculate percentages for the summary bar
  const strongPct = totalSkillsWithEvidence > 0 ? (strong_evidence_count / totalSkillsWithEvidence) * 100 : 0;
  const moderatePct = totalSkillsWithEvidence > 0 ? (moderate_evidence_count / totalSkillsWithEvidence) * 100 : 0;
  const weakPct = totalSkillsWithEvidence > 0 ? (weak_evidence_count / totalSkillsWithEvidence) * 100 : 0;

  // Combine weak skills for suggestions, ensuring uniqueness
  const allWeakSkills = new Set([...weak_skills, ...(evidenceGaps?.weak_evidence_skills || [])]);

  // Determine color for average strength text
  const getAverageStrengthColor = (strength: number) => {
    if (strength >= 0.75) return 'text-green-600 dark:text-green-400';
    if (strength >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const renderSkillList = (skills: string[], colorClass: string, darkColorClass: string) => (
    <ul className="space-y-1 text-sm">
      {skills.length > 0 ? (
        skills.map(skill => (
          <li key={skill} className={`${colorClass} ${darkColorClass}`}>
            {skill}
          </li>
        ))
      ) : (
        <li className="text-gray-500 dark:text-gray-400">N/A</li>
      )}
    </ul>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Evidence Strength</h3>
      <div className="space-y-6">
        {/* Summary Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Evidence Distribution</span>
            <span className={`text-lg font-bold ${getAverageStrengthColor(average_strength)}`}>
              {(average_strength * 100).toFixed(0)}% Average Strength
            </span>
          </div>
          <div className="h-4 flex rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div className="h-full bg-green-500" style={{ width: `${strongPct}%` }} title={`Strong: ${strong_evidence_count}`} />
            <div className="h-full bg-yellow-500" style={{ width: `${moderatePct}%` }} title={`Moderate: ${moderatePct}%`} />
            <div className="h-full bg-red-500" style={{ width: `${weakPct}%` }} title={`Weak: ${weak_evidence_count}`} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Strong ({strong_evidence_count})</span>
            <span>Moderate ({moderate_evidence_count})</span>
            <span>Weak ({weak_evidence_count})</span>
          </div>
        </div>

        {/* Strong Skills List */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Strongly Evidenced Skills (Top 5)</h4>
          {renderSkillList(strong_skills, 'text-green-700', 'dark:text-green-300')}
        </div>

        {/* Weak Skills List with Suggestions */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Skills Needing Stronger Evidence</h4>
          {allWeakSkills.size > 0 ? (
            <ul className="space-y-1 text-sm">
              {Array.from(allWeakSkills).map(skill => (
                <li key={skill} className="text-red-700 dark:text-red-300">
                  <span className="font-medium">{skill}:</span> Add metrics or context to strengthen evidence.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No skills identified as needing stronger evidence.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceStrengthPanel;
