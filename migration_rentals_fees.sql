-- Add new fee columns to rentals table
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS transport_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_fee numeric(10,2) DEFAULT 0;

-- Optionally, backfill existing records to explicitly have 0
UPDATE rentals SET transport_fee = 0 WHERE transport_fee IS NULL;
UPDATE rentals SET deposit_fee = 0 WHERE deposit_fee IS NULL;
