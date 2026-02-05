CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL CHECK (state IN ('entry','assigned','active','closed')),
  current_batch INTEGER DEFAULT 0,
  batch_size INTEGER DEFAULT 0,
  batch_started_at TIMESTAMP,
  batch_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  position INTEGER,
  batch INTEGER,
  status TEXT NOT NULL CHECK (
    status IN ('pending','inactive','active','missed','completed')
  ),
  joined_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(queue_id, wallet)
);

CREATE INDEX idx_entries_queue ON queue_entries(queue_id);
CREATE INDEX idx_entries_status ON queue_entries(queue_id, status);
CREATE INDEX idx_entries_wallet ON queue_entries(wallet);
