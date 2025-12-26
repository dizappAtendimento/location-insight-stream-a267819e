import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  nome: string | null;
  Email: string | null;
  telefone: string | null;
  statusDisparador: boolean;
  statusExtrator: boolean;
  avatar_url: string | null;
  // Plan info
  dataValidade: string | null;
  dataValidadeExtrator: string | null;
  planoId: number | null;
  planoExtratorId: number | null;
  planoNome: string | null;
  planoExtratorNome: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'saas_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to refresh user data from the server
  const refreshUser = useCallback(async () => {
    try {
      // First, check if there's an active Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      let userId: string | null = null;
      let email: string | null = null;
      let nome: string | null = null;
      let avatar_url: string | null = null;

      if (session?.user) {
        // Use the Supabase Auth session (for Google OAuth users)
        userId = session.user.id;
        email = session.user.email || null;
        nome = session.user.user_metadata?.full_name || session.user.user_metadata?.name || null;
        avatar_url = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
      } else {
        // Fall back to localStorage for password-based users
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!storedUser) return;
        
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser?.id) return;
        
        userId = parsedUser.id;
        email = parsedUser.Email;
        nome = parsedUser.nome;
        avatar_url = parsedUser.avatar_url;
      }

      if (!userId) return;

      // Fetch fresh user data using the sync-oauth-user function
      const { data, error } = await supabase.functions.invoke('sync-oauth-user', {
        body: { userId, email, nome, avatar_url }
      });

      if (!error && data?.user) {
        setUser(data.user);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  }, []);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Listen for Supabase Auth state changes (for Google OAuth)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Sync user with our SAAS_Usuarios table using the correct OAuth ID
        const { data, error } = await supabase.functions.invoke('sync-oauth-user', {
          body: {
            userId: session.user.id,
            email: session.user.email,
            nome: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          }
        });

        if (!error && data?.user) {
          setUser(data.user);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-refresh user data when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        refreshUser();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        refreshUser();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, refreshUser]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { email, password }
      });

      // Check if there's an error in the response data first (for 403 etc)
      if (data?.error) {
        return { error: data.error };
      }

      if (error) {
        console.error('Login error:', error);
        return { error: 'Erro ao conectar ao servidor' };
      }

      if (data.user) {
        setUser(data.user);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        return { error: null };
      }

      return { error: 'Resposta inválida do servidor' };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'Erro inesperado. Tente novamente.' };
    }
  };

  const logout = async () => {
    // Sign out from Supabase Auth (for Google OAuth users)
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
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
