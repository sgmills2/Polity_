-- Enhance politicians table for comprehensive federal legislator data
-- Add new columns for enhanced politician information

-- Name components
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS suffix TEXT;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Contact and official information
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS official_website TEXT;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS office_phone TEXT;

-- Status and metadata
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS current_congress INTEGER;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE api.politicians ADD COLUMN IF NOT EXISTS district INTEGER;

-- Update existing congress_id to be unique if not already
ALTER TABLE api.politicians ADD CONSTRAINT unique_congress_id UNIQUE (congress_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_politicians_current_congress ON api.politicians(current_congress);
CREATE INDEX IF NOT EXISTS idx_politicians_is_current ON api.politicians(is_current);
CREATE INDEX IF NOT EXISTS idx_politicians_chamber_state ON api.politicians(chamber, state);
CREATE INDEX IF NOT EXISTS idx_politicians_party ON api.politicians(party);
CREATE INDEX IF NOT EXISTS idx_politicians_last_updated ON api.politicians(last_updated);

-- Add comments for documentation
COMMENT ON COLUMN api.politicians.first_name IS 'First name of the politician';
COMMENT ON COLUMN api.politicians.last_name IS 'Last name of the politician';
COMMENT ON COLUMN api.politicians.middle_name IS 'Middle name or initial of the politician';
COMMENT ON COLUMN api.politicians.suffix IS 'Name suffix (Jr., Sr., III, etc.)';
COMMENT ON COLUMN api.politicians.nickname IS 'Common nickname or preferred name';
COMMENT ON COLUMN api.politicians.official_website IS 'Official government website URL';
COMMENT ON COLUMN api.politicians.office_address IS 'Official office address';
COMMENT ON COLUMN api.politicians.office_phone IS 'Official office phone number';
COMMENT ON COLUMN api.politicians.current_congress IS 'Current Congress number (e.g., 119)';
COMMENT ON COLUMN api.politicians.is_current IS 'Whether the politician is currently serving';
COMMENT ON COLUMN api.politicians.last_updated IS 'Timestamp of last data update';
COMMENT ON COLUMN api.politicians.district IS 'Congressional district number (House only)';

-- Update the table to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_politicians_last_updated 
    BEFORE UPDATE ON api.politicians 
    FOR EACH ROW 
    EXECUTE FUNCTION update_last_updated_column(); 