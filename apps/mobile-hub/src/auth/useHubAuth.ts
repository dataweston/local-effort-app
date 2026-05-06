import { useCallback, useEffect, useMemo, useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../config";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

type AuthStatus = "loading" | "signed_out" | "signed_in" | "unconfigured";

function redirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "localefforthub",
    path: "auth/callback",
  });
}

async function establishSessionFromUrl(url: string) {
  if (!supabase) throw new Error("Supabase is not configured");

  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const code = parsed.searchParams.get("code") || hash.get("code");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  return null;
}

export function useHubAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? "loading" : "unconfigured");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus("unconfigured");
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user || null);
      setStatus(data.session ? "signed_in" : "signed_out");
    }).catch((err) => {
      if (!mounted) return;
      setError(err?.message || "Unable to load auth session");
      setStatus("signed_out");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setStatus(nextSession ? "signed_in" : "signed_out");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");
    setError(null);
    const callbackUrl = redirectUri();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
      },
    });
    if (oauthError) throw oauthError;
    if (!data?.url) throw new Error("Supabase did not return an OAuth URL");

    const result = await WebBrowser.openAuthSessionAsync(data.url, callbackUrl);
    if (result.type !== "success") return null;

    const nextSession = await establishSessionFromUrl(result.url);
    setSession(nextSession);
    setUser(nextSession?.user || null);
    setStatus(nextSession ? "signed_in" : "signed_out");
    return nextSession;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured");
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    setSession(data.session);
    setUser(data.user);
    setStatus(data.session ? "signed_in" : "signed_out");
    return data.session;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null);
    setUser(null);
    setStatus("signed_out");
  }, []);

  return useMemo(() => ({
    status,
    user,
    session,
    accessToken: session?.access_token || null,
    error,
    isConfigured: isSupabaseConfigured,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    setError,
  }), [error, session, signInWithEmail, signInWithGoogle, signOut, status, user]);
}
