-- Despesas da empresa (combustível, manutenção da carrinha, etc.) usadas na tela Financeiro / DRE.
-- category guarda a chave da categoria definida em src/utils/financialCalculations.ts (EXPENSE_CATEGORIES);
-- não há CHECK de propósito, para poder acrescentar categorias novas sem nova migração.
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    paid_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON public.expenses (expense_date);

-- Mesmo padrão das restantes tabelas (o login da app tem fallback sem sessão Supabase,
-- por isso políticas "authenticated" bloqueariam a gravação nesses casos).
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
