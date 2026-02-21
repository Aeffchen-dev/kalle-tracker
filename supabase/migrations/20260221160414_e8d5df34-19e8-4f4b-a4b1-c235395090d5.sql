
CREATE TABLE public.snacks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  shop_name text,
  link text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.snacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view snacks" ON public.snacks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert snacks" ON public.snacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update snacks" ON public.snacks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete snacks" ON public.snacks FOR DELETE USING (true);
