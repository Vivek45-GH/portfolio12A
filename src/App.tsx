/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/Auth';
import { Navbar } from '@/components/Navbar';
import { Home } from '@/pages/Home';
import { Profile } from '@/pages/Profile';
import { Admin } from '@/pages/Admin';
import { Login } from '@/pages/Login';
import { Gallery } from '@/pages/Gallery';
import { ChatBot } from '@/components/ChatBot';
import { auth, db } from '@/lib/firebase';
import { AlertTriangle } from 'lucide-react';

import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const isConfigured = !!auth && !!db;

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          {!isConfigured && (
            <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Configuration Missing: Please set your Firebase Environment Variables in Netlify.
            </div>
          )}
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/gallery" element={<Gallery />} />
            </Routes>
          </main>
          <ChatBot />
          <footer className="py-8 border-t glass text-center text-sm text-muted-foreground">
            <div className="container mx-auto">
              <p>© 2026 Session 2026-2027 Portfolio. Made with ✨ for the future.</p>
            </div>
          </footer>
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}
