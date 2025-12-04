-- Add weight_value column for storing weight entries
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS weight_value numeric;