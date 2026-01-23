import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import { getJobFileContent, getJobFileUrl, FileContent } from '../api';
import type { OutputFile } from '../types';

interface FilePreviewProps {
  jobId: string;
  files: OutputFile[];
}

function FilePreview({ jobId, files }: FilePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only previewable files
  const previewableFiles = files.filter(f =>
    f.name.endsWith('.md') || f.name.endsWith('.txt') || f.name.endsWith('.json')
  );

  const binaryFiles = files.filter(f =>
    f.name.endsWith('.docx')
  );

  useEffect(() => {
    if (selectedFile) {
      loadContent(selectedFile);
    }
  }, [selectedFile]);

  async function loadContent(fileName: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobFileContent(jobId, fileName);
      setContent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
      setContent(null);
    } finally {
      setLoading(false);
    }
  }

  function getFileIcon(fileName: string) {
    if (fileName.includes('cv')) return 'CV';
    if (fileName.includes('cover_letter')) return 'CL';
    if (fileName.includes('ats')) return 'ATS';
    if (fileName.includes('answers')) return 'Q&A';
    if (fileName.includes('metadata')) return 'META';
    return 'FILE';
  }

  function getFileLabel(fileName: string) {
    if (fileName.includes('cv')) return 'Tailored CV';
    if (fileName.includes('cover_letter')) return 'Cover Letter';
    if (fileName.includes('ats')) return 'ATS Analysis';
    if (fileName.includes('answers')) return 'Q&A Answers';
    if (fileName.includes('metadata')) return 'Metadata';
    return fileName;
  }

  return (
    <div className="space-y-4">
      {/* File tabs */}
      <div className="flex flex-wrap gap-2">
        {previewableFiles.map(file => (
          <button
            key={file.name}
            onClick={() => setSelectedFile(selectedFile === file.name ? null : file.name)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFile === file.name
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="w-6 h-6 bg-white/20 rounded text-xs flex items-center justify-center font-bold">
              {getFileIcon(file.name)}
            </span>
            <span>{getFileLabel(file.name)}</span>
            {selectedFile === file.name ? (
              <X className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        ))}
      </div>

      {/* Preview panel */}
      {selectedFile && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">{selectedFile}</span>
            <a
              href={getJobFileUrl(jobId, selectedFile)}
              download
              className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : error ? (
              <div className="flex items-center space-x-2 p-4 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            ) : content ? (
              <div className="p-4">
                {content.type === 'markdown' ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                    <ReactMarkdown>{content.content}</ReactMarkdown>
                  </div>
                ) : content.type === 'json' ? (
                  <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                    <code>{JSON.stringify(JSON.parse(content.content), null, 2)}</code>
                  </pre>
                ) : (
                  <pre className="text-sm whitespace-pre-wrap text-gray-700 font-mono">
                    {content.content}
                  </pre>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Download-only files (DOCX) */}
      {binaryFiles.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-500 mb-2">Download Only</p>
          <div className="flex flex-wrap gap-2">
            {binaryFiles.map(file => (
              <a
                key={file.name}
                href={getJobFileUrl(jobId, file.name)}
                download
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>{getFileLabel(file.name)}</span>
                <span className="text-xs text-gray-400">.docx</span>
                <Download className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilePreview;
