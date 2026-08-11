-- Guarda o contrato assinado pelo cliente na retirada do material:
-- signature_url = link público (Supabase Storage) do PDF do contrato já com a assinatura embutida
-- signed_at     = data/hora em que a assinatura foi capturada
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
