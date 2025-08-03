-- Add congress_id field to politicians table for ProPublica integration
ALTER TABLE api.politicians ADD COLUMN congress_id TEXT UNIQUE;

-- Add index on congress_id for faster lookups
CREATE INDEX idx_politicians_congress_id ON api.politicians(congress_id);

-- Add comment
COMMENT ON COLUMN api.politicians.congress_id IS 'ProPublica Congress API member ID for data linking'; 