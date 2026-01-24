-- Add logged_by column to track who logged each entry
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS logged_by TEXT;