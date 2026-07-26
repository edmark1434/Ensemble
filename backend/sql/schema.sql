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
    customer_id VARCHAR(255),
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

-- Platform configuration (JSON blobs keyed by section)
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by_staff_id INTEGER REFERENCES staff(staff_id)
);

-- User-submitted reports (feeds tickets & moderation)
CREATE TABLE IF NOT EXISTS reports (
    report_id SERIAL PRIMARY KEY,
    report_number VARCHAR(20) UNIQUE NOT NULL,
    by_account_id INTEGER REFERENCES accounts(account_id),
    for_account_id INTEGER REFERENCES accounts(account_id),
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    target_label VARCHAR(255),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    assigned_staff_id INTEGER REFERENCES staff(staff_id),
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

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    channel VARCHAR(50) NOT NULL DEFAULT 'web',
    requester_account_id INTEGER REFERENCES accounts(account_id),
    assigned_staff_id INTEGER REFERENCES staff(staff_id),
    assigned_role VARCHAR(50),
    related_report_id INTEGER REFERENCES reports(report_id),
    related_dispute_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Ticket conversation thread
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    author_account_id INTEGER REFERENCES accounts(account_id),
    author_type VARCHAR(20) NOT NULL DEFAULT 'user',
    author_name VARCHAR(100),
    body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes between members
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id SERIAL PRIMARY KEY,
    dispute_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) NOT NULL DEFAULT 'high',
    initiator_account_id INTEGER REFERENCES accounts(account_id),
    respondent_account_id INTEGER REFERENCES accounts(account_id),
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(100),
    assigned_staff_id INTEGER REFERENCES staff(staff_id),
    credit_amount_involved INTEGER NOT NULL DEFAULT 0,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- Account violations / strikes
CREATE TABLE IF NOT EXISTS violations (
    violation_id SERIAL PRIMARY KEY,
    violation_number VARCHAR(20) UNIQUE NOT NULL,
    account_id INTEGER REFERENCES accounts(account_id),
    title VARCHAR(255) NOT NULL,
    reason TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    issued_by_staff_id INTEGER REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace asset listing requests (Marketplace Moderator approval queue)
CREATE TABLE IF NOT EXISTS marketplace_listings (
    listing_id SERIAL PRIMARY KEY,
    listing_number VARCHAR(20) UNIQUE NOT NULL,
    submitted_by_account_id INTEGER REFERENCES accounts(account_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    price_credits INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by_staff_id INTEGER REFERENCES staff(staff_id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_related_dispute_id_fkey'
    ) THEN
        ALTER TABLE support_tickets
            ADD CONSTRAINT support_tickets_related_dispute_id_fkey
            FOREIGN KEY (related_dispute_id) REFERENCES disputes(dispute_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
