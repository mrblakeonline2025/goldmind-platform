
import React, { useState } from 'react';
import { PlatformSettings, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface LoginProps {
  onLoginSuccess: () => void;
  settings: PlatformSettings;
  onGoToApply?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, settings, onGoToApply }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [yearGroup, setYearGroup] = useState('Year 11');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    } else {
      onLoginSuccess();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: parentName,
            role: UserRole.STUDENT // Default to student role for direct account creation
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Account creation failed.");

      // 2. Profile Creation (usually triggered but we ensure naming is set)
      const { error: profileError } = await supabase.from('profiles').update({
        name: studentName || parentName,
        role: UserRole.STUDENT 
      }).eq('id', authData.user.id);

      if (profileError) console.warn("Profile update delay:", profileError);

      onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(`Instructions sent to your email.`);
      setTimeout(() => { setMode('login'); setSuccess(''); }, 5000);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-brand-grey flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/10 blur-[120px] rounded-full -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full -ml-64 -mb-64"></div>
      </div>

      <div role="main" className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 relative z-10 animate-in zoom-in-95 duration-500 my-10">
        <div className="flex justify-center mb-8">
          <Logo url={settings.logoUrl} size="lg" companyName={settings.companyName} />
        </div>

        {mode === 'login' && (
          <form aria-labelledby="login-title" onSubmit={handleLogin} className="space-y-6">
            <div className="text-center mb-6">
              <h2 id="login-title" className="text-2xl font-black text-brand-grey uppercase tracking-tight">Portal Sign In</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Academic Management</p>
            </div>

            {error && <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs font-bold text-red-600">{error}</div>}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" required />
              </div>
            </div>

            <div className="flex justify-between items-center px-2">
               <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-brand-grey">Forgot Password?</button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-brand-grey text-white font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all">
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
            
            <div className="text-center pt-4 space-y-3">
                <button type="button" onClick={() => setMode('signup')} className="text-[10px] font-black text-gold uppercase tracking-[0.2em] hover:text-brand-grey block mx-auto">
                    New Student? Create Account
                </button>
                <button type="button" onClick={onGoToApply} className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-brand-grey">
                    Apply to Tutor
                </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-brand-grey uppercase tracking-tight leading-none mb-1">New Registration</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Step 1 of Onboarding</p>
            </div>

            {error && <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs font-bold text-red-600">{error}</div>}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Full Name</label>
                <input required type="text" value={parentName} onChange={e => setParentName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Set Password</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" />
              </div>
              <div className="h-px bg-gray-100 my-2"></div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Full Name</label>
                <input required type="text" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gold text-brand-grey font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-brand-grey hover:text-white transition-all">
              {loading ? 'Creating...' : 'Register & Continue'}
            </button>
            
            <button type="button" onClick={() => setMode('login')} className="w-full text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-brand-grey pt-2">
                Already have an account? Sign In
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-brand-grey uppercase tracking-tight">Recovery</h2>
              <p className="text-sm text-gray-500 font-medium">Instructions will be sent via email.</p>
            </div>
            {success && <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-xs font-bold text-green-600">{success}</div>}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gold text-brand-grey font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-brand-grey hover:text-white transition-all">
              {loading ? 'Requesting...' : 'Send Link'}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-brand-grey mt-4">Back to Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
