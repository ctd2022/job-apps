import React, { useState } from 'react';
import { AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface FormattingTip {
  id: string;
  severity: 'warning' | 'info';
  message: string;
  details?: string;
}

interface FormattingTipsPanelProps {
  content: string;
}

const FormattingTipsPanel: React.FC<FormattingTipsPanelProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getTips = (cvContent: string): FormattingTip[] => {
    const tips: FormattingTip[] = [];

    // Rule 1: no-tables (markdown pipes)
    if (/\|.*\|.*\|/.test(cvContent)) {
      tips.push({
        id: 'no-tables',
        severity: 'warning',
        message: 'Tables may not parse correctly in ATS systems',
      });
    }

    // Rule 2: no-columns (tab-separated or excessive whitespace alignment)
    // This is a simplified check. A more robust one might involve analyzing line-by-line indentation.
    // For now, let's look for multiple large spaces or tabs on a single line.
    if (/\t| {4,}/.test(cvContent) && cvContent.split('\n').some(line => (line.match(/\t/g) || []).length > 1 || (line.match(/ {4,}/g) || []).length > 1)) {
      tips.push({
        id: 'no-columns',
        severity: 'warning',
        message: 'Multi-column layouts can confuse ATS parsers',
      });
    }

    // Rule 3: standard-headings (missing common headings)
    const commonHeadings = ['experience', 'education', 'skills'];
    const lowerContent = cvContent.toLowerCase();
    const missingHeadings = commonHeadings.filter(
      (heading) => !lowerContent.includes(heading)
    );
    if (missingHeadings.length > 0) {
      tips.push({
        id: 'standard-headings',
        severity: 'info',
        message: `Consider using standard section headings: ${missingHeadings.map(h => h.charAt(0).toUpperCase() + h.slice(1)).join(', ')}`,
      });
    }

    // Rule 4: has-contact (no email pattern)
    if (!/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cvContent)) {
      tips.push({
        id: 'has-contact',
        severity: 'warning',
        message: 'No email address detected - ensure contact info is included',
      });
    }

    // Rule 5: has-dates (no date patterns YYYY, MM/YYYY)
    if (!/\b(19|20)\d{2}\b|(\d{1,2}\/\d{4})/.test(cvContent)) {
      tips.push({
        id: 'has-dates',
        severity: 'info',
        message: 'Add dates to your experience entries for better parsing',
      });
    }

    // Rule 6: bullet-points (long paragraphs)
    const paragraphs = cvContent.split(/\n\s*\n/);
    const hasLongParagraph = paragraphs.some(p => p.length > 300 && !p.includes('\n'));
    if (hasLongParagraph) {
      tips.push({
        id: 'bullet-points',
        severity: 'info',
        message: 'Consider using bullet points instead of long paragraphs',
      });
    }

    // Rule 7 & 8: cv-length
    if (cvContent.length < 500) {
      tips.push({
        id: 'cv-length-short',
        severity: 'warning',
        message: 'CV seems short - ATS may flag incomplete applications',
      });
    } else if (cvContent.length > 8000) {
      tips.push({
        id: 'cv-length-long',
        severity: 'info',
        message: 'CV is quite long - consider condensing to 2 pages',
      });
    }

    return tips;
  };

  const tips = getTips(content);
  const totalWarnings = tips.filter(tip => tip.severity === 'warning').length;
  const totalInfos = tips.filter(tip => tip.severity === 'info').length;
  const totalTips = tips.length;

  if (totalTips === 0) {
    return null;
  }

  return (
    <div className="mt-4 border rounded-lg shadow-sm overflow-hidden dark:bg-gray-800">
      <div
        className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 dark:bg-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            Formatting Tips ({totalTips})
          </span>
          {totalWarnings > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {totalWarnings} Warning{totalWarnings > 1 ? 's' : ''}
            </span>
          )}
          {totalInfos > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {totalInfos} Info{totalInfos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-3 space-y-2">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className={`flex items-start p-2 rounded-md ${
                tip.severity === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              }`}
            >
              {tip.severity === 'warning' ? (
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 mr-2" />
              ) : (
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5 mr-2" />
              )}
              <div>
                <p className="font-medium">{tip.message}</p>
                {tip.details && (
                  <p className="text-sm opacity-90 mt-1">{tip.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormattingTipsPanel;