import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileText, PlusCircle, History, Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import NewApplication from './components/NewApplication';
import ApplicationHistory from './components/ApplicationHistory';

function App() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: FileText, label: 'Dashboard' },
    { path: '/new', icon: PlusCircle, label: 'New Application' },
    { path: '/history', icon: History, label: 'History' },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Job Application Workflow</h1>
                <p className="text-sm text-gray-500">AI-Powered CV & Cover Letter Generator</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewApplication />} />
          <Route path="/history" element={<ApplicationHistory />} />
        </Routes>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            100% Local • Your data never leaves your machine • Powered by Ollama/Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
