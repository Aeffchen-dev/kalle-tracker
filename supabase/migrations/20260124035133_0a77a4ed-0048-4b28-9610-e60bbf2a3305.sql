-- Add countdown_mode column to settings table
ALTER TABLE public.settings 
ADD COLUMN countdown_mode TEXT NOT NULL DEFAULT 'count_up';

-- Update existing row
UPDATE public.settings SET countdown_mode = 'count_up' WHERE id = 'default';