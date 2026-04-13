ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS extensions_history JSONB DEFAULT '[]'::jsonb;
