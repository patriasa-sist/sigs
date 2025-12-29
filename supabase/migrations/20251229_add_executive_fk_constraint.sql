-- ============================================
-- Migration: Add foreign key constraint for executive_in_charge
-- Date: 2025-12-29
-- Description:
--   Add FK constraint from clients.executive_in_charge to profiles.id
--   This enables Supabase to perform automatic joins
-- ============================================

-- Add foreign key constraint
ALTER TABLE clients
ADD CONSTRAINT clients_executive_in_charge_fkey
FOREIGN KEY (executive_in_charge)
REFERENCES profiles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_executive_in_charge
ON clients(executive_in_charge);

-- Add comment
COMMENT ON CONSTRAINT clients_executive_in_charge_fkey ON clients IS
'Foreign key to profiles table - identifies the executive in charge of the client';
