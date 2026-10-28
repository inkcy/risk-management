CREATE TABLE IF NOT EXISTS culture_surveys (
  year INTEGER PRIMARY KEY CHECK (year BETWEEN 2500 AND 2700),
  counts INTEGER[] NOT NULL CHECK (array_length(counts, 1) = 5),
  excellent_pct NUMERIC(5,2) NOT NULL CHECK (excellent_pct BETWEEN 0 AND 100),
  very_good_pct NUMERIC(5,2) NOT NULL CHECK (very_good_pct BETWEEN 0 AND 100),
  report_data BYTEA,
  report_type TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
