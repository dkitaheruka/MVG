CREATE TABLE IF NOT EXISTS mvg_business_records (
  collection TEXT NOT NULL,
  record_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, record_key)
);

CREATE INDEX IF NOT EXISTS mvg_business_records_collection_position_idx
  ON mvg_business_records (collection, position);

CREATE TABLE IF NOT EXISTS mvg_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
