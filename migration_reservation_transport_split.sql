-- Adiciona valor de reserva (sinal) e separa o transporte em Ida / Volta
-- O sinal é um adiantamento que abate do saldo a pagar (não soma ao total do aluguel).
-- transport_value continua a existir e representa o total (ida + volta), usado nos
-- relatórios de contabilidade e no contrato — não precisa de alteração nesses locais.

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS reservation_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_ida_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_ida_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_volta_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_volta_paid BOOLEAN DEFAULT false;

-- Backfill: agendamentos existentes têm o transporte todo lançado como "Ida".
-- O status de pago/pendente de cada perna herda o payment_status geral do aluguer.
UPDATE public.rentals
SET transport_ida_value = COALESCE(transport_value, 0),
    transport_ida_paid = (payment_status = 'paid'),
    transport_volta_value = 0,
    transport_volta_paid = false
WHERE transport_ida_value IS NULL OR transport_ida_value = 0;

UPDATE public.rentals SET reservation_value = 0 WHERE reservation_value IS NULL;
