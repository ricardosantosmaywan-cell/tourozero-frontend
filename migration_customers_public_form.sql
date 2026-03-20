-- 1. Adicionar as colunas em falta na tabela customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS document_photo_url TEXT;

-- 2. Garantir permissões de INSERT para utilizadores anónimos (Formulário Público)
-- O Tourozero atualmente funciona com RLS desativado conforme o esquema anterior.
-- Para garantir que o formulário funciona de imediato e o painel de gestão não perde acesso:
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- (Opcional) Se preferires manter a segurança RLS APLICADA na tabela customers, 
-- podes executar as seguintes linhas em vez do comando acima:
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir inserts publicos" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "Permitir todo o acesso autenticado" ON public.customers FOR ALL TO authenticated, anon USING (true);

-- 3. Configurar devidamente o Storage (Bucket 'documents')
-- Criar o bucket público se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true) 
ON CONFLICT (id) DO NOTHING;

-- Permitir que anónimos façam upload de ficheiros para o bucket
CREATE POLICY "UploadAnonimoDocuments" 
ON storage.objects FOR INSERT 
TO anon
WITH CHECK (bucket_id = 'documents');

-- Permitir que anónimos/painel vejam as imagens do bucket
CREATE POLICY "LeituraAnonimaDocuments" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'documents');
