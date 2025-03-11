-- User Preferences Table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords JSONB DEFAULT '[]',
  receive_notifications BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT unique_user_preference UNIQUE (user_id)
);

-- Topics Table
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id UUID NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);

-- Sources Table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id UUID NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_trusted BOOLEAN DEFAULT true
);

-- Articles Table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  content TEXT,
  author TEXT,
  published_at TIMESTAMP NOT NULL,
  category TEXT,
  image_url TEXT
);

-- Article Summaries Table
CREATE TABLE article_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Article Sentiments Table
CREATE TABLE article_sentiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  sentiment TEXT NOT NULL,
  score FLOAT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Saved Articles Table
CREATE TABLE saved_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  saved_at TIMESTAMP DEFAULT now(),
  CONSTRAINT unique_saved_article UNIQUE (user_id, article_id)
);

-- Create indexes for performance
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_saved_articles_user ON saved_articles(user_id);
CREATE INDEX idx_topics_preference ON topics(preference_id);
CREATE INDEX idx_sources_preference ON sources(preference_id);

-- Create a function to automatically create user preferences when a new user signs up
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();

-- Add sample data for testing
INSERT INTO articles (title, url, source, content, author, published_at, category, image_url)
VALUES 
  ('The Future of AI in Healthcare', 'https://example.com/ai-healthcare', 'Tech Journal', 'Content here...', 'Jane Smith', NOW() - INTERVAL '2 days', 'Technology', 'https://example.com/images/ai-health.jpg'),
  ('Global Markets See Record Gains', 'https://example.com/markets-gains', 'Business Daily', 'Content here...', 'John Doe', NOW() - INTERVAL '1 day', 'Business', 'https://example.com/images/markets.jpg'),
  ('New Study Shows Benefits of Mediterranean Diet', 'https://example.com/med-diet', 'Health Today', 'Content here...', 'Dr. Maria Garcia', NOW() - INTERVAL '3 days', 'Health', 'https://example.com/images/diet.jpg'),
  ('Political Leaders Meet for Climate Summit', 'https://example.com/climate-summit', 'World News', 'Content here...', 'Robert Johnson', NOW() - INTERVAL '12 hours', 'Politics', 'https://example.com/images/summit.jpg'),
  ('Breakthrough in Quantum Computing', 'https://example.com/quantum-computing', 'Science Weekly', 'Content here...', 'Dr. Sarah Lee', NOW() - INTERVAL '5 days', 'Science', 'https://example.com/images/quantum.jpg');

-- Add summaries for sample articles
INSERT INTO article_summaries (article_id, summary)
SELECT id, 'This is an AI-generated summary of the article that highlights the key points in a concise manner.'
FROM articles;

-- Add sentiments for sample articles
INSERT INTO article_sentiments (article_id, sentiment, score, explanation)
VALUES 
  ((SELECT id FROM articles WHERE title LIKE '%AI in Healthcare%'), 'positive', 0.92, 'The article presents an optimistic view of AI advancements in healthcare, highlighting benefits and positive outcomes.'),
  ((SELECT id FROM articles WHERE title LIKE '%Global Markets%'), 'positive', 0.78, 'The article reports on positive financial news with an upbeat tone about economic prospects.'),
  ((SELECT id FROM articles WHERE title LIKE '%Mediterranean Diet%'), 'neutral', 0.54, 'The article presents a balanced view of the diet, mentioning both benefits and limitations of the research.'),
  ((SELECT id FROM articles WHERE title LIKE '%Climate Summit%'), 'neutral', 0.48, 'The article presents a factual account of the summit without taking a strong stance on outcomes.'),
  ((SELECT id FROM articles WHERE title LIKE '%Quantum Computing%'), 'positive', 0.85, 'The article is enthusiastic about scientific progress and potential applications of the technology.');

-- Create permissions for public and authenticated roles
CREATE SCHEMA IF NOT EXISTS public;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant specific permissions for user-specific operations
GRANT INSERT, UPDATE, DELETE ON public.saved_articles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sources TO authenticated;

-- Create RLS policies for data security

-- User preferences - users can only see and modify their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_policy ON user_preferences 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Topics - users can only see and modify topics linked to their preferences
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY topics_policy ON topics 
    USING (preference_id IN (SELECT id FROM user_preferences WHERE user_id = auth.uid()))
    WITH CHECK (preference_id IN (SELECT id FROM user_preferences WHERE user_id = auth.uid()));

-- Sources - users can only see and modify sources linked to their preferences
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY sources_policy ON sources 
    USING (preference_id IN (SELECT id FROM user_preferences WHERE user_id = auth.uid()))
    WITH CHECK (preference_id IN (SELECT id FROM user_preferences WHERE user_id = auth.uid()));

-- Saved articles - users can only see and modify their own saved articles
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_articles_policy ON saved_articles 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Articles - users can see all articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY articles_policy ON articles FOR SELECT USING (true);

-- Article summaries - users can see all summaries
ALTER TABLE article_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY article_summaries_policy ON article_summaries FOR SELECT USING (true);

-- Article sentiments - users can see all sentiments
ALTER TABLE article_sentiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY article_sentiments_policy ON article_sentiments FOR SELECT USING (true);