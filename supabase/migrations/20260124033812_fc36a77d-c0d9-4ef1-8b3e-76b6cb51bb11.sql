-- Create settings table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  morning_walk_time TEXT NOT NULL DEFAULT '08:00',
  walk_interval_hours INTEGER NOT NULL DEFAULT 4,
  sleep_start_hour NUMERIC NOT NULL DEFAULT 22,
  sleep_end_hour NUMERIC NOT NULL DEFAULT 7,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view settings
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
USING (true);

-- Allow anyone to insert settings
CREATE POLICY "Anyone can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update settings
CREATE POLICY "Anyone can update settings"
ON public.settings
FOR UPDATE
USING (true);

-- Insert default settings row
INSERT INTO public.settings (id, morning_walk_time, walk_interval_hours, sleep_start_hour, sleep_end_hour)
VALUES ('default', '08:00', 4, 22, 7);