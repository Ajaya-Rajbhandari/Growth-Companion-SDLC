# AI Feedback Feature Setup

The AI feedback feature requires database tables to be created. Follow these steps to set it up:

## Step 1: Run the Migration

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `migrations/005_add_ai_analytics.sql`
4. Run the SQL script

Alternatively, you can run it via the Supabase CLI:

```bash
supabase db push
```

Or manually execute the SQL in your database:

```sql
-- Create chat_feedback table for storing user feedback on AI responses
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_usage_analytics table for tracking AI usage and performance
CREATE TABLE IF NOT EXISTS ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_feedback_user_id ON chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_session_id ON chat_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created_at ON chat_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_user_id ON ai_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_created_at ON ai_usage_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_tool_name ON ai_usage_analytics(tool_name);

-- Enable Row Level Security
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_feedback
CREATE POLICY "Users can view their own feedback"
  ON chat_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON chat_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON chat_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
  ON chat_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_usage_analytics
CREATE POLICY "Users can view their own analytics"
  ON ai_usage_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON ai_usage_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Step 2: Verify Setup

After running the migration, verify that the tables were created:

1. In Supabase dashboard, go to Table Editor
2. You should see `chat_feedback` and `ai_usage_analytics` tables
3. Check that RLS policies are enabled

## Troubleshooting

If you see errors like "Could not find the table 'public.chat_feedback'":
- Make sure you've run the migration SQL script
- Verify you're connected to the correct database
- Check that the tables appear in the Supabase dashboard

## Notes

- The feedback feature will work automatically once the tables are created
- All feedback is stored securely with Row Level Security (RLS) policies
- Users can only see and manage their own feedback
