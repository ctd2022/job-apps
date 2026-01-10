import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  TrendingUp,
  Briefcase,
  Server
} from 'lucide-react';
import { getHealth, getJobs, getApplications } from '../api';
import type { Job, Application, HealthStatus } from '../types';

function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadData();
    
    // Poll for job updates every 3 seconds
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);
  
  async function loadData() {
    try {
      const [healthData, jobsData, appsData] = await Promise.all([
        getHealth(),
        getJobs(),
        getApplications(),
      ]);
      setHealth(healthData);
      // Handle various response formats - could be array or {jobs: [...]}
      setJobs(Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []));
      setApplications(Array.isArray(appsData) ? appsData : (appsData?.applications || []));
      setError(null);
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to connect to backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  }
  
  const activeJobs = (jobs || []).filter(j => j.status === 'processing' || j.status === 'pending');
  const recentApps = (applications || []).slice(0, 5);
  
  // Calculate stats
  const totalApps = (applications || []).length;
  const appsWithScore = (applications || []).filter(a => a.ats_score);
  const avgAtsScore = appsWithScore.length > 0
    ? Math.round(appsWithScore.reduce((sum, a) => sum + (a.ats_score || 0), 0) / appsWithScore.length)
    : 0;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <XCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Connection Error</h3>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              Start the backend: <code className="bg-red-100 px-2 py-1 rounded">python -m uvicorn backend.main:app --reload</code>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label="Total Applications"
          value={totalApps}
          color="indigo"
        />
        <StatCard
          icon={TrendingUp}
          label="Average ATS Score"
          value={`${avgAtsScore}%`}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Active Jobs"
          value={activeJobs.length}
          color="yellow"
        />
        <StatCard
          icon={Server}
          label="Backends Available"
          value={health?.backends ? Object.values(health.backends).filter(Boolean).length : 0}
          color="purple"
        />
      </div>
      
      {/* Backend Status */}
      {health?.backends && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Backend Status</h3>
          <div className="flex space-x-4">
            <BackendBadge name="Ollama" available={health.backends.ollama ?? false} />
            <BackendBadge name="Llama.cpp" available={health.backends.llamacpp ?? false} />
            <BackendBadge name="Gemini" available={health.backends.gemini ?? false} />
          </div>
        </div>
      )}
      
      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activeJobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Ready to apply?</h2>
            <p className="text-indigo-100 mt-1">
              Upload your CV and job description to generate tailored application materials.
            </p>
          </div>
          <Link
            to="/new"
            className="flex items-center space-x-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Application</span>
          </Link>
        </div>
      </div>
      
      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
          <Link to="/history" className="text-sm text-indigo-600 hover:text-indigo-800">
            View all →
          </Link>
        </div>
        {recentApps.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No applications yet. Create your first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentApps.map(app => (
              <ApplicationRow key={app.folder_name} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'indigo' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
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

function BackendBadge({ name, available }: { name: string; available: boolean }) {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm ${
      available 
        ? 'bg-green-100 text-green-700' 
        : 'bg-gray-100 text-gray-500'
    }`}>
      {available ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span>{name}</span>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-50',
    processing: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  };
  
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
            {job.status === 'processing' && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
            {job.status}
          </span>
          <span className="text-sm text-gray-500">{job.company_name || 'Unknown company'}</span>
        </div>
        <span className="text-sm text-gray-400">{job.backend}</span>
      </div>
      
      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">{job.stage}</span>
          <span className="text-gray-500">{job.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  const atsColor = application.ats_score 
    ? application.ats_score >= 80 
      ? 'text-green-600' 
      : application.ats_score >= 60 
        ? 'text-yellow-600' 
        : 'text-red-600'
    : 'text-gray-400';
  
  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{application.job_name}</p>
            <p className="text-sm text-gray-500">
              {application.company_name || 'Unknown company'} • {application.backend}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          {application.ats_score && (
            <div className="text-right">
              <p className={`text-lg font-semibold ${atsColor}`}>{application.ats_score}%</p>
              <p className="text-xs text-gray-500">ATS Score</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm text-gray-500">{application.timestamp}</p>
            <p className="text-xs text-gray-400">{(application.files || []).length} files</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
