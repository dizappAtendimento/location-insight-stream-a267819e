import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  nome: string | null;
  Email: string | null;
  telefone: string | null;
  status: boolean | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'saas_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('SAAS_Usuarios')
        .select('id, nome, Email, telefone, status, senha')
        .eq('Email', email)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        return { error: 'Erro ao conectar ao servidor' };
      }

      if (!data) {
        return { error: 'Email não encontrado' };
      }

      if (data.senha !== password) {
        return { error: 'Senha incorreta' };
      }

      if (!data.status) {
        return { error: 'Conta desativada. Entre em contato com o suporte.' };
      }

      const userData: User = {
        id: data.id,
        nome: data.nome,
        Email: data.Email,
        telefone: data.telefone,
        status: data.status,
      };

      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));

      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'Erro inesperado. Tente novamente.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
