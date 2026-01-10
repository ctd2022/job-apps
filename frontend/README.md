# Job Application Workflow - Frontend

A React-based web interface for the Job Application Workflow system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Backend server running on http://localhost:8000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

### Running with Backend

Make sure the FastAPI backend is running first:

```powershell
# Terminal 1: Start backend
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Start frontend
cd frontend
npm run dev
```

## 📦 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons

## 🗂️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx        # Main dashboard with stats & jobs
│   │   ├── NewApplication.tsx   # File upload & job creation
│   │   └── ApplicationHistory.tsx # Past applications browser
│   ├── api.ts                   # API client for FastAPI backend
│   ├── types.ts                 # TypeScript type definitions
│   ├── App.tsx                  # Main app with routing
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🎯 Features

### Dashboard
- View backend status (Ollama, Llama.cpp, Gemini)
- Monitor active job progress in real-time
- Quick stats (total applications, average ATS score)
- Recent applications list

### New Application
- Drag & drop file upload for CV and job description
- Backend selection (Ollama, Llama.cpp, Gemini)
- Model selection within each backend
- ATS optimization toggle
- Real-time progress tracking
- View generated files on completion

### Application History
- Browse all past applications
- Search by job name or company
- Filter by backend
- Sort by date or ATS score
- View file details in expandable rows

## 🔧 Configuration

### API Proxy
The Vite dev server proxies `/api` requests to the backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

### Tailwind
Customizations can be added to `tailwind.config.js`.

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🛠️ Development Notes

### Adding New Components
1. Create component in `src/components/`
2. Add route in `App.tsx` if needed
3. Import and use in parent component

### API Integration
All API calls go through `src/api.ts`. Types are defined in `src/types.ts`.

Example:
```typescript
import { getApplications } from '../api';
import type { Application } from '../types';

const apps = await getApplications();
```

### Polling for Job Status
Use `pollJobUntilComplete` for real-time progress:

```typescript
const completedJob = await pollJobUntilComplete(
  jobId,
  (job) => console.log(`Progress: ${job.progress}%`),
  2000 // poll every 2 seconds
);
```

## 🐛 Troubleshooting

### "Failed to connect to backend"
- Ensure backend is running on port 8000
- Check CORS settings in backend

### Styles not loading
- Run `npm install` again
- Check PostCSS/Tailwind config

### TypeScript errors
- Run `npm install` to ensure types are installed
- Check `tsconfig.json` for path issues

## 📄 License

Part of the Job Application Workflow project.
