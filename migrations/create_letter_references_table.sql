-- Migration: Create letter_references table for tracking sequential letter numbers per executive
-- This table ensures each executive has unique sequential letter numbers (1-99999) per month/year

CREATE TABLE letter_references (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executive_glyph text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL, -- 1-12 (January = 1, December = 12)
  current_number integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one record per executive per month/year
  UNIQUE(executive_glyph, year, month),
  
  -- Ensure current_number stays within 1-99999 range
  CHECK (current_number >= 1 AND current_number <= 99999)
);

-- Enable RLS (Row Level Security) to match other tables
ALTER TABLE letter_references ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON letter_references
  FOR ALL USING (auth.role() = 'authenticated');

-- Create index for faster lookups by executive and date
CREATE INDEX idx_letter_references_executive_date ON letter_references(executive_glyph, year, month);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_letter_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_letter_references_updated_at
  BEFORE UPDATE ON letter_references
  FOR EACH ROW
  EXECUTE FUNCTION update_letter_references_updated_at();