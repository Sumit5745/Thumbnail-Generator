'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, User, Mail, Lock, UserPlus, Shield, Sparkles, Crown, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface RegisterFormProps {
  onSuccess: (user: any, token: string) => void;
  onSwitchToLogin: () => void;
}

// Password validation function to match backend requirements
const validatePassword = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]); // Show first error
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await api.auth.register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.success && response.data) {
        toast.success('Account created successfully!');
        onSuccess(response.data.user, response.data.token);
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      // Handle different error types
      let errorMessage = 'Registration failed';

      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error) {
        errorMessage = error.error;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
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
            Join Pro Platform
          </h1>
          <p className="text-slate-600 text-lg mb-2">
            Create your professional account today
          </p>
          <p className="text-slate-500 text-sm">
            Access advanced thumbnail generation tools
          </p>
        </div>

        {/* Professional Features Preview */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
            <Sparkles className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">AI Powered</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
            <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">Secure</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
            <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">Professional</p>
          </div>
        </div>
      
        {/* Professional Registration Card */}
        <Card className="card-professional">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-4 shadow-lg">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-text">
              Create Account
            </CardTitle>
            <CardDescription className="text-slate-600">
              Join Thumbnail Generator Pro today
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-white/50"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your professional email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-white/50"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-white/50"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-white/50"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Professional Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Professional Account
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={onSwitchToLogin}
                  className="text-slate-600 hover:text-blue-600"
                  disabled={isLoading}
                >
                  Already have an account? Sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
