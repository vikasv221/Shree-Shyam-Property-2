import React, { useState } from 'react';
import { X, Phone, User as UserIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface LoginModalProps {
  onClose: () => void;
  onUserLogin: (user: { uid: string; name: string; phone: string }) => void;
}

export default function LoginModal({ onClose, onUserLogin }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setError('कृपया अपना नाम और मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (phone.length < 10) {
      setError('कृपया सही मोबाइल नंबर दर्ज करें।');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const userData = {
        uid,
        name,
        phone,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), userData);
      
      // Save to local storage
      localStorage.setItem('shree_shyam_user', JSON.stringify(userData));
      
      onUserLogin(userData);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError('लॉगिन विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== 'vr6473680@gmail.com') {
        setError('Unauthorized Admin Email. Access Denied.');
        await auth.signOut();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("Admin login failed:", err);
      setError('Admin login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-100 animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-600"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-10 pb-6 text-center">
          <h2 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight mb-2">Welcome Back</h2>
          <p className="text-zinc-500 text-sm">Login to post your property or access dashboard.</p>
        </div>

        <div className="flex border-b border-zinc-100">
          <button 
            onClick={() => setActiveTab('user')}
            className={`flex-1 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'user' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'}`}
          >
            User Login
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'admin' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'}`}
          >
            Admin Login
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-sm font-medium">
              {error}
            </div>
          )}

          {activeTab === 'user' ? (
            <form onSubmit={handleUserLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Full Name (पूरा नाम)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Mobile Number (मोबाइल नंबर)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-zinc-400" />
                  </div>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-12 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-amber-500 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-70 mt-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserIcon className="w-5 h-5" />}
                Login & Continue
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-zinc-600 text-sm mb-6">Admin access is restricted to authorized personnel only.</p>
              <button 
                onClick={handleAdminLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-zinc-200 hover:border-amber-500 hover:bg-amber-50 text-zinc-800 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-sm disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Sign in with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
