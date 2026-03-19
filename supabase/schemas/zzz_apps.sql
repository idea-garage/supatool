-- Remote last updated: 2024-01-01 00:00:00
CREATE TABLE zzz_apps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
