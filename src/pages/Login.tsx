import React, { useState } from 'react';
import { useAuth } from '@/components/Auth';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function Login() {
  const { user, isAdmin, login, loginWithEmail, register, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  if (loading) return null;
  if (user && isAdmin) return <Navigate to="/admin" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      if (isSignUp) {
        await register(email, password);
        toast.success("Account created successfully!");
      } else {
        await loginWithEmail(email, password);
        toast.success("Welcome back!");
      }
      navigate(isAdmin ? '/admin' : '/');
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.code === 'auth/user-not-found') {
        toast.error("User not found. Please check your email or sign up.");
      } else if (error.code === 'auth/wrong-password') {
        toast.error("Incorrect password.");
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error("This email is already registered. Try logging in.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password should be at least 6 characters.");
      } else {
        toast.error(error.message || "Authentication failed.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-primary/5 to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass border-primary/20 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardHeader className="space-y-1 text-center pt-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              {isSignUp ? 'Create Account' : 'Admin Portal'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp ? 'Join the session 2026-2027' : 'Enter your credentials to access the command center'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 glass border-primary/10 h-12"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 glass border-primary/10 h-12"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Access Dashboard'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-primary/10 text-center space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                Student Access
              </p>
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl gap-2 glass border-primary/10 hover:bg-primary/5"
                onClick={async () => {
                  try {
                    await login();
                    toast.success("Welcome, Student!");
                    navigate('/');
                  } catch (error: any) {
                    console.error("Google Login Error:", error);
                    toast.error("Google login failed. " + (error.message || ""));
                  }
                }}
              >
                <img src="https://www.google.com/favicon.ico" className="h-4 w-4" alt="Google" />
                Continue with Google
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Secure Environment • Admin Access Required for Dashboard
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
