-- ============================================================================
-- ADDITIONAL TABLES FOR SAM.GOV INTEGRATION & AI PROPOSAL GENERATION
-- Run this after the main schema.sql
-- ============================================================================

-- SAM.gov Configuration
CREATE TABLE IF NOT EXISTS samgov_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL UNIQUE,
    api_key_encrypted TEXT,
    search_filters TEXT, -- JSON: { naics: [], setAsides: [], agencies: [] }
    auto_import INTEGER DEFAULT 0,
    import_frequency TEXT DEFAULT 'daily', -- daily, weekly, manual
    last_import TEXT,
    is_configured INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_samgov_config_tenant ON samgov_config(tenant_id);

-- Boilerplate Sections
CREATE TABLE IF NOT EXISTS boilerplate_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- company_overview, past_performance, technical_approach, etc.
    content TEXT NOT NULL,
    variables TEXT, -- JSON array of variable names like {{company_name}}, {{year}}
    is_active INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_boilerplate_tenant ON boilerplate_sections(tenant_id);
CREATE INDEX idx_boilerplate_category ON boilerplate_sections(tenant_id, category);

-- Proposal Packages
CREATE TABLE IF NOT EXISTS proposal_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    opportunity_id INTEGER,
    capture_id INTEGER,
    rfp_document_id INTEGER,
    title TEXT NOT NULL,
    solicitation_number TEXT,
    status TEXT CHECK(status IN ('draft', 'in_progress', 'review', 'submitted', 'won', 'lost')) DEFAULT 'draft',
    due_date TEXT,
    submitted_date TEXT,
    page_count INTEGER DEFAULT 0,
    completion_percentage REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
    FOREIGN KEY (capture_id) REFERENCES captures(id),
    FOREIGN KEY (rfp_document_id) REFERENCES rfp_documents(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_proposals_tenant ON proposal_packages(tenant_id);
CREATE INDEX idx_proposals_status ON proposal_packages(tenant_id, status);

-- Proposal Folders (Volume structure)
CREATE TABLE IF NOT EXISTS proposal_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    proposal_id INTEGER NOT NULL,
    parent_folder_id INTEGER,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (proposal_id) REFERENCES proposal_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_folder_id) REFERENCES proposal_folders(id)
);

CREATE INDEX idx_proposal_folders_tenant ON proposal_folders(tenant_id);
CREATE INDEX idx_proposal_folders_proposal ON proposal_folders(proposal_id);

-- Proposal Sections (Individual documents/sections)
CREATE TABLE IF NOT EXISTS proposal_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    folder_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    requires_boilerplate TEXT, -- category name if needs boilerplate
    boilerplate_id INTEGER,
    status TEXT CHECK(status IN ('not_started', 'in_progress', 'review', 'approved')) DEFAULT 'not_started',
    assigned_to INTEGER,
    word_count INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    ai_generated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES proposal_folders(id) ON DELETE CASCADE,
    FOREIGN KEY (boilerplate_id) REFERENCES boilerplate_sections(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_proposal_sections_tenant ON proposal_sections(tenant_id);
CREATE INDEX idx_proposal_sections_folder ON proposal_sections(folder_id);
CREATE INDEX idx_proposal_sections_status ON proposal_sections(status);

-- RFP Requirements (Parsed from RFP documents)
CREATE TABLE IF NOT EXISTS rfp_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    rfp_section_id INTEGER NOT NULL,
    requirement_text TEXT NOT NULL,
    requirement_type TEXT, -- mandatory, desirable, etc.
    compliance_status TEXT CHECK(compliance_status IN ('not_addressed', 'partial', 'full')) DEFAULT 'not_addressed',
    response_section_id INTEGER, -- Links to proposal_sections
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (rfp_section_id) REFERENCES rfp_sections(id),
    FOREIGN KEY (response_section_id) REFERENCES proposal_sections(id)
);

CREATE INDEX idx_rfp_requirements_tenant ON rfp_requirements(tenant_id);
CREATE INDEX idx_rfp_requirements_section ON rfp_requirements(rfp_section_id);

-- Compliance Matrix
CREATE TABLE IF NOT EXISTS compliance_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    proposal_id INTEGER NOT NULL,
    rfp_section TEXT NOT NULL,
    requirement TEXT NOT NULL,
    proposal_section TEXT,
    page_number INTEGER,
    compliance_status TEXT CHECK(compliance_status IN ('compliant', 'partial', 'non_compliant', 'not_applicable')) DEFAULT 'compliant',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (proposal_id) REFERENCES proposal_packages(id) ON DELETE CASCADE
);

CREATE INDEX idx_compliance_matrix_tenant ON compliance_matrix(tenant_id);
CREATE INDEX idx_compliance_matrix_proposal ON compliance_matrix(proposal_id);

-- AI Generation History
CREATE TABLE IF NOT EXISTS ai_generation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL, -- proposal_section, rfp_parse, requirement_extract
    entity_id INTEGER NOT NULL,
    prompt TEXT,
    response TEXT,
    tokens_used INTEGER,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_ai_log_tenant ON ai_generation_log(tenant_id);
CREATE INDEX idx_ai_log_entity ON ai_generation_log(entity_type, entity_id);

-- Update rfp_documents table (add if not exists)
-- ALTER TABLE rfp_documents ADD COLUMN proposal_due_date TEXT;
-- ALTER TABLE rfp_documents ADD COLUMN page_limit INTEGER;

-- Schema enhancement complete!
SELECT 'Enhanced schema loaded successfully!' as status;
