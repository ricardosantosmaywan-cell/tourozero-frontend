-- Reservas para datas futuras não devem descontar o stock até o cliente
-- efetivamente vir buscar o material. Este campo controla isso:
-- true  = material já saiu do stock (retirada confirmada, ou aluguer já existente antes desta migração)
-- false = é uma reserva futura; o stock só será descontado ao clicar em "Confirmar Retirada"
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS pickup_confirmed BOOLEAN DEFAULT true;

-- Todos os alugueres já existentes já tiveram o stock descontado na criação,
-- por isso ficam marcados como confirmados (não altera nada no stock atual).
UPDATE public.rentals SET pickup_confirmed = true WHERE pickup_confirmed IS NULL;
