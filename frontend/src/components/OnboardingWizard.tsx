import { useState, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, User, FileText, Briefcase, CheckCircle, Upload } from 'lucide-react';
import { updateProfile, renameUser, createCV, setDefaultCV, createSavedJob } from '../api';

interface Props {
  userId: string;
  initialStep: number; // 1=profile, 2=cv, 3=job, 4=done
  onComplete: () => void;
  onUsersUpdated: () => void;
}

const STEPS = [
  { id: 1, label: 'Your Profile', icon: User },
  { id: 2, label: 'Base CV', icon: FileText },
  { id: 3, label: 'First Job', icon: Briefcase },
  { id: 4, label: 'Done', icon: CheckCircle },
];

export default function OnboardingWizard({ userId, initialStep, onComplete, onUsersUpdated }: Props) {
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [headline, setHeadline] = useState('');

  // Step 2 state
  const [cvChoice, setCvChoice] = useState<'upload' | 'profile' | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [listingUrl, setListingUrl] = useState('');

  const advance = () => setStep(s => s + 1);
  const back = () => { setStep(s => s - 1); setError(null); };

  async function submitProfile() {
    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(location.trim() && { location: location.trim() }),
        ...(linkedin.trim() && { linkedin: linkedin.trim() }),
        ...(headline.trim() && { headline: headline.trim() }),
      });
      await renameUser(userId, fullName.trim());
      onUsersUpdated();
      advance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCV() {
    if (!cvChoice) { setError('Please choose an option.'); return; }
    if (cvChoice === 'upload') {
      if (!cvFile) { setError('Please select a file.'); return; }
      setSaving(true);
      setError(null);
      try {
        const stored = await createCV(cvFile, cvFile.name.replace(/\.[^.]+$/, ''));
        await setDefaultCV(stored.id);
        advance();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to upload CV.');
      } finally {
        setSaving(false);
      }
    } else {
      advance();
    }
  }

  async function submitJob() {
    if (!jobTitle.trim() || !company.trim()) {
      setError('Job title and company are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSavedJob({
        job_title: jobTitle.trim(),
        company_name: company.trim(),
        ...(listingUrl.trim() && { listing_url: listingUrl.trim() }),
      });
      advance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save job.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Welcome — let's get you set up
          </h2>
          <button
            onClick={onComplete}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Skip setup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 gap-1">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done ? 'bg-green-500 text-white' :
                  active ? 'bg-blue-600 text-white' :
                  'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'
                }`}>
                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className={`text-xs truncate ${active ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-400'}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 ${done ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-600'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-4 min-h-[280px]">

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Tell us a bit about you. This populates your CV contact header automatically.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jane Smith"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+44 7700 900000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Location</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="London, UK"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">LinkedIn URL</label>
                  <input
                    value={linkedin}
                    onChange={e => setLinkedin(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Headline</label>
                  <input
                    value={headline}
                    onChange={e => setHeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Senior Product Manager"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: CV Foundation */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Every application starts from a base CV. Choose how you want to set yours up.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCvChoice('upload')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    cvChoice === 'upload'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Upload className="w-6 h-6 text-blue-500 mb-2" />
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Upload my CV</div>
                  <div className="text-xs text-slate-500 mt-1">PDF or DOCX — stored as your base CV</div>
                </button>
                <button
                  onClick={() => setCvChoice('profile')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    cvChoice === 'profile'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  <User className="w-6 h-6 text-blue-500 mb-2" />
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Build from Profile</div>
                  <div className="text-xs text-slate-500 mt-1">Add job history in Profile and generate a CV from it</div>
                </button>
              </div>
              {cvChoice === 'upload' && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={e => setCvFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    {cvFile ? cvFile.name : 'Click to choose file...'}
                  </button>
                </div>
              )}
              {cvChoice === 'profile' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  After setup, go to <span className="font-medium">Profile</span> and add your work history, skills, and education.
                  You can then use "Assemble from Profile" when starting any application.
                </p>
              )}
            </div>
          )}

          {/* Step 3: First Saved Job */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                Add the first role you're tracking. You can add more from the Dashboard at any time.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Job title <span className="text-red-500">*</span>
                </label>
                <input
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Senior Product Manager"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Job listing URL (optional)</label>
                <input
                  value={listingUrl}
                  onChange={e => setListingUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
              <CheckCircle className="w-14 h-14 text-green-500" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">You're all set!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Your workspace is ready. Use <span className="font-medium">Dashboard</span> to track jobs,
                <span className="font-medium"> Profile</span> to manage your CV data, and
                <span className="font-medium"> CV Coach</span> to improve your CV quality.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            {step > 1 && step < 4 && (
              <button
                onClick={back}
                disabled={saving}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 3 && (
              <button
                onClick={advance}
                disabled={saving}
                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Skip for now
              </button>
            )}
            {step === 1 && (
              <button
                onClick={submitProfile}
                disabled={saving}
                className="flex items-center gap-1 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Next'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={submitCV}
                disabled={saving}
                className="flex items-center gap-1 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Next'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={submitJob}
                disabled={saving}
                className="flex items-center gap-1 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Job'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 4 && (
              <button
                onClick={onComplete}
                className="px-5 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
