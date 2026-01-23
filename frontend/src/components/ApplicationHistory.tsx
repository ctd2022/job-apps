import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { getApplications } from '../api';
import type { Application } from '../types';
import { SkeletonStats, SkeletonList } from './LoadingState';

function ApplicationHistory() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [backendFilter, setBackendFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Expanded rows
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  useEffect(() => {
    loadApplications();
  }, []);
  
  async function loadApplications() {
    try {
      const data = await getApplications();
      // Handle various response formats
      setApplications(Array.isArray(data) ? data : (data?.applications || []));
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }
  
  // Get unique backends for filter
  const backends = Array.from(new Set((applications || []).map(a => a.backend)));
  
  // Filter and sort applications
  const filteredApplications = (applications || [])
    .filter(app => {
      const matchesSearch = 
        app.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesBackend = backendFilter === 'all' || app.backend === backendFilter;
      return matchesSearch && matchesBackend;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.timestamp.localeCompare(b.timestamp);
      } else if (sortBy === 'score') {
        comparison = (a.ats_score || 0) - (b.ats_score || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  
  // Stats
  const stats = {
    total: applications.length,
    avgScore: applications.length > 0
      ? Math.round(applications.filter(a => a.ats_score).reduce((sum, a) => sum + (a.ats_score || 0), 0) / applications.filter(a => a.ats_score).length)
      : 0,
    highScore: Math.max(...applications.map(a => a.ats_score || 0)),
    byBackend: backends.reduce((acc, b) => {
      acc[b] = applications.filter(a => a.backend === b).length;
      return acc;
    }, {} as Record<string, number>),
  };
  
  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Failed to Load Applications</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(null); loadApplications(); }}
              className="mt-4 flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Applications"
          value={stats.total}
        />
        <StatCard
          icon={TrendingUp}
          label="Average ATS Score"
          value={`${stats.avgScore}%`}
        />
        <StatCard
          icon={TrendingUp}
          label="Highest Score"
          value={`${stats.highScore}%`}
        />
        <StatCard
          icon={Calendar}
          label="This Month"
          value={applications.filter(a => {
            const appDate = parseTimestamp(a.timestamp);
            const now = new Date();
            return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
          }).length}
        />
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job name or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          {/* Backend Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={backendFilter}
              onChange={(e) => setBackendFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Backends</option>
              {backends.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          
          {/* Sort */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                sortBy === 'date' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'score') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('score');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                sortBy === 'score' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Applications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No applications found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-indigo-600 hover:text-indigo-800 mt-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredApplications.map(app => (
              <ApplicationRow
                key={app.folder_name}
                application={app}
                isExpanded={expandedRow === app.folder_name}
                onToggle={() => setExpandedRow(
                  expandedRow === app.folder_name ? null : app.folder_name
                )}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Results Summary */}
      <p className="text-sm text-gray-500 text-center">
        Showing {filteredApplications.length} of {applications.length} applications
      </p>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({ 
  application, 
  isExpanded, 
  onToggle 
}: { 
  application: Application;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const atsColor = application.ats_score 
    ? application.ats_score >= 80 
      ? 'text-green-600 bg-green-50' 
      : application.ats_score >= 60 
        ? 'text-yellow-600 bg-yellow-50' 
        : 'text-red-600 bg-red-50'
    : 'text-gray-400 bg-gray-50';
  
  const backendColors: Record<string, string> = {
    OLLAMA: 'bg-blue-100 text-blue-700',
    LLAMACPP: 'bg-purple-100 text-purple-700',
    GEMINI: 'bg-green-100 text-green-700',
  };
  
  return (
    <div>
      <div 
        onClick={onToggle}
        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{application.job_name}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">
                  {application.company_name || 'Unknown company'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${backendColors[application.backend] || 'bg-gray-100 text-gray-600'}`}>
                  {application.backend}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {application.ats_score && (
              <div className={`px-3 py-1 rounded-lg ${atsColor}`}>
                <span className="font-semibold">{application.ats_score}%</span>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">{formatTimestamp(application.timestamp)}</p>
              <p className="text-xs text-gray-400">{(application.files || []).length} files</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="pt-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Generated Files</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(application.files || []).map(file => (
                <div
                  key={file}
                  className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200"
                >
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{file}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              📁 Location: outputs/{application.folder_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  // Format: YYYYMMDD_HHMMSS -> human readable
  const match = timestamp.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return timestamp;
  
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute)
  );
  
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseTimestamp(timestamp: string): Date {
  const match = timestamp.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return new Date();
  
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

export default ApplicationHistory;
