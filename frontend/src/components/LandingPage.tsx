import { useState } from 'react';
import {
  LayoutDashboard, Users, MessageCircle, Calendar, BarChart3, Shield,
  QrCode, Briefcase, FileText, ArrowRight, CheckCircle, Star, Github,
} from 'lucide-react';
import { AuthPage } from './AuthPage';
import { api, type User } from '../services/api';

const FEATURES = [
  { icon: LayoutDashboard, title: 'Kanban Boards', desc: 'Drag-and-drop task management with 5-column pipeline. Group tasks by module, date, and assignee.', color: 'bg-indigo-500' },
  { icon: Users, title: 'Team Collaboration', desc: 'Real-time chat with file sharing, online presence, and delivery receipts. Project-scoped rooms.', color: 'bg-blue-500' },
  { icon: Calendar, title: 'Attendance System', desc: 'QR code clock-in/out with HMAC security, phone IVR, and geofence validation.', color: 'bg-green-500' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'GitHub-style contribution graphs, CSV exports, and team performance dashboards.', color: 'bg-purple-500' },
  { icon: Shield, title: 'Permissions & Security', desc: '4-level role inheritance, admin guards, encrypted payloads, and session management.', color: 'bg-red-500' },
  { icon: QrCode, title: 'Leave Management', desc: 'Leave requests with approval workflow, balance tracking, and team calendar.', color: 'bg-amber-500' },
];

const STATS = [
  { value: '27+', label: 'Database Entities', icon: FileText },
  { value: '30+', label: 'API Endpoints', icon: ArrowRight },
  { value: '6', label: 'Core Modules', icon: Briefcase },
  { value: '100%', label: 'TypeScript', icon: Star },
];

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  const handleAuth = (u: User) => {
    // This won't be called since LandingPage is rendered outside the auth flow
    // The parent handles auth navigation
  };

  if (showAuth) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">ipfundo</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAuth(true)} className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 font-medium">Sign In</button>
          <button onClick={() => setShowAuth(true)} className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 md:py-28 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
          <Star className="w-3.5 h-3.5" /> All-in-one project management platform
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Manage projects, teams, and{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">attendance</span>{' '}
          in one place
        </h1>
        <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          ipfundo combines kanban task management, real-time chat, QR attendance tracking,
          leave management, and team analytics — everything your company needs to stay organized.
        </p>
        <div className="mt-10 flex items-center gap-4 justify-center">
          <button onClick={() => setShowAuth(true)} className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900 transition-all">
            Get Started Free
          </button>
          <button className="px-8 py-3.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            View Demo
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything you need</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">Six powerful modules working together seamlessly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700 hover:shadow-lg transition-shadow group">
                <div className={`w-10 h-10 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-indigo-600 dark:bg-indigo-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to streamline your workflow?</h2>
          <p className="text-indigo-200 mb-8">Join teams already using ipfundo for project management, attendance, and collaboration.</p>
          <button onClick={() => setShowAuth(true)} className="px-8 py-3.5 bg-white text-indigo-600 rounded-xl text-base font-semibold hover:bg-indigo-50 transition-all shadow-lg">
            Get Started — It's Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t dark:border-gray-800 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} ipfundo. Built for teams that get things done.
      </footer>
    </div>
  );
}
