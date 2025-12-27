-- ============================================================================
-- CLOUDFLARE D1 MULTI-TENANT CRM DATABASE SCHEMA
-- Optimized for Cloudflare D1 with proper indexes and constraints
-- ============================================================================

-- ============================================================================
-- TENANT MANAGEMENT
-- ============================================================================

CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_key TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    subscription_tier TEXT CHECK(subscription_tier IN ('trial', 'basic', 'professional', 'enterprise')) DEFAULT 'trial',
    is_active INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 5,
    max_storage_mb INTEGER DEFAULT 1000,
    created_at TEXT DEFAULT (datetime('now')),
    subscription_start_date TEXT,
    subscription_end_date TEXT,
    settings TEXT,
    logo_url TEXT,
    contact_email TEXT,
    stripe_customer_id TEXT
);

CREATE INDEX idx_tenants_key ON tenants(tenant_key);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- Users with tenant association
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT CHECK(role IN ('admin', 'manager', 'user')) DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_email ON users(email);

-- API Keys for programmatic access
CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_used TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================================
-- CORE CRM ENTITIES
-- ============================================================================

CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('customer', 'partner', 'competitor', 'teaming_partner')) DEFAULT 'customer',
    industry TEXT,
    website TEXT,
    duns_number TEXT,
    cage_code TEXT,
    uei_number TEXT,
    naics_codes TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_companies_tenant ON companies(tenant_id);
CREATE INDEX idx_companies_type ON companies(tenant_id, type);

CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    title TEXT,
    company_id INTEGER,
    linkedin_url TEXT,
    is_decision_maker INTEGER DEFAULT 0,
    contact_role TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_company ON contacts(tenant_id, company_id);

CREATE TABLE opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    company_id INTEGER,
    type TEXT CHECK(type IN ('new_business', 'existing_business', 'recompete', 'task_order')),
    stage TEXT CHECK(stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')) DEFAULT 'prospecting',
    probability REAL DEFAULT 0,
    amount REAL,
    expected_revenue REAL,
    close_date TEXT,
    description TEXT,
    owner_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_stage ON opportunities(tenant_id, stage);
CREATE INDEX idx_opportunities_owner ON opportunities(tenant_id, owner_id);

-- ============================================================================
-- GOVERNMENT CONTRACTING
-- ============================================================================

CREATE TABLE captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    opportunity_id INTEGER,
    capture_type TEXT CHECK(capture_type IN ('sole', 'joint')),
    current_phase TEXT CHECK(current_phase IN (
        'phase0_long_range', 
        'phase1_positioning', 
        'phase2_qualifying', 
        'phase3_solution_dev', 
        'phase4_proposal', 
        'phase5_production'
    )) DEFAULT 'phase0_long_range',
    status TEXT CHECK(status IN ('active', 'on_hold', 'won', 'lost', 'no_bid')) DEFAULT 'active',
    pwin REAL,
    contract_value REAL,
    rfp_release_date TEXT,
    proposal_due_date TEXT,
    award_date TEXT,
    strategic_importance TEXT CHECK(strategic_importance IN ('low', 'medium', 'high', 'critical')),
    win_strategy TEXT,
    capture_manager_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
    FOREIGN KEY (capture_manager_id) REFERENCES users(id)
);

CREATE INDEX idx_captures_tenant ON captures(tenant_id);
CREATE INDEX idx_captures_phase ON captures(tenant_id, current_phase);
CREATE INDEX idx_captures_status ON captures(tenant_id, status);

CREATE TABLE teaming_partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    capture_id INTEGER NOT NULL,
    partner_company_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('prime', 'sub', 'joint_venture')),
    percentage_share REAL,
    capability_statement_url TEXT,
    is_approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (capture_id) REFERENCES captures(id),
    FOREIGN KEY (partner_company_id) REFERENCES companies(id)
);

CREATE INDEX idx_teaming_tenant ON teaming_partners(tenant_id);
CREATE INDEX idx_teaming_capture ON teaming_partners(capture_id);

CREATE TABLE gov_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    notice_id TEXT,
    title TEXT NOT NULL,
    solicitation_number TEXT,
    agency TEXT,
    sub_agency TEXT,
    type TEXT,
    set_aside TEXT,
    posted_date TEXT,
    response_deadline TEXT,
    description TEXT,
    source_system TEXT,
    is_monitored INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_gov_opps_tenant ON gov_opportunities(tenant_id);
CREATE INDEX idx_gov_opps_deadline ON gov_opportunities(response_deadline);

-- ============================================================================
-- RFP/PROPOSAL MANAGEMENT
-- ============================================================================

CREATE TABLE rfp_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    capture_id INTEGER,
    title TEXT NOT NULL,
    solicitation_number TEXT,
    file_url TEXT,
    file_size INTEGER,
    page_count INTEGER,
    parsing_status TEXT CHECK(parsing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    uploaded_at TEXT DEFAULT (datetime('now')),
    uploaded_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (capture_id) REFERENCES captures(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_rfp_docs_tenant ON rfp_documents(tenant_id);
CREATE INDEX idx_rfp_docs_capture ON rfp_documents(capture_id);

CREATE TABLE rfp_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    rfp_document_id INTEGER NOT NULL,
    section_number TEXT,
    section_title TEXT NOT NULL,
    section_type TEXT,
    requirements TEXT,
    deadline TEXT,
    assigned_to INTEGER,
    status TEXT CHECK(status IN ('not_started', 'in_progress', 'in_review', 'completed')) DEFAULT 'not_started',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (rfp_document_id) REFERENCES rfp_documents(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_rfp_sections_tenant ON rfp_sections(tenant_id);
CREATE INDEX idx_rfp_sections_doc ON rfp_sections(rfp_document_id);

-- ============================================================================
-- CREDENTIALS & INTEGRATIONS
-- ============================================================================

CREATE TABLE credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    system_name TEXT NOT NULL,
    credential_type TEXT CHECK(credential_type IN ('api_key', 'oauth', 'username_password')),
    username TEXT,
    encrypted_data TEXT,
    is_valid INTEGER DEFAULT 0,
    last_tested TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_credentials_tenant ON credentials(tenant_id);

-- ============================================================================
-- AUDIT & ACTIVITY
-- ============================================================================

CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER,
    activity_type TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX idx_activity_date ON activity_log(created_at);

-- ============================================================================
-- RATE LIMITING
-- ============================================================================

CREATE TABLE rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TEXT NOT NULL,
    UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

INSERT INTO tenants (id, tenant_key, company_name, subscription_tier, contact_email) VALUES
(1, 'demo', 'Demo Company', 'trial', 'demo@example.com');

-- Password: password123 (you'll need to hash this properly)
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) VALUES
(1, 'demo@example.com', '$2a$10$placeholder', 'Demo', 'User', 'admin');
