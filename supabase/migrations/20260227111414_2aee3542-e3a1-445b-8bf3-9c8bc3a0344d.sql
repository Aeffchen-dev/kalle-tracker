
CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  city text,
  latitude double precision,
  longitude double precision,
  link text
);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on places" ON public.places FOR SELECT USING (true);
CREATE POLICY "Allow public insert on places" ON public.places FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on places" ON public.places FOR DELETE USING (true);
