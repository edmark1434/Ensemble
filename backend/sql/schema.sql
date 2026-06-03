-- Ensemble PostgreSQL schema (minimal tables required for seed + auth)

CREATE TABLE IF NOT EXISTS accounts (
    account_id SERIAL PRIMARY KEY,
    display_name VARCHAR(50),
    handle VARCHAR(50) UNIQUE,
    avatar_file_id VARCHAR(255),
    tagline VARCHAR(255),
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'User',
    merit_score INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
    firebase_user_uuid VARCHAR(50),
    xendit_customer_id VARCHAR(50),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email_address VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
    firebase_staff_uuid VARCHAR(50),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(50),
    email_address VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_staff_account_id ON staff(account_id);
