-- Create events table for shared tracking
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pipi', 'stuhlgang')),
  time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read events (public data)
CREATE POLICY "Anyone can view events"
ON public.events
FOR SELECT
USING (true);

-- Allow everyone to insert events (no auth required)
CREATE POLICY "Anyone can insert events"
ON public.events
FOR INSERT
WITH CHECK (true);

-- Allow everyone to delete events
CREATE POLICY "Anyone can delete events"
ON public.events
FOR DELETE
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;