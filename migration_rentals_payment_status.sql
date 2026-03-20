-- Add payment status column to rentals table
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Optionally, backfill existing records
UPDATE rentals SET payment_status = 'pending' WHERE payment_status IS NULL;
