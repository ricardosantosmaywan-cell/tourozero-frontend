-- Adicionar colunas de IVA manual na tabela rentals
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS iva_materials NUMERIC DEFAULT 0;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS iva_transport NUMERIC DEFAULT 0;

-- Adicionar a coluna extensions_history se ainda não existir (JSONB)
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS extensions_history JSONB DEFAULT '[]'::jsonb;
