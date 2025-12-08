import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ExtractionRecord {
  id: string;
  type: 'instagram' | 'linkedin' | 'places';
  segment: string;
  location?: string;
  totalResults: number;
  emailsFound: number;
  phonesFound: number;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'extraction_history_';

export const useExtractionHistory = () => {
  const [history, setHistory] = useState<ExtractionRecord[]>([]);
  const { user } = useAuth();
  
  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null;
  };

  useEffect(() => {
    const key = getStorageKey();
    if (!key) {
      setHistory([]);
      return;
    }
    
    const stored = localStorage.getItem(key);
    if (stored) {
      setHistory(JSON.parse(stored));
    } else {
      setHistory([]);
    }
  }, [user?.id]);

  const addRecord = (record: Omit<ExtractionRecord, 'id' | 'createdAt'>) => {
    const key = getStorageKey();
    if (!key) return null;
    
    const newRecord: ExtractionRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    const updated = [newRecord, ...history].slice(0, 100); // Keep last 100
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    return newRecord;
  };

  const clearHistory = () => {
    const key = getStorageKey();
    if (!key) return;
    
    setHistory([]);
    localStorage.removeItem(key);
  };

  const getStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecords = history.filter(r => new Date(r.createdAt) >= today);
    const last7Days = history.filter(r => {
      const date = new Date(r.createdAt);
      const diff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });

    return {
      totalExtractions: history.length,
      todayExtractions: todayRecords.length,
      totalLeads: history.reduce((acc, r) => acc + r.totalResults, 0),
      todayLeads: todayRecords.reduce((acc, r) => acc + r.totalResults, 0),
      last7DaysLeads: last7Days.reduce((acc, r) => acc + r.totalResults, 0),
      totalEmails: history.reduce((acc, r) => acc + r.emailsFound, 0),
      totalPhones: history.reduce((acc, r) => acc + r.phonesFound, 0),
    };
  };

  return { history, addRecord, clearHistory, getStats };
};
