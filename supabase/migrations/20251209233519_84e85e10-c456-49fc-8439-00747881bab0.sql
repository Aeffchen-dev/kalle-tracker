-- Create table for Tagesplan data
CREATE TABLE public.tagesplan (
  id TEXT PRIMARY KEY DEFAULT 'default',
  meals_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tagesplan ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view
CREATE POLICY "Anyone can view tagesplan"
ON public.tagesplan
FOR SELECT
USING (true);

-- Allow anyone to update
CREATE POLICY "Anyone can update tagesplan"
ON public.tagesplan
FOR UPDATE
USING (true);

-- Allow anyone to insert
CREATE POLICY "Anyone can insert tagesplan"
ON public.tagesplan
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tagesplan;