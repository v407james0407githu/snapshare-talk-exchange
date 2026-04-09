import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  is_verified: boolean;
  is_vip: boolean;
  daily_upload_count: number;
  last_upload_date: string | null;
  warning_count: number;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let supabaseClientPromise: Promise<any> | null = null;

async function getSupabase() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('@/integrations/supabase/client').then((module) => module.supabase);
  }
  return supabaseClientPromise;
}

function hasPersistedSession() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;

  try {
    return Object.keys(localStorage).some((key) => {
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) return false;
      const value = localStorage.getItem(key);
      return Boolean(value && value !== 'null');
    });
  } catch {
    return false;
  }
}

function requiresImmediateAuth(pathname: string) {
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/marketplace/create')
  ) {
    return true;
  }

  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const pendingProfileUserId = useRef<string | null>(null);

  const PROFILE_SELECT =
    'id, user_id, username, display_name, avatar_url, bio, phone, is_verified, is_vip, daily_upload_count, last_upload_date, warning_count, is_suspended, suspended_until, suspension_reason, created_at, updated_at';

  const fetchProfile = async (userId: string) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  };

  const scheduleProfileRefresh = (userId: string, immediate = false) => {
    if (pendingProfileUserId.current === userId) return;
    if (profile?.user_id === userId) return;

    pendingProfileUserId.current = userId;
    const run = async () => {
      try {
        const profileData = await fetchProfile(userId);
        setProfile(profileData);
      } finally {
        if (pendingProfileUserId.current === userId) {
          pendingProfileUserId.current = null;
        }
      }
    };

    if (immediate) {
      void run();
      return;
    }

    const schedule =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 150);
    schedule(() => {
      void run();
    });
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let deferredHandle: number | null = null;
    let cleanup: (() => void) | undefined;

    const initAuth = async () => {
      const supabase = await getSupabase();
      if (cancelled) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, currentSession) => {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            scheduleProfileRefresh(currentSession.user.id);
          } else {
            pendingProfileUserId.current = null;
            setProfile(null);
          }

          if (event === 'SIGNED_OUT') {
            setProfile(null);
          }
        }
      );

      cleanup = () => subscription.unsubscribe();

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (cancelled) return;

      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        scheduleProfileRefresh(existingSession.user.id, true);
      }
      setLoading(false);
    };

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const shouldDefer = !requiresImmediateAuth(pathname) && !hasPersistedSession();

    if (shouldDefer) {
      setLoading(false);
      const schedule =
        typeof window !== 'undefined' && 'requestIdleCallback' in window
          ? (cb: () => void) =>
              (window as Window & {
                requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
              }).requestIdleCallback?.(cb, { timeout: 2000 }) ?? window.setTimeout(cb, 1200)
          : (cb: () => void) => window.setTimeout(cb, 1200);

      deferredHandle = schedule(() => {
        void initAuth();
      });
    } else {
      void initAuth();
    }

    return () => {
      cancelled = true;
      if (deferredHandle !== null) {
        window.clearTimeout(deferredHandle);
      }
      cleanup?.();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string, displayName?: string) => {
    const supabase = await getSupabase();
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    toast({
      title: "登入成功！",
      description: "歡迎回來！",
    });

    return { error: null };
  };

  const signOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    setProfile(null);
    toast({
      title: "已登出",
      description: "期待您再次回來！",
    });
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const supabase = await getSupabase();

    const { error } = await supabase.rpc('update_own_profile', {
      _display_name: updates.display_name ?? null,
      _bio: updates.bio ?? null,
      _phone: updates.phone ?? null,
      _avatar_url: updates.avatar_url ?? null,
      _username: updates.username ?? null,
    });

    if (error) {
      return { error };
    }

    await refreshProfile();
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
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
