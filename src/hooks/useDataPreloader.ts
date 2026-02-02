import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

interface CacheEntry {
  data: any;
  timestamp: number;
}

// Cache em memória para acesso instantâneo
const memoryCache: Record<string, CacheEntry> = {};

export const getCacheKey = (type: string, userId: string) => `${type}_${userId}`;

export const getFromCache = (key: string): any | null => {
  // Primeiro tenta memória (mais rápido)
  const memEntry = memoryCache[key];
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL) {
    return memEntry.data;
  }
  
  // Depois tenta sessionStorage
  try {
    const stored = sessionStorage.getItem(key);
    const time = sessionStorage.getItem(`${key}_time`);
    if (stored && time && Date.now() - parseInt(time) < CACHE_TTL) {
      const data = JSON.parse(stored);
      // Salva em memória para próximo acesso
      memoryCache[key] = { data, timestamp: parseInt(time) };
      return data;
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }
  return null;
};

export const setToCache = (key: string, data: any) => {
  const timestamp = Date.now();
  memoryCache[key] = { data, timestamp };
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(`${key}_time`, timestamp.toString());
  } catch (e) {
    console.error('Cache write error:', e);
  }
};

// Track if preload is already running to prevent duplicate calls
let isPreloading = false;

export const preloadUserData = async (userId: string) => {
  if (!userId || isPreloading) return;
  
  // Check if we already have valid cache
  const hasValidCache = getFromCache(getCacheKey('conexoes', userId));
  if (hasValidCache) {
    console.log('[Preloader] Using cached data');
    return;
  }
  
  isPreloading = true;
  console.log('[Preloader] Starting data preload for user:', userId);
  const startTime = Date.now();
  
  try {
    // Carregar tudo em paralelo com AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const [connectionsRes, listasRes, disparosRes] = await Promise.all([
      supabase.functions.invoke('evolution-api', {
        body: { action: 'list-user-instances', userId }
      }),
      supabase.functions.invoke('disparos-api', {
        body: { action: 'get-listas', userId }
      }),
      supabase.functions.invoke('disparos-api', {
        body: { action: 'get-disparos', userId }
      })
    ]);
    
    clearTimeout(timeoutId);

    // Processar e cachear conexões
    if (!connectionsRes.error) {
      const instances = connectionsRes.data?.instances || [];
      const mappedConns = instances
        .filter((c: any) => c.NomeConexao && c.instanceName)
        .map((c: any) => ({
          id: c.id,
          name: c.NomeConexao,
          instance: c.instanceName,
          instanceName: c.instanceName,
          NomeConexao: c.NomeConexao,
          apikey: c.Apikey || '',
          Apikey: c.Apikey || '',
          phone: c.Telefone,
          Telefone: c.Telefone,
          isConnected: c.status === 'open',
          status: c.status === 'open' ? 'open' : 'close',
          photo: c.FotoPerfil || null,
          FotoPerfil: c.FotoPerfil || null,
          crmAtivo: c.crmAtivo
        }));
      
      // Cache para diferentes páginas
      setToCache(getCacheKey('conexoes', userId), mappedConns);
      setToCache(getCacheKey('disparos_connections', userId), mappedConns);
      setToCache(getCacheKey('disparos_grupo_connections', userId), mappedConns);
    }

    // Processar e cachear listas
    if (!listasRes.error) {
      const listasData = listasRes.data?.listas || listasRes.data?.data || [];
      const counts: Record<number, number> = {};
      listasData.forEach((lista: any) => {
        counts[lista.id] = lista._count || 0;
      });
      
      setToCache(getCacheKey('listas', userId), { listas: listasData, counts });
      
      // Separar para páginas de disparo
      const contactsLists = listasData.filter((l: any) => l.tipo === 'contacts');
      const groupsLists = listasData.filter((l: any) => l.tipo === 'groups' || l.tipo === 'Grupos');
      
      setToCache(getCacheKey('disparos_lists', userId), contactsLists);
      setToCache(getCacheKey('disparos_grupo_lists', userId), groupsLists);
    }

    // Processar e cachear disparos
    if (!disparosRes.error && !disparosRes.data?.error) {
      const disparosData = disparosRes.data?.disparos || [];
      setToCache(getCacheKey('historico_disparos', userId), disparosData);
    }

    console.log(`[Preloader] Data preloaded in ${Date.now() - startTime}ms`);
  } catch (e) {
    console.error('[Preloader] Error preloading data:', e);
  } finally {
    isPreloading = false;
  }
};

export const useDataPreloader = (userId: string | undefined) => {
  const preload = useCallback(() => {
    if (userId) {
      preloadUserData(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      // Verificar se já tem cache válido
      const hasCache = getFromCache(getCacheKey('conexoes', userId));
      if (!hasCache) {
        preload();
      }
    }
  }, [userId, preload]);

  return { preload };
};
