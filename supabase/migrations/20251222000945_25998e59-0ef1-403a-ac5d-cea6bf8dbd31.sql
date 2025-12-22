-- Add type column to search_jobs to track extraction source
ALTER TABLE public.search_jobs 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'places';

-- Update existing records to have 'places' as type (since they were all Google Places)
UPDATE public.search_jobs SET type = 'places' WHERE type IS NULL;