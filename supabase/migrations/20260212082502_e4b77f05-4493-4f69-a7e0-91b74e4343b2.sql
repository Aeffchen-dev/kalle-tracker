
-- Table for planned walk times in the Wochenplan
CREATE TABLE public.planned_walks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  hour NUMERIC(4,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No auth in this app, so allow public access
ALTER TABLE public.planned_walks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.planned_walks FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.planned_walks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.planned_walks FOR DELETE USING (true);
