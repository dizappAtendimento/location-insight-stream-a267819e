import { useState, useEffect } from 'react';

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

const STORAGE_KEY = 'extraction_history';

export const useExtractionHistory = () => {
  const [history, setHistory] = useState<ExtractionRecord[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  const addRecord = (record: Omit<ExtractionRecord, 'id' | 'createdAt'>) => {
    const newRecord: ExtractionRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    const updated = [newRecord, ...history].slice(0, 100); // Keep last 100
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newRecord;
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
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
