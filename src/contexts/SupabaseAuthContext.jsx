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
  updatePassword: async () => {},
  isPasswordRecovery: false,
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const savedDestination = () => {
      if (typeof window === 'undefined') return null;
      try {
        const saved = window.localStorage.getItem('auth_redirect_path');
        if (!saved) return null;
        const parsed = new URL(saved, window.location.origin);
        if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/')) return null;
        return `${parsed.pathname}${parsed.search}`;
      } catch (_error) {
        return null;
      }
    };

    const clearSavedDestination = () => {
      try { window.localStorage.removeItem('auth_redirect_path'); } catch (_error) { /* no-op */ }
    };

    const restoreDestination = (fallback = null) => {
      if (typeof window === 'undefined') return false;
      const destination = savedDestination() || fallback;
      clearSavedDestination();
      if (!destination) return false;
      const current = `${window.location.pathname}${window.location.search}`;
      if (destination === current) return false;
      window.location.replace(destination);
      return true;
    };

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

      const hashParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
        : new URLSearchParams();
      const queryParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      const hasHashSession = hashParams.has('access_token');
      const hasCodeSession = queryParams.has('code');
      const authType = hashParams.get('type') || queryParams.get('type');
      const isAuthCallback = hasHashSession || hasCodeSession;

      if (isAuthCallback) {
        try {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (authType === 'recovery' && isMounted) {
            setIsPasswordRecovery(true);
          }

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
          } else if (hasCodeSession && typeof supabase.auth.exchangeCodeForSession === 'function') {
            const { data, error } = await supabase.auth.exchangeCodeForSession(queryParams.get('code'));
            if (error) throw error;
            if (data?.session && isMounted) {
              setSession(data.session);
              setUser(data.session.user ?? null);
            }
          }
        } catch (err) {
          console.error('Error processing Supabase auth redirect', err);
        } finally {
          removeHashFragment();
          if (hasCodeSession) {
            const cleanQuery = new URLSearchParams(window.location.search);
            ['code', 'type', 'error', 'error_code', 'error_description'].forEach((key) => cleanQuery.delete(key));
            const suffix = cleanQuery.toString() ? `?${cleanQuery.toString()}` : '';
            window.history.replaceState(window.history.state, '', `${window.location.pathname}${suffix}`);
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        const callbackFallback = authType === 'recovery' || authType === 'magiclink' ? '/hub' : null;
        if (restoreDestination(callbackFallback)) return;
      } else if (!isAuthCallback) {
        clearSavedDestination();
      }
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

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

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

    const origin = window.location.origin;
    let parsedDestination;
    try {
      parsedDestination = new URL(
        redirectTo || `${window.location.pathname}${window.location.search}`,
        origin,
      );
      if (parsedDestination.origin !== origin) throw new Error('Cross-origin auth redirect is not allowed');
    } catch (_error) {
      parsedDestination = new URL('/hub', origin);
    }
    const redirectUrl = parsedDestination.toString();
    const savedPath = `${parsedDestination.pathname}${parsedDestination.search}`;

    try {
      window.localStorage.setItem('auth_redirect_path', savedPath);
    } catch (_error) { /* OAuth can still continue without storage */ }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: { prompt: 'select_account' },
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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setIsPasswordRecovery(false);
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
    updatePassword,
    isPasswordRecovery,
    signOut,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
