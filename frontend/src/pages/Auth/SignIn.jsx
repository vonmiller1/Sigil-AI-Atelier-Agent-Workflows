import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import AuthCard from '../../components/AuthCard';

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      setSuccess('Successfully signed in! Accessing dashboard...');
      
      // Save JWT token and user info to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Re-enable fields after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard 
        title="Welcome back" 
        subtitle="Sign in to manage your AI agents and custom workflows"
      >
        {/* Error Notification Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-brand bg-sigil-ai-atelier-status-alert-bg border border-sigil-ai-atelier-status-alert-text/10 text-xs font-semibold text-sigil-ai-atelier-status-alert-text flex items-center gap-2 transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-sigil-ai-atelier-status-alert-text animate-pulse"></span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification Alert */}
        {success && (
          <div className="p-3 mb-4 rounded-brand bg-sigil-ai-atelier-status-live-bg border border-sigil-ai-atelier-status-live-text/10 text-xs font-semibold text-sigil-ai-atelier-status-live-text flex items-center gap-2 transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-sigil-ai-atelier-status-live-text animate-pulse"></span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-sigil-ai-atelier-text-primary uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sigil-ai-atelier-text-muted">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="block w-full pl-10 pr-4 py-2.5 bg-white border border-sigil-ai-atelier-border-light rounded-brand text-sm text-sigil-ai-atelier-text-primary placeholder-sigil-ai-atelier-text-muted/60 shadow-brand-input focus:outline-none focus:ring-2 focus:ring-sigil-ai-atelier-blue-500/10 focus:border-sigil-ai-atelier-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-sigil-ai-atelier-text-primary uppercase tracking-wider">
                Password
              </label>
              {/* <Link 
                to="/forgot-password" 
                className="text-xs font-semibold text-sigil-ai-atelier-blue-600 hover:text-sigil-ai-atelier-blue-700 hover:underline transition-colors duration-150"
              >
                Forgot?
              </Link> */}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sigil-ai-atelier-text-muted">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-10 py-2.5 bg-white border border-sigil-ai-atelier-border-light rounded-brand text-sm text-sigil-ai-atelier-text-primary placeholder-sigil-ai-atelier-text-muted/60 shadow-brand-input focus:outline-none focus:ring-2 focus:ring-sigil-ai-atelier-blue-500/10 focus:border-sigil-ai-atelier-blue-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sigil-ai-atelier-text-muted hover:text-sigil-ai-atelier-text-primary transition-colors duration-150"
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-all duration-150 ${
                rememberMe 
                  ? 'bg-sigil-ai-atelier-blue-600 border-sigil-ai-atelier-blue-600 text-white' 
                  : 'bg-white border-sigil-ai-atelier-border-light'
              }`}>
                {rememberMe && (
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-sigil-ai-atelier-text-muted font-medium">
                Keep me signed in on this device
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm rounded-brand shadow-sm transition-all duration-150 ${
              loading 
                ? 'bg-sigil-ai-atelier-bg-sidebar border border-sigil-ai-atelier-border-light text-sigil-ai-atelier-text-muted/50 cursor-not-allowed shadow-none' 
                : 'bg-sigil-ai-atelier-blue-600 hover:bg-sigil-ai-atelier-blue-700 text-white shadow-sigil-ai-atelier-blue-500/10 hover:shadow-md hover:shadow-sigil-ai-atelier-blue-500/15 focus:outline-none focus:ring-2 focus:ring-sigil-ai-atelier-blue-500/20 active:bg-sigil-ai-atelier-blue-700'
            }`}
          >
            <span>{loading ? 'Signing In...' : 'Sign In to Platform'}</span>
            {!loading && <LogIn className="h-4 w-4" />}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-sigil-ai-atelier-border-light"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
            <span className="bg-white px-3 text-sigil-ai-atelier-text-muted text-[10px]">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social SSO Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-sigil-ai-atelier-border-light rounded-brand text-xs font-semibold text-sigil-ai-atelier-text-primary shadow-brand-input hover:bg-sigil-ai-atelier-bg-sidebar transition-colors duration-150"
          >
            {/* Google Icon */}
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.6 2.69v2.23h4.2c2.46-2.27 3.88-5.61 3.88-9.4c0-.75 0-.75-.02-.75z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3c-1.08.72-2.47 1.16-4.08 1.16-3.14 0-5.8-2.11-6.75-4.96H1.05v3.09C3.03 21.3 7.17 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 14.29a7.143 7.143 0 0 1 0-4.58V6.62H1.05a11.94 11.94 0 0 0 0 10.76l4.2-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.17 0 3.03 2.7 1.05 6.62l4.2 3.09c.95-2.85 3.61-4.96 6.75-4.96z"
              />
            </svg>
            <span>Google</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-sigil-ai-atelier-border-light rounded-brand text-xs font-semibold text-sigil-ai-atelier-text-primary shadow-brand-input hover:bg-sigil-ai-atelier-bg-sidebar transition-colors duration-150"
          >
            {/* GitHub Icon */}
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-sigil-ai-atelier-text-muted font-medium">
          New to Sigil AI Atelier?{' '}
          <Link 
            to="/signup" 
            className="font-bold text-sigil-ai-atelier-blue-600 hover:text-sigil-ai-atelier-blue-700 hover:underline transition-colors duration-150"
          >
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};

export default SignIn;
