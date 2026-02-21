
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  shop_name TEXT,
  link TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Allow public insert on medicines" ON public.medicines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on medicines" ON public.medicines FOR DELETE USING (true);
