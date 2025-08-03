-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create api schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS api;

-- Create enum types
CREATE TYPE api.chamber_type AS ENUM ('senate', 'house');
CREATE TYPE api.vote_type AS ENUM ('Yea', 'Nay', 'Present', 'Not Voting');
CREATE TYPE api.philosophy_type AS ENUM ('Progressive', 'Liberal', 'Moderate', 'Conservative', 'Very Conservative');

-- Create politicians table
CREATE TABLE api.politicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    chamber api.chamber_type NOT NULL,
    party TEXT NOT NULL,
    photo_url TEXT,
    description TEXT,
    role_title TEXT NOT NULL,
    serving_since DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create topics table
CREATE TABLE api.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create bills table
CREATE TABLE api.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    congress_id TEXT NOT NULL UNIQUE,
    congress INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    introduced_date DATE NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create bill_topics table (many-to-many relationship)
CREATE TABLE api.bill_topics (
    bill_id UUID REFERENCES api.bills(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES api.topics(id) ON DELETE CASCADE,
    PRIMARY KEY (bill_id, topic_id)
);

-- Create voting_records table
CREATE TABLE api.voting_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES api.politicians(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES api.bills(id) ON DELETE CASCADE,
    vote api.vote_type NOT NULL,
    vote_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create political_scores table
CREATE TABLE api.political_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES api.politicians(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES api.topics(id) ON DELETE CASCADE,
    score DECIMAL NOT NULL CHECK (score >= -1 AND score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(politician_id, topic_id)
);

-- Create aggregate_scores table
CREATE TABLE api.aggregate_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID REFERENCES api.politicians(id) ON DELETE CASCADE,
    overall_score DECIMAL NOT NULL CHECK (overall_score >= -1 AND overall_score <= 1),
    philosophy api.philosophy_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(politician_id)
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION api.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_politicians_updated_at
    BEFORE UPDATE ON api.politicians
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON api.topics
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON api.bills
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_voting_records_updated_at
    BEFORE UPDATE ON api.voting_records
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_political_scores_updated_at
    BEFORE UPDATE ON api.political_scores
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

CREATE TRIGGER update_aggregate_scores_updated_at
    BEFORE UPDATE ON api.aggregate_scores
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();

-- Configure row-level security policies
ALTER TABLE api.politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.bill_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.voting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.political_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.aggregate_scores ENABLE ROW LEVEL SECURITY;

-- Grant permissions to the anon role
GRANT ALL ON api.politicians TO anon;
GRANT ALL ON api.topics TO anon;
GRANT ALL ON api.bills TO anon;
GRANT ALL ON api.bill_topics TO anon;
GRANT ALL ON api.voting_records TO anon;
GRANT ALL ON api.political_scores TO anon;
GRANT ALL ON api.aggregate_scores TO anon;

-- Create policies for anonymous access (since we're using anon key)
CREATE POLICY "Allow full access to politicians" ON api.politicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to topics" ON api.topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to bills" ON api.bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to bill_topics" ON api.bill_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to voting_records" ON api.voting_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to political_scores" ON api.political_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to aggregate_scores" ON api.aggregate_scores FOR ALL USING (true) WITH CHECK (true);

-- Insert initial seed data for topics
INSERT INTO api.topics (name, description) VALUES
('Healthcare', 'Healthcare policy, Medicare, Medicaid, and medical insurance'),
('Immigration', 'Border security, immigration reform, and refugee policy'),
('Economy', 'Economic policy, taxes, trade, and fiscal matters'),
('Environment', 'Climate change, environmental protection, and energy policy'),
('Education', 'Education policy, student loans, and school funding'),
('Foreign Policy', 'International relations, treaties, and military intervention'),
('Gun Control', 'Firearm regulation and Second Amendment issues'),
('Civil Rights', 'Civil liberties, voting rights, and equality'),
('National Security', 'Defense, homeland security, and counter-terrorism'),
('Social Programs', 'Welfare, social security, and public assistance'),
('Infrastructure', 'Transportation, public works, and infrastructure development'),
('Technology', 'Tech regulation, privacy, and digital policy'),
('Criminal Justice', 'Law enforcement, prison reform, and judicial matters'),
('Agriculture', 'Farming policy, subsidies, and rural development'),
('Labor', 'Workers rights, unions, and employment policy'); 