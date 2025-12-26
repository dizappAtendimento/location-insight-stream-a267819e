import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  status?: string;
  results?: ExtractedResult[]; // Store the actual extracted data
}

export const useExtractionHistory = () => {
  const [history, setHistory] = useState<ExtractionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Fetch history from database
  const fetchHistory = useCallback(async () => {
    if (!user?.id) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch from search_jobs table using edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: { 
          action: 'get-history',
          userId: user.id
        }
      });

      if (error) {
        console.error('Error fetching extraction history:', error);
        setHistory([]);
        return;
      }

      if (data?.jobs && Array.isArray(data.jobs)) {
        const records: ExtractionRecord[] = data.jobs.map((job: any) => {
          // Parse results to count emails and phones
          const results = Array.isArray(job.results) ? job.results : [];
          const emailsFound = results.filter((r: any) => r.email || r.emails?.length > 0).length;
          const phonesFound = results.filter((r: any) => r.phone || r.phones?.length > 0 || r.telefone).length;

          return {
            id: job.id,
            type: job.type || 'places',
            segment: job.query,
            location: job.location,
            totalResults: job.total_found || results.length,
            emailsFound,
            phonesFound,
            createdAt: job.created_at,
            status: job.status,
            results: undefined, // Don't load results initially
          };
        });

        setHistory(records);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching extraction history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addRecord = (record: Omit<ExtractionRecord, 'id' | 'createdAt'>) => {
    // For database records, this is handled by the extraction edge functions
    // This is just for local state update after an extraction
    const newRecord: ExtractionRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    setHistory(prev => [newRecord, ...prev]);
    return newRecord;
  };

  const getResults = async (recordId: string): Promise<ExtractedResult[] | null> => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: { 
          action: 'get-results',
          jobId: recordId,
          userId: user.id
        }
      });

      if (error) {
        console.error('Error fetching results:', error);
        return null;
      }

      return data?.results || null;
    } catch (error) {
      console.error('Error fetching results:', error);
      return null;
    }
  };

  const clearHistory = async () => {
    // For database records, we don't actually delete - just clear local state
    // If you want to delete from database, implement a delete endpoint
    setHistory([]);
  };

  const deleteRecord = (recordId: string) => {
    // For database records, just remove from local state
    setHistory(prev => prev.filter(r => r.id !== recordId));
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

  return { 
    history, 
    addRecord, 
    clearHistory, 
    deleteRecord, 
    getResults, 
    getStats, 
    isLoading,
    refetch: fetchHistory 
  };
};
