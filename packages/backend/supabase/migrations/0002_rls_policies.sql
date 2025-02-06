-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to politicians" ON api.politicians;
DROP POLICY IF EXISTS "Allow full access to topics" ON api.topics;
DROP POLICY IF EXISTS "Allow full access to bills" ON api.bills;
DROP POLICY IF EXISTS "Allow full access to bill_topics" ON api.bill_topics;
DROP POLICY IF EXISTS "Allow full access to voting_records" ON api.voting_records;
DROP POLICY IF EXISTS "Allow full access to political_scores" ON api.political_scores;
DROP POLICY IF EXISTS "Allow full access to aggregate_scores" ON api.aggregate_scores;

-- Enable Row Level Security
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