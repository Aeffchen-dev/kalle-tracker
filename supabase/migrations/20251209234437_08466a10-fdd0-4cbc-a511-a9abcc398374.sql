-- Enable full replica identity for realtime updates
ALTER TABLE public.tagesplan REPLICA IDENTITY FULL;