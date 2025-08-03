-- Enhanced voting data schema for real Congressional data
-- This migration enhances the existing schema for comprehensive voting record tracking

-- First, let's populate the topics table with our predefined political topics
INSERT INTO api.topics (id, name, description) VALUES
  ('01234567-89ab-cdef-0123-456789abcdef', 'Universal Healthcare', 'Support for government-provided healthcare, Medicare for All, etc.'),
  ('11234567-89ab-cdef-0123-456789abcdef', 'Reproductive Rights', 'Support for abortion access, contraception, reproductive freedom'),
  ('21234567-89ab-cdef-0123-456789abcdef', 'Defense & War', 'Support for military spending, foreign interventions, defense budget'),
  ('31234567-89ab-cdef-0123-456789abcdef', 'Climate Action', 'Support for environmental regulations, clean energy, climate policies'),
  ('41234567-89ab-cdef-0123-456789abcdef', 'Progressive Taxation', 'Support for higher taxes on wealthy, corporate tax increases'),
  ('51234567-89ab-cdef-0123-456789abcdef', 'Civil Rights', 'Support for LGBTQ+ rights, racial equality, voting rights')
ON CONFLICT (name) DO NOTHING;

-- Add additional columns to bills table for better Congressional data tracking
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS bill_type TEXT; -- HR, S, HJRes, SJRes, etc.
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS bill_number INTEGER;
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES api.politicians(id);
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS progressive_score DECIMAL CHECK (progressive_score >= -1 AND progressive_score <= 1);
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS chamber api.chamber_type;
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS policy_area TEXT;
ALTER TABLE api.bills ADD COLUMN IF NOT EXISTS subjects TEXT[]; -- Array of subject keywords

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_congress ON api.bills(congress);
CREATE INDEX IF NOT EXISTS idx_bills_chamber ON api.bills(chamber);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON api.bills(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_bills_type_number ON api.bills(bill_type, bill_number, congress);

-- Create congressional votes table for specific vote events
CREATE TABLE IF NOT EXISTS api.congressional_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    congress INTEGER NOT NULL,
    chamber api.chamber_type NOT NULL,
    session INTEGER NOT NULL,
    roll_call INTEGER NOT NULL,
    vote_number TEXT NOT NULL, -- e.g., "2024-1", "2024-45"
    bill_id UUID REFERENCES api.bills(id),
    vote_date DATE NOT NULL,
    vote_question TEXT, -- e.g., "On Passage", "On Amendment", "On Motion to Recommit"
    vote_type TEXT, -- e.g., "YEA-AND-NAY", "RECORDED VOTE", "VOICE VOTE"
    vote_result TEXT, -- e.g., "Passed", "Failed", "Agreed to"
    vote_description TEXT,
    required_for_passage TEXT, -- e.g., "1/2", "2/3", "3/5"
    yea_count INTEGER DEFAULT 0,
    nay_count INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    not_voting_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(congress, chamber, session, roll_call)
);

-- Create indexes for congressional votes
CREATE INDEX IF NOT EXISTS idx_congressional_votes_congress ON api.congressional_votes(congress);
CREATE INDEX IF NOT EXISTS idx_congressional_votes_chamber ON api.congressional_votes(chamber);
CREATE INDEX IF NOT EXISTS idx_congressional_votes_date ON api.congressional_votes(vote_date);
CREATE INDEX IF NOT EXISTS idx_congressional_votes_bill ON api.congressional_votes(bill_id);

-- Enhance voting_records table with better tracking
ALTER TABLE api.voting_records ADD COLUMN IF NOT EXISTS congressional_vote_id UUID REFERENCES api.congressional_votes(id);
ALTER TABLE api.voting_records ADD COLUMN IF NOT EXISTS congress_member_id TEXT; -- Bioguide ID for linking
ALTER TABLE api.voting_records ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE api.voting_records ADD COLUMN IF NOT EXISTS member_party TEXT;
ALTER TABLE api.voting_records ADD COLUMN IF NOT EXISTS member_state TEXT;

-- Add indexes for voting records
CREATE INDEX IF NOT EXISTS idx_voting_records_politician ON api.voting_records(politician_id);
CREATE INDEX IF NOT EXISTS idx_voting_records_bill ON api.voting_records(bill_id);
CREATE INDEX IF NOT EXISTS idx_voting_records_date ON api.voting_records(vote_date);
CREATE INDEX IF NOT EXISTS idx_voting_records_congress_member ON api.voting_records(congress_member_id);
CREATE INDEX IF NOT EXISTS idx_voting_records_congressional_vote ON api.voting_records(congressional_vote_id);

-- Create a bill analysis table for topic classification
CREATE TABLE IF NOT EXISTS api.bill_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES api.bills(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- 'automatic', 'manual', 'ai_generated'
    progressive_score DECIMAL CHECK (progressive_score >= -1 AND progressive_score <= 1),
    conservative_score DECIMAL CHECK (conservative_score >= -1 AND conservative_score <= 1),
    confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
    analysis_summary TEXT,
    keywords TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(bill_id, analysis_type)
);

-- Enhanced political scores table with additional metadata
ALTER TABLE api.political_scores ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;
ALTER TABLE api.political_scores ADD COLUMN IF NOT EXISTS confidence DECIMAL DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1);
ALTER TABLE api.political_scores ADD COLUMN IF NOT EXISTS last_calculated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Create vote summaries table for quick politician statistics
CREATE TABLE IF NOT EXISTS api.politician_vote_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES api.politicians(id) ON DELETE CASCADE,
    congress INTEGER NOT NULL,
    total_votes INTEGER DEFAULT 0,
    yea_votes INTEGER DEFAULT 0,
    nay_votes INTEGER DEFAULT 0,
    present_votes INTEGER DEFAULT 0,
    not_voting_count INTEGER DEFAULT 0,
    party_line_percentage DECIMAL,
    progressive_vote_percentage DECIMAL,
    conservative_vote_percentage DECIMAL,
    attendance_rate DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(politician_id, congress)
);

-- Create triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_congressional_votes_updated_at
    BEFORE UPDATE ON api.congressional_votes
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_bill_analysis_updated_at
    BEFORE UPDATE ON api.bill_analysis
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_politician_vote_summaries_updated_at
    BEFORE UPDATE ON api.politician_vote_summaries
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

-- Create view for easy politician voting statistics
CREATE OR REPLACE VIEW api.politician_voting_stats AS
SELECT 
    p.id as politician_id,
    p.name,
    p.party,
    p.state,
    p.chamber,
    COUNT(vr.id) as total_votes,
    COUNT(CASE WHEN vr.vote = 'Yea' THEN 1 END) as yea_votes,
    COUNT(CASE WHEN vr.vote = 'Nay' THEN 1 END) as nay_votes,
    COUNT(CASE WHEN vr.vote = 'Present' THEN 1 END) as present_votes,
    COUNT(CASE WHEN vr.vote = 'Not Voting' THEN 1 END) as not_voting,
    ROUND(
        COUNT(CASE WHEN vr.vote IN ('Yea', 'Nay', 'Present') THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(vr.id), 0) * 100, 2
    ) as attendance_rate,
    ps.score as overall_score,
    ps.confidence as score_confidence
FROM api.politicians p
LEFT JOIN api.voting_records vr ON p.id = vr.politician_id
LEFT JOIN api.aggregate_scores ps ON p.id = ps.politician_id
GROUP BY p.id, p.name, p.party, p.state, p.chamber, ps.score, ps.confidence;

-- Create view for bill details with topics
CREATE OR REPLACE VIEW api.bill_details AS
SELECT 
    b.id,
    b.congress_id,
    b.congress,
    b.title,
    b.summary,
    b.bill_type,
    b.bill_number,
    b.chamber,
    b.status,
    b.introduced_date,
    b.progressive_score,
    sponsor.name as sponsor_name,
    sponsor.party as sponsor_party,
    sponsor.state as sponsor_state,
    ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as topics,
    COUNT(vr.id) as vote_count,
    COUNT(cv.id) as congressional_vote_count
FROM api.bills b
LEFT JOIN api.politicians sponsor ON b.sponsor_id = sponsor.id
LEFT JOIN api.bill_topics bt ON b.id = bt.bill_id
LEFT JOIN api.topics t ON bt.topic_id = t.id
LEFT JOIN api.voting_records vr ON b.id = vr.bill_id
LEFT JOIN api.congressional_votes cv ON b.id = cv.bill_id
GROUP BY b.id, b.congress_id, b.congress, b.title, b.summary, b.bill_type, 
         b.bill_number, b.chamber, b.status, b.introduced_date, b.progressive_score,
         sponsor.name, sponsor.party, sponsor.state;

-- Add comments for documentation
COMMENT ON TABLE api.congressional_votes IS 'Specific vote events in Congress with roll call data';
COMMENT ON TABLE api.bill_analysis IS 'AI/Manual analysis of bills for political classification';
COMMENT ON TABLE api.politician_vote_summaries IS 'Aggregated voting statistics by politician and congress';
COMMENT ON VIEW api.politician_voting_stats IS 'Real-time view of politician voting patterns and statistics';
COMMENT ON VIEW api.bill_details IS 'Comprehensive bill information with topics and vote counts';

-- Create function to calculate politician scores based on real voting data
CREATE OR REPLACE FUNCTION api.calculate_politician_score(politician_uuid UUID, topic_uuid UUID)
RETURNS TABLE(score DECIMAL, vote_count INTEGER, confidence DECIMAL) AS $$
DECLARE
    total_votes INTEGER := 0;
    progressive_votes INTEGER := 0;
    conservative_votes INTEGER := 0;
    calculated_score DECIMAL := 0.0;
    calculated_confidence DECIMAL := 0.0;
BEGIN
    -- Count votes on bills related to this topic
    SELECT COUNT(*) INTO total_votes
    FROM api.voting_records vr
    JOIN api.bills b ON vr.bill_id = b.id
    JOIN api.bill_topics bt ON b.id = bt.bill_id
    WHERE vr.politician_id = politician_uuid 
    AND bt.topic_id = topic_uuid
    AND vr.vote IN ('Yea', 'Nay');

    IF total_votes = 0 THEN
        RETURN QUERY SELECT 0.0::DECIMAL, 0, 0.0::DECIMAL;
        RETURN;
    END IF;

    -- Count progressive votes (Yea on progressive bills, Nay on conservative bills)
    SELECT COUNT(*) INTO progressive_votes
    FROM api.voting_records vr
    JOIN api.bills b ON vr.bill_id = b.id
    JOIN api.bill_topics bt ON b.id = bt.bill_id
    WHERE vr.politician_id = politician_uuid 
    AND bt.topic_id = topic_uuid
    AND ((vr.vote = 'Yea' AND b.progressive_score > 0) 
         OR (vr.vote = 'Nay' AND b.progressive_score < 0));

    -- Calculate score (-1 = very conservative, +1 = very progressive)
    calculated_score := (progressive_votes::DECIMAL / total_votes::DECIMAL * 2) - 1;
    
    -- Calculate confidence based on vote count (more votes = higher confidence)
    calculated_confidence := LEAST(1.0, total_votes::DECIMAL / 20.0);

    RETURN QUERY SELECT calculated_score, total_votes, calculated_confidence;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA api TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA api TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA api TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO authenticated; 