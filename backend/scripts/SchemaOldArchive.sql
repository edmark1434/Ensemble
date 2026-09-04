-- Ensemble PostgreSQL schema notes for admin console data sources.
-- Canonical schema lives in backend/migrations (UUID primary keys).
-- This file documents the tables the admin console reads/writes.

-- Auth / identity
-- accounts, users, staff, account_verification

-- Teams
-- teams(team_id uuid PK, account_id uuid FK -> accounts)
-- team_members(team_id, user_id, role, status, joined_at, deleted_at)

-- Economy
-- wallets(wallet_id, type, status, balance_credits, frozen_balance_credits)
-- account_wallets(wallet_id, account_id)
-- credit_transactions(credit_transaction_id, type, amount_credits, status, source_wallet_id, destination_wallet_id)
-- configuration(configuration_key PK, name, description, current_value_literal, default_value_literal, updated_at)

-- Moderation / support
-- reports, disputes, violations, marketplace_listings
-- tickets (type/status/priority enums), ticket_chats (ticket_id + chat_id)

CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50) NOT NULL,
    handle VARCHAR(50) UNIQUE,
    avatar_file_id UUID,
    tagline VARCHAR(255),
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'User',
    merit_score INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    firebase_user_uuid VARCHAR(50),
    customer_id VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email_address VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    firebase_staff_uuid VARCHAR(50),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(50),
    email_address VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT
);

CREATE TABLE IF NOT EXISTS account_verification (
    account_verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(account_id),
    status VARCHAR(50) NOT NULL DEFAULT 'unverified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    verified_by_staff_id UUID REFERENCES staff(staff_id)
);

CREATE TABLE IF NOT EXISTS teams (
    team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID NOT NULL REFERENCES teams(team_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    balance_credits INTEGER NOT NULL DEFAULT 0,
    frozen_balance_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_wallets (
    wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
    account_id UUID NOT NULL REFERENCES accounts(account_id),
    PRIMARY KEY (wallet_id, account_id)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    credit_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    amount_credits INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fee_transaction_id UUID REFERENCES credit_transactions(credit_transaction_id),
    source_wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
    destination_wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
    related_dispute_id UUID
);

CREATE TABLE IF NOT EXISTS configuration (
    configuration_key VARCHAR(100) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    current_value_literal TEXT NOT NULL,
    default_value_literal TEXT NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(20) UNIQUE,
    by_account_id UUID REFERENCES accounts(account_id),
    for_account_id UUID REFERENCES accounts(account_id),
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    target_label VARCHAR(255),
    reason VARCHAR(100),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    assigned_staff_id UUID REFERENCES staff(staff_id),
    type VARCHAR(50),
    reference_table VARCHAR(50),
    reference_prefix VARCHAR(50),
    reference_id VARCHAR(50),
    is_created_by_bot BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS disputes (
    dispute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number VARCHAR(20) UNIQUE,
    title VARCHAR(255),
    reason TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) NOT NULL DEFAULT 'High',
    visibility BOOLEAN NOT NULL DEFAULT FALSE,
    by_account_id UUID NOT NULL REFERENCES accounts(account_id),
    for_account_id UUID NOT NULL REFERENCES accounts(account_id),
    handled_by_staff_id UUID REFERENCES staff(staff_id),
    escalated_by_staff_id UUID REFERENCES staff(staff_id),
    approved_at TIMESTAMPTZ,
    approved_by_staff_id UUID REFERENCES staff(staff_id),
    sanction_type VARCHAR(50),
    related_credit_transaction_id UUID REFERENCES credit_transactions(credit_transaction_id),
    credit_amount_involved INTEGER NOT NULL DEFAULT 0,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

-- Live DBs also add: credit_transactions.related_dispute_id → disputes(dispute_id)
-- (circular FK applied in migration 112 after both columns exist)

-- Link only: dispute_id → MongoDB inbox ObjectId (text). Message bodies live in Mongo
-- collections `inbox` + `messages` (conversation_type = 'dispute'). No Postgres messages table.
CREATE TABLE IF NOT EXISTS dispute_chats (
    dispute_id UUID PRIMARY KEY REFERENCES disputes(dispute_id),
    chat_id TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS violations (
    violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_number VARCHAR(20) UNIQUE,
    account_id UUID REFERENCES accounts(account_id),
    title VARCHAR(255),
    reason TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    type VARCHAR(50),
    staff_id UUID REFERENCES staff(staff_id),
    issued_by_staff_id UUID REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_number VARCHAR(20) UNIQUE,
    submitted_by_account_id UUID REFERENCES accounts(account_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    price_credits INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by_staff_id UUID REFERENCES staff(staff_id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_staff_account_id ON staff(account_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_account_verification_account ON account_verification(account_id);
