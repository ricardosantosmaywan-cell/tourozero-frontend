-- SQL FIX: Alterar tipos de colunas para permitir decimais
-- Execute este comando no Editor SQL do seu Supabase

ALTER TABLE public.rentals 
  ALTER COLUMN rental_duration_value TYPE NUMERIC,
  ALTER COLUMN semanas TYPE NUMERIC,
  ALTER COLUMN total_amount TYPE NUMERIC,
  ALTER COLUMN transport_value TYPE NUMERIC,
  ALTER COLUMN deposit_value TYPE NUMERIC,
  ALTER COLUMN iva_materials TYPE NUMERIC,
  ALTER COLUMN iva_transport TYPE NUMERIC;

-- Caso as colunas já existam mas com restrição de inteiro, o comando acima resolve.
-- Se houver erro de "cannot be automatically cast", use:
-- ALTER COLUMN column_name TYPE NUMERIC USING column_name::numeric;
