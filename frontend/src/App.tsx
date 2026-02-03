import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileText, PlusCircle, History, User, UserPlus, Sun, Moon, Shield, FolderOpen } from 'lucide-react';
import Dashboard from './components/Dashboard';
import NewApplication from './components/NewApplication';
import ApplicationHistory from './components/ApplicationHistory';
import JobDetail from './components/JobDetail';
import CVManager from './components/CVManager';
import ErrorBoundary from './components/ErrorBoundary';
import { getUsers, createUser, setCurrentUser, getCurrentUser, initTheme, setTheme, Theme } from './api';
import type { User as UserType } from './types';

function App() {
  const location = useLocation();
  const [users, setUsers] = useState<UserType[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>(getCurrentUser());
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setThemeState] = useState<Theme>('light');

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = initTheme();
    setThemeState(initialTheme);
  }, []);

  // Load users on mount
  useEffect(() => {
    getUsers().then(setUsers).catch(console.error);
  }, []);

  // Handle theme toggle
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setThemeState(newTheme);
  }, [theme]);

  // Handle user change
  const handleUserChange = useCallback((userId: string) => {
    setCurrentUser(userId);
    setCurrentUserId(userId);
    setRefreshKey(prev => prev + 1); // Trigger refresh of child components
  }, []);

  // Create new user
  const handleCreateUser = useCallback(async () => {
    if (!newUserName.trim()) return;
    try {
      const user = await createUser(newUserName.trim());
      setUsers(prev => [...prev, user]);
      handleUserChange(user.id);
      setNewUserName('');
      setShowNewUserModal(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  }, [newUserName, handleUserChange]);

  // Get current user name for display
  const currentUserName = users.find(u => u.id === currentUserId)?.name || 'Default User';
  
  const navItems = [
    { path: '/', icon: FileText, label: 'Dashboard' },
    { path: '/new', icon: PlusCircle, label: 'New Application' },
    { path: '/cvs', icon: FolderOpen, label: 'CVs' },
    { path: '/history', icon: History, label: 'History' },
  ];
  
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 dark:bg-slate-950 dark:border-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-slate-300" />
              <span className="text-sm font-semibold text-white tracking-wide">JOB APPLICATION WORKFLOW</span>
            </div>

            {/* Navigation */}
            <nav className="flex">
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center space-x-1.5 px-4 h-12 text-sm transition-colors border-b-2 ${
                      isActive
                        ? 'text-white border-white bg-slate-700/50'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Profile Selector */}
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-400" />
              <select
                value={currentUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewUserModal(true)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="Add new user"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard key={refreshKey} />} />
            <Route path="/new" element={<NewApplication key={refreshKey} />} />
            <Route path="/cvs" element={<CVManager key={refreshKey} />} />
            <Route path="/history" element={<ApplicationHistory key={refreshKey} />} />
            <Route path="/job/:id" element={<JobDetail key={refreshKey} />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span>100% Local</span>
            <span>•</span>
            <span>Your CV never leaves this PC</span>
            <span>•</span>
            <span>{currentUserName}</span>
          </p>
        </div>
      </footer>

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Add New User</h3>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setShowNewUserModal(false); setNewUserName(''); }}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUserName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
