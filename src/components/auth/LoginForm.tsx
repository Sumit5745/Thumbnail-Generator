'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, Zap, Sparkles, Shield, User, Crown } from 'lucide-react';
import { api } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: (user: any, token: string) => void;
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('🚀 Login form submitted with data:', data);
    setIsLoading(true);

    try {
      console.log('📡 Calling API login...');
      const result = await api.auth.login(data);
      console.log('✅ API login response:', result);

      if (result.success && result.data) {
        toast.success('Welcome back! 🎉');
        onSuccess(result.data.user, result.data.token);
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Professional Header */}
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 animate-glow">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 opacity-20 animate-ping"></div>
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-3">
            Welcome Back
          </h1>
          <p className="text-slate-600 text-lg mb-2">
            Sign in to your professional workspace
          </p>
          <p className="text-slate-500 text-sm">
            Create stunning thumbnails with advanced AI technology
          </p>
        </div>

        {/* Professional Features Preview */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
            <Zap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">Fast Processing</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
            <Sparkles className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">AI Enhanced</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
            <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">Secure</p>
          </div>
        </div>

        {/* Professional Login Card */}
        <div className="card-professional p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-3">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your professional email"
                  {...register('email')}
                  className={`w-full pl-12 pr-4 py-4 bg-white/50 border-2 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all duration-300 ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500 bg-red-50/50' 
                      : 'border-slate-200 focus:border-blue-500 focus:bg-white/80 hover:border-slate-300'
                  }`}
                />
              </div>
              {errors.email && (
                <div className="flex items-center gap-2 text-red-500 text-sm animate-in slide-in-from-left-1 duration-200">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  {errors.email.message}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your secure password"
                  {...register('password')}
                  className={`w-full pl-12 pr-12 py-4 bg-white/50 border-2 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all duration-300 ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500 bg-red-50/50' 
                      : 'border-slate-200 focus:border-blue-500 focus:bg-white/80 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-2 text-red-500 text-sm animate-in slide-in-from-left-1 duration-200">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  {errors.password.message}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 btn-primary"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing you in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <User className="h-5 w-5" />
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </form>

          {/* Professional Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/70 text-slate-500 font-medium">New to Thumbnail Generator Pro?</span>
            </div>
          </div>

          {/* Switch to Register */}
          <button
            onClick={onSwitchToRegister}
            className="w-full py-4 btn-secondary rounded-2xl"
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span>Create Professional Account</span>
            </div>
          </button>
        </div>

        {/* Professional Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
            © 2024 Thumbnail Generator Pro. Professional image processing platform.
          </p>
        </div>
      </div>
    </div>
  );
}
