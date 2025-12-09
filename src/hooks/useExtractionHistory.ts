import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Generic result type to store any extraction data
export interface ExtractedResult {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  description?: string;
  link?: string;
  username?: string;
  bio?: string;
  followers?: number;
  [key: string]: any; // Allow additional fields
}

export interface ExtractionRecord {
  id: string;
  type: 'instagram' | 'linkedin' | 'places' | 'whatsapp-groups';
  segment: string;
  location?: string;
  totalResults: number;
  emailsFound: number;
  phonesFound: number;
  createdAt: string;
  results?: ExtractedResult[]; // Store the actual extracted data
}

const STORAGE_KEY_PREFIX = 'extraction_history_';
const RESULTS_KEY_PREFIX = 'extraction_results_';

export const useExtractionHistory = () => {
  const [history, setHistory] = useState<ExtractionRecord[]>([]);
  const { user } = useAuth();
  
  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null;
  };

  const getResultsKey = (recordId: string) => {
    return user?.id ? `${RESULTS_KEY_PREFIX}${user.id}_${recordId}` : null;
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
    
    const recordId = crypto.randomUUID();
    
    // Store results separately to avoid localStorage limits
    if (record.results && record.results.length > 0) {
      const resultsKey = getResultsKey(recordId);
      if (resultsKey) {
        try {
          localStorage.setItem(resultsKey, JSON.stringify(record.results));
        } catch (e) {
          console.warn('Failed to store results, might exceed localStorage limit');
        }
      }
    }
    
    // Store record metadata without results to save space
    const newRecord: ExtractionRecord = {
      ...record,
      id: recordId,
      createdAt: new Date().toISOString(),
      results: undefined, // Don't store in main history
    };
    
    const updated = [newRecord, ...history].slice(0, 100); // Keep last 100
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    return newRecord;
  };

  const getResults = (recordId: string): ExtractedResult[] | null => {
    const resultsKey = getResultsKey(recordId);
    if (!resultsKey) return null;
    
    const stored = localStorage.getItem(resultsKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  const clearHistory = () => {
    const key = getStorageKey();
    if (!key) return;
    
    // Also clear all results
    history.forEach(record => {
      const resultsKey = getResultsKey(record.id);
      if (resultsKey) {
        localStorage.removeItem(resultsKey);
      }
    });
    
    setHistory([]);
    localStorage.removeItem(key);
  };

  const deleteRecord = (recordId: string) => {
    const key = getStorageKey();
    if (!key) return;
    
    // Delete results
    const resultsKey = getResultsKey(recordId);
    if (resultsKey) {
      localStorage.removeItem(resultsKey);
    }
    
    const updated = history.filter(r => r.id !== recordId);
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
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

  return { history, addRecord, clearHistory, deleteRecord, getResults, getStats };
};
