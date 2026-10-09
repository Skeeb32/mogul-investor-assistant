CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('investor', 'analyst', 'admin');
CREATE TYPE transaction_kind AS ENUM ('investment', 'distribution', 'fee');
CREATE TYPE document_source_type AS ENUM ('listing', 'market_report', 'lease', 'contract', 'investment_memo', 'property_note', 'other');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  email varchar(320) NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'investor',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users(email);

CREATE TABLE investment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  account_type varchar(40) NOT NULL DEFAULT 'individual',
  currency varchar(3) NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'investor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);
CREATE INDEX account_members_user_idx ON account_members(user_id);

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  name varchar(180) NOT NULL,
  address varchar(240) NOT NULL,
  city varchar(100) NOT NULL,
  state varchar(80) NOT NULL,
  asset_class varchar(80) NOT NULL,
  occupancy real NOT NULL DEFAULT 0,
  market_value integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX properties_account_idx ON properties(account_id);

CREATE TABLE investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amount_invested integer NOT NULL CHECK (amount_invested >= 0),
  current_value integer NOT NULL CHECK (current_value >= 0),
  distribution_ytd integer NOT NULL DEFAULT 0 CHECK (distribution_ytd >= 0),
  ownership_percent real NOT NULL DEFAULT 0 CHECK (ownership_percent >= 0 AND ownership_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX investments_owner_idx ON investments(account_id, user_id);

CREATE TABLE investment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  kind transaction_kind NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  description varchar(240) NOT NULL,
  occurred_at timestamptz NOT NULL
);
CREATE INDEX transactions_owner_date_idx ON investment_transactions(account_id, user_id, occurred_at DESC);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  source_type document_source_type NOT NULL DEFAULT 'other',
  title varchar(240) NOT NULL,
  url text,
  source_date timestamptz,
  checksum varchar(64) NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  chunk_count integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || content)) STORED,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_account_checksum_chunk_unique UNIQUE(account_id, checksum, chunk_index)
);
CREATE INDEX documents_account_source_idx ON documents(account_id, source_type);
CREATE INDEX documents_checksum_chunk_idx ON documents(account_id, checksum, chunk_index);
CREATE INDEX documents_search_vector_idx ON documents USING gin(search_vector);
CREATE INDEX documents_embedding_hnsw_idx ON documents USING hnsw(embedding vector_cosine_ops) WHERE embedding IS NOT NULL;

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_owner_updated_idx ON conversations(account_id, user_id, updated_at DESC);

CREATE TABLE conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON conversation_messages(conversation_id, created_at);

CREATE TABLE user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(body) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notes_owner_idx ON user_notes(account_id, user_id);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event varchar(100) NOT NULL,
  resource_type varchar(80) NOT NULL,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_owner_time_idx ON audit_logs(account_id, user_id, created_at DESC);

CREATE TABLE rate_limits (
  key varchar(240) PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  UNIQUE(identifier, token)
);

-- The web process sets both values with SET LOCAL inside each tenant transaction.
DO $$
DECLARE table_name text;
BEGIN
  ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE investment_accounts FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON investment_accounts
    USING (id = nullif(current_setting('app.current_account_id', true), '')::uuid)
    WITH CHECK (id = nullif(current_setting('app.current_account_id', true), '')::uuid);

  ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
  ALTER TABLE properties FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON properties
    USING (account_id = nullif(current_setting('app.current_account_id', true), '')::uuid)
    WITH CHECK (account_id = nullif(current_setting('app.current_account_id', true), '')::uuid);
  FOREACH table_name IN ARRAY ARRAY[
    'investments', 'investment_transactions', 'documents', 'conversations',
    'conversation_messages', 'user_notes', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (account_id = nullif(current_setting(''app.current_account_id'', true), '''')::uuid AND (user_id IS NULL OR user_id = nullif(current_setting(''app.current_user_id'', true), '''')::uuid)) WITH CHECK (account_id = nullif(current_setting(''app.current_account_id'', true), '''')::uuid AND (user_id IS NULL OR user_id = nullif(current_setting(''app.current_user_id'', true), '''')::uuid))',
      table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'investment_accounts', 'account_members', 'properties', 'investments',
    'investment_transactions', 'documents', 'conversations',
    'conversation_messages', 'user_notes', 'audit_logs'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY service_manage ON %I USING (current_setting(''app.is_service'', true) = ''true'') WITH CHECK (current_setting(''app.is_service'', true) = ''true'')',
      table_name
    );
  END LOOP;
END $$;

-- Users are an authentication directory. Business and conversation data remain
-- subject to RLS; the login query always matches one normalized email exactly.
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members FORCE ROW LEVEL SECURITY;
CREATE POLICY member_self_access ON account_members
  USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
