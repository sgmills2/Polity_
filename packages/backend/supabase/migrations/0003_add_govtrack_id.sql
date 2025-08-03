-- Add govtrack_id field to politicians table for GovTrack integration
ALTER TABLE api.politicians ADD COLUMN govtrack_id TEXT UNIQUE;

-- Add index on govtrack_id for faster lookups
CREATE INDEX idx_politicians_govtrack_id ON api.politicians(govtrack_id);

-- Add comment
COMMENT ON COLUMN api.politicians.govtrack_id IS 'GovTrack.us person ID for data linking'; 