import React from 'react';
import { ParsedEntities } from '../types';

interface ExtractedSkillsListProps {
  parsedEntities: ParsedEntities;
}

const ExtractedSkillsList: React.FC<ExtractedSkillsListProps> = ({ parsedEntities }) => {
  if (!parsedEntities) {
    return null;
  }

  const cvSkills = new Set(parsedEntities.cv_hard_skills);
  const jdRequiredSkills = new Set(parsedEntities.jd_required_skills);
  const jdPreferredSkills = new Set(parsedEntities.jd_preferred_skills);

  const matchedRequired: string[] = [];
  const matchedPreferred: string[] = [];
  const cvOnlySkills: string[] = [];
  const missingRequired: string[] = [];
  const missingPreferred: string[] = [];

  cvSkills.forEach(skill => {
    if (jdRequiredSkills.has(skill)) {
      matchedRequired.push(skill);
    } else if (jdPreferredSkills.has(skill)) {
      matchedPreferred.push(skill);
    } else {
      cvOnlySkills.push(skill);
    }
  });

  jdRequiredSkills.forEach(skill => {
    if (!cvSkills.has(skill)) {
      missingRequired.push(skill);
    }
  });

  jdPreferredSkills.forEach(skill => {
    if (!cvSkills.has(skill) && !jdRequiredSkills.has(skill)) {
      missingPreferred.push(skill);
    }
  });

  const cvSoftSkills = new Set(parsedEntities.cv_soft_skills);
  const jdRequiredSoftSkills = new Set(
    parsedEntities.jd_required_skills.filter(skill => parsedEntities.cv_soft_skills.includes(skill))
  );
  const jdPreferredSoftSkills = new Set(
    parsedEntities.jd_preferred_skills.filter(skill => parsedEntities.cv_soft_skills.includes(skill))
  );

  const matchedSoftRequired: string[] = [];
  const matchedSoftPreferred: string[] = [];
  const cvOnlySoftSkills: string[] = [];

  cvSoftSkills.forEach(skill => {
    if (jdRequiredSoftSkills.has(skill)) {
      matchedSoftRequired.push(skill);
    } else if (jdPreferredSoftSkills.has(skill)) {
      matchedSoftPreferred.push(skill);
    } else {
      cvOnlySoftSkills.push(skill);
    }
  });

  const totalJdSoftSkills = new Set([...jdRequiredSoftSkills, ...jdPreferredSoftSkills]).size;

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
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Extracted Hard Skills</h3>
      <div className="space-y-6">

        {/* Matched Skills */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Matched Skills</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required: <span className="font-bold text-green-600 dark:text-green-400">{matchedRequired.length}/{jdRequiredSkills.size}</span>
              </p>
              {renderSkillList(matchedRequired, 'text-green-700', 'dark:text-green-300')}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred: <span className="font-bold text-yellow-600 dark:text-yellow-400">{matchedPreferred.length}/{jdPreferredSkills.size}</span>
              </p>
              {renderSkillList(matchedPreferred, 'text-yellow-700', 'dark:text-yellow-300')}
            </div>
          </div>
        </div>

        {/* CV Only Skills */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">CV Only Skills</h4>
          {renderSkillList(cvOnlySkills, 'text-gray-600', 'dark:text-gray-400')}
        </div>

        {/* Missing Skills */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Missing Skills (from JD)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required: <span className="font-bold text-red-600 dark:text-red-400">{missingRequired.length}/{jdRequiredSkills.size}</span>
              </p>
              {renderSkillList(missingRequired, 'text-red-700', 'dark:text-red-300')}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred: <span className="font-bold text-orange-600 dark:text-orange-400">{missingPreferred.length}/{jdPreferredSkills.size}</span>
              </p>
              {renderSkillList(missingPreferred, 'text-orange-700', 'dark:text-orange-300')}
            </div>
          </div>
        </div>

        {/* Soft Skills Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Extracted Soft Skills</h3>
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Matched Soft Skills</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required: <span className="font-bold text-green-600 dark:text-green-400">{matchedSoftRequired.length}/{totalJdSoftSkills}</span>
                  </p>
                  {renderSkillList(matchedSoftRequired, 'text-green-700', 'dark:text-green-300')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred: <span className="font-bold text-yellow-600 dark:text-yellow-400">{matchedSoftPreferred.length}/{totalJdSoftSkills}</span>
                  </p>
                  {renderSkillList(matchedSoftPreferred, 'text-yellow-700', 'dark:text-yellow-300')}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">CV Only Soft Skills</h4>
              {renderSkillList(cvOnlySoftSkills, 'text-gray-600', 'dark:text-gray-400')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractedSkillsList;
