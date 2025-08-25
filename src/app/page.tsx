'use client';

import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { authAtom, loginActionAtom, logoutActionAtom } from '@/store/atoms';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { Loader2, Sparkles, Zap, Image, Rocket } from 'lucide-react';
import { api } from '@/lib/api';

export default function Home() {
  const [auth] = useAtom(authAtom);
  const [, login] = useAtom(loginActionAtom);
  const [, logout] = useAtom(logoutActionAtom);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (auth.token) {
        try {
          const result = await api.auth.getMe(auth.token);

          if (!result.success) {
            // Token is invalid, clear auth state
            logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [auth.token, logout]);

  const handleAuthSuccess = (user: any, token: string) => {
    login({ user, token });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Professional Loading Card */}
        <div className="relative z-10 card-professional p-12 max-w-md mx-4">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Enhanced Loading Icon */}
            <div className="relative mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/25 animate-glow">
                <Image className="h-12 w-12 text-white" />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 opacity-20 animate-ping"></div>
            </div>
            
            {/* Professional Loading Text */}
            <h2 className="text-3xl font-bold gradient-text mb-3">
              Thumbnail Generator Pro
            </h2>
            <p className="text-slate-600 text-lg mb-6">
              Initializing your professional workspace...
            </p>
            
            {/* Enhanced Loading Animation */}
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            
            {/* Professional Features Preview */}
            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>AI Enhanced</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Rocket className="h-4 w-4 text-indigo-600" />
                <span>High Quality</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Image className="h-4 w-4 text-green-600" />
                <span>Multiple Formats</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <>
        {/* Enhanced Auth Form with Professional Layout */}
        {showRegister ? (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Dashboard />
      <Toaster />
    </>
  );
}
