'use client';

import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { authAtom, loginActionAtom, logoutActionAtom } from '@/store/atoms';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Loader2, Sparkles, Zap, Image, Rocket, Crown, Shield, Palette } from 'lucide-react';
import { api } from '@/lib/api';
import { Loader } from '@/components/ui/loader';

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
            console.log('Token validation failed, clearing auth state');
            logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Clear auth state and show login form
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center animate-scale-in" suppressHydrationWarning>
          <div className="mb-8 animate-float">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-6 animate-glow">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Thumbnail Generator Pro
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Initializing your workspace...
            </p>
          </div>

          {/* Outstanding Animated Loader */}
          <div className="flex flex-col items-center space-y-6 animate-slide-in-bottom">
            <div className="flex items-center space-x-4">
              <Loader variant="gradient" size="lg" />
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>

            {/* Feature indicators with subtle animations */}
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="flex items-center gap-2 text-slate-400 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <Zap className="h-4 w-4 text-blue-400" />
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>AI Enhanced</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
                <Rocket className="h-4 w-4 text-indigo-400" />
                <span>High Quality</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 animate-fade-in-up" style={{ animationDelay: '1.1s' }}>
                <Image className="h-4 w-4 text-green-400" />
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4" suppressHydrationWarning>
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Brand & Features */}
            <div className="text-center lg:text-left">
              {/* Professional Header */}
              <div className="mb-8">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4">
                  Thumbnail Generator PRO
                </h1>
                <p className="text-xl text-slate-300 mb-8 max-w-lg mx-auto lg:mx-0">
                  Transform your content with AI-powered thumbnail generation. Create stunning visuals that captivate your audience.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl mb-3 border border-blue-500/30">
                    <Zap className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Lightning Fast</h3>
                  <p className="text-slate-300 text-sm">Process files in seconds</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl mb-3 border border-purple-500/30">
                    <Image className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">High Quality</h3>
                  <p className="text-slate-300 text-sm">Crystal clear thumbnails</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl mb-3 border border-pink-500/30">
                    <Sparkles className="h-6 w-6 text-pink-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">AI Enhanced</h3>
                  <p className="text-slate-300 text-sm">Smart processing</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl mb-3 border border-green-500/30">
                    <Rocket className="h-6 w-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Multiple Formats</h3>
                  <p className="text-slate-300 text-sm">Images & videos</p>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      <Dashboard />
    </div>
  );
}
