import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useLocation, Navigate, Outlet, useNavigate, useSearchParams } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { data?: Record<string, any> }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// List of routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/studios',
  '/booking/success',
  /^\/studios\/[\w-]+$/,  // Studio details page
  /^\/booking\/[\w-]+$/,  // Booking page
];

function isPublicRoute(path: string): boolean {
  return publicRoutes.some(route => 
    typeof route === 'string' 
      ? route === path 
      : route.test(path)
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user && !isPublicRoute(location.pathname)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Clear any stale session data first
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setUser(null);
          if (!isPublicRoute(location.pathname)) {
            navigate('/login', { 
              state: { from: location },
              search: `?redirectTo=${encodeURIComponent(location.pathname)}`
            });
          }
          return;
        }

        setUser(session?.user ?? null);
        
        // If we have a session but we're on login/signup, redirect to dashboard
        if (session?.user && (location.pathname === '/login' || location.pathname === '/signup')) {
          const redirectTo = searchParams.get('redirectTo');
          navigate(redirectTo || '/dashboard');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }

    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Handle auth state changes
      if (!session?.user && !isPublicRoute(location.pathname)) {
        navigate('/login', { 
          state: { from: location },
          search: `?redirectTo=${encodeURIComponent(location.pathname)}`
        });
      } else if (session?.user && (location.pathname === '/login' || location.pathname === '/signup')) {
        const redirectTo = searchParams.get('redirectTo');
        navigate(redirectTo || '/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location, searchParams]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, options?: { data?: Record<string, any> }) => {
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: options?.data
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Sign up error:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      // First clear all auth-related storage
      const clearStorage = () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          // Clear any Supabase-specific items
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.error('Error clearing storage:', e);
        }
      };

      // Clear storage first
      clearStorage();

      // Then attempt to sign out from Supabase
      await supabase.auth.signOut().catch(e => {
        // Log but don't throw - we want to continue with local cleanup
        console.warn('Supabase sign out failed:', e);
      });
    } finally {
      // Always reset state and redirect, regardless of what happened above
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
