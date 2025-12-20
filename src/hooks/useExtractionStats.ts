import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export interface ExtractionStats {
  totalExtractions: number;
  todayExtractions: number;
  totalLeads: number;
  todayLeads: number;
  totalEmails: number;
  totalPhones: number;
}

export interface ExtractionChartData {
  date: string;
  extractions: number;
  leads: number;
}

export const useExtractionStats = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ExtractionStats>({
    totalExtractions: 0,
    todayExtractions: 0,
    totalLeads: 0,
    todayLeads: 0,
    totalEmails: 0,
    totalPhones: 0,
  });
  const [chartData, setChartData] = useState<ExtractionChartData[]>([]);
  const [history, setHistory] = useState<ExtractionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const startISO = startDate.toISOString();
      // Create a new Date object to avoid mutating the original
      const endDateCopy = new Date(endDate);
      endDateCopy.setHours(23, 59, 59, 999);
      const endISO = endDateCopy.toISOString();
      
      console.log('[useExtractionStats] Fetching stats for:', { startISO, endISO, userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'get-extraction-stats', 
          userId: user.id,
          startDate: startISO,
          endDate: endISO
        }
      });
      
      if (error) throw error;

      if (data?.stats) {
        setStats(data.stats);
      }

      if (data?.chartData) {
        setChartData(data.chartData);
      }

      if (data?.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching extraction stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, chartData, history, loading, refetch: fetchStats };
};
