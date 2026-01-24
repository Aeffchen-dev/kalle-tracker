-- Add birthday column to settings table
ALTER TABLE public.settings 
ADD COLUMN birthday date DEFAULT NULL;