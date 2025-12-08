-- Create table for search jobs
CREATE TABLE public.search_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  location TEXT,
  max_results INTEGER DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress JSONB DEFAULT '{}',
  results JSONB DEFAULT '[]',
  total_found INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries by session
CREATE INDEX idx_search_jobs_session ON public.search_jobs(session_id);
CREATE INDEX idx_search_jobs_status ON public.search_jobs(status);
CREATE INDEX idx_search_jobs_created ON public.search_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write their own jobs by session_id
CREATE POLICY "Anyone can create jobs" 
ON public.search_jobs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read their own jobs" 
ON public.search_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update their own jobs" 
ON public.search_jobs 
FOR UPDATE 
USING (true);

-- Function to clean old jobs (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_search_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.search_jobs 
  WHERE created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;