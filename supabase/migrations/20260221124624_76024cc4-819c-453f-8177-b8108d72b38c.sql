-- Drop old check constraint and add new one with wurmkur and parasiten types
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (type IN ('pipi', 'stuhlgang', 'phwert', 'gewicht', 'wurmkur', 'parasiten'));