-- ============================================================================
-- Migration: client_extra_phones
-- Description: Table for storing extra contact phone numbers per client
-- Date: 2026-03-08
-- ============================================================================

-- Create the extra phones table
CREATE TABLE IF NOT EXISTS client_extra_phones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  numero varchar(20) NOT NULL CHECK (numero ~ '^[0-9]{5,}$'),
  etiqueta varchar(50) DEFAULT 'otro',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups by client
CREATE INDEX idx_client_extra_phones_client_id ON client_extra_phones(client_id);

-- RLS
ALTER TABLE client_extra_phones ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all extra phones
CREATE POLICY "Authenticated users can read extra phones"
  ON client_extra_phones FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users can insert extra phones
CREATE POLICY "Authenticated users can insert extra phones"
  ON client_extra_phones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: authenticated users can update extra phones
CREATE POLICY "Authenticated users can update extra phones"
  ON client_extra_phones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: authenticated users can delete extra phones
CREATE POLICY "Authenticated users can delete extra phones"
  ON client_extra_phones FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_extra_phones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extra_phones_updated_at
  BEFORE UPDATE ON client_extra_phones
  FOR EACH ROW
  EXECUTE FUNCTION update_extra_phones_updated_at();
