-- Criação das Tabelas Principais para Tourozero (Supabase PostgreSQL)

-- 1. Tabela de Clientes (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    tax_id TEXT NOT NULL UNIQUE, -- NIF (Garantir que é único)
    email TEXT,
    address TEXT,
    document_id TEXT, -- B.I ou Cartão de Cidadão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Produtos/Estoque (Products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_unit NUMERIC(10, 2), -- Deixado como opcional conforme instruções de não dependência
    stock_total INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Agendamentos / Alugueres (Rentals)
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    total_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'canceled')) DEFAULT 'active',
    semanas INTEGER DEFAULT 1,
    delivery_address TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Relacionamento de Itens por Agendamento (Rental Items)
CREATE TABLE IF NOT EXISTS public.rental_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_unit NUMERIC(10, 2) DEFAULT 0.00 -- Snapshot temporal do valor do item
);

-- Permissões básicas (Row Level Security - RLS)
-- Para facilitar a testagem inicial, desativaremos o RLS, mas num projeto real com auth deve-se ligar as políticas.
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items DISABLE ROW LEVEL SECURITY;
