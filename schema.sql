-- schema.sql

-- Table for storing pets
CREATE TABLE IF NOT EXISTS pets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,        -- Telegram user ID
    is_shiny BOOLEAN DEFAULT false,
    color TEXT NOT NULL,
    aura TEXT NOT NULL,
    eyes TEXT NOT NULL,
    pattern TEXT NOT NULL,
    hatched_at TIMESTAMP DEFAULT NOW()
);

-- Optional: index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
