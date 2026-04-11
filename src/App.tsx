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
import { ChatBot } from '@/components/ChatBot';

import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
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
