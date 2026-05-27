import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isAdmin, isReadOnlyAdmin } from '../lib/supabaseClient';

const SupabaseAuthContext = createContext({
  user: null,
  session: null,
  accessToken: null,
  loading: true,
  isAdmin: false,
  isReadOnlyAdmin: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const removeHashFragment = () => {
      if (typeof window === 'undefined') return;
      const { pathname, search, hash } = window.location;
      if (!hash) return;
      window.history.replaceState(window.history.state, '', `${pathname}${search}`);
    };

    const initializeSession = async () => {
      if (!supabase) {
        if (isMounted) setLoading(false);
        return;
      }

      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Failed to establish Supabase session from redirect hash', error);
            } else if (data?.session && isMounted) {
              setSession(data.session);
              setUser(data.session.user ?? null);
            }
          }
        } catch (err) {
          console.error('Error processing Supabase auth redirect', err);
        } finally {
          removeHashFragment();
          // Redirect to saved path if OAuth landed on the wrong page
          const savedPath = localStorage.getItem('auth_redirect_path');
          if (savedPath && savedPath !== window.location.pathname) {
            localStorage.removeItem('auth_redirect_path');
            window.location.replace(savedPath);
            return;
          }
          localStorage.removeItem('auth_redirect_path');
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        removeHashFragment();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (redirectTo) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Build the full redirect URL including the path
    const origin = window.location.origin;
    const redirectUrl = redirectTo || `${origin}/calendar`;

    // Save intended destination so we can restore it after OAuth callback
    try {
      const dest = redirectTo ? new URL(redirectTo).pathname : window.location.pathname;
      localStorage.setItem('auth_redirect_path', dest);
    } catch (_e) {
      localStorage.setItem('auth_redirect_path', window.location.pathname);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    accessToken: session?.access_token || null,
    loading,
    isAdmin: user?.email ? isAdmin(user.email) : false,
    isReadOnlyAdmin: user?.email ? isReadOnlyAdmin(user.email) : false,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
