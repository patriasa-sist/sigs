-- Migration: Clean up orphaned client records
-- Problem: Orphaned records in 'clients' table from previous test data purge
-- Solution: Delete orphaned records and add trigger to prevent future occurrences

-- Step 1: Delete orphaned client records (clients without type-specific data)
DELETE FROM clients c
WHERE NOT EXISTS (SELECT 1 FROM natural_clients nc WHERE nc.client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM juridic_clients jc WHERE jc.client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM unipersonal_clients uc WHERE uc.client_id = c.id);

-- Step 2: Add trigger to prevent future orphaned records
-- When type-specific data is deleted, also delete the parent client record
CREATE OR REPLACE FUNCTION delete_orphan_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this was the last type-specific record for this client
  IF NOT EXISTS (SELECT 1 FROM natural_clients WHERE client_id = OLD.client_id)
     AND NOT EXISTS (SELECT 1 FROM juridic_clients WHERE client_id = OLD.client_id)
     AND NOT EXISTS (SELECT 1 FROM unipersonal_clients WHERE client_id = OLD.client_id) THEN
    DELETE FROM clients WHERE id = OLD.client_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each type-specific table
DROP TRIGGER IF EXISTS cleanup_orphan_client_natural ON natural_clients;
CREATE TRIGGER cleanup_orphan_client_natural
AFTER DELETE ON natural_clients
FOR EACH ROW EXECUTE FUNCTION delete_orphan_client();

DROP TRIGGER IF EXISTS cleanup_orphan_client_juridic ON juridic_clients;
CREATE TRIGGER cleanup_orphan_client_juridic
AFTER DELETE ON juridic_clients
FOR EACH ROW EXECUTE FUNCTION delete_orphan_client();

DROP TRIGGER IF EXISTS cleanup_orphan_client_unipersonal ON unipersonal_clients;
CREATE TRIGGER cleanup_orphan_client_unipersonal
AFTER DELETE ON unipersonal_clients
FOR EACH ROW EXECUTE FUNCTION delete_orphan_client();

COMMENT ON FUNCTION delete_orphan_client() IS 'Automatically deletes parent client record when all type-specific data is removed';
