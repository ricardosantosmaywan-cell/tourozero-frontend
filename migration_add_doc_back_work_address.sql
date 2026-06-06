ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS document_photo_back_url TEXT,
  ADD COLUMN IF NOT EXISTS work_address TEXT;
