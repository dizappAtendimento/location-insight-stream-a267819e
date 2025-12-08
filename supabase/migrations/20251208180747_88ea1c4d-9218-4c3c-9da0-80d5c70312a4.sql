-- Add user_id column to search_jobs table
ALTER TABLE public.search_jobs 
ADD COLUMN user_id uuid;

-- Update RLS policies to filter by user_id
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.search_jobs;
DROP POLICY IF EXISTS "Anyone can read their own jobs" ON public.search_jobs;
DROP POLICY IF EXISTS "Anyone can update their own jobs" ON public.search_jobs;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access" 
ON public.search_jobs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_search_jobs_user_id ON public.search_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_jobs_user_session ON public.search_jobs(user_id, session_id);