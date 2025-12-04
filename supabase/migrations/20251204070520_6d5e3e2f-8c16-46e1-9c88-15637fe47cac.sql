-- Drop the existing check constraint and add a new one that includes 'phwert'
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (type IN ('pipi', 'stuhlgang', 'gewicht', 'phwert'));