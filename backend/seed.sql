-- ============================================================================
-- SEED DATA FOR DEMO TENANT
-- Cloudflare D1 compatible
-- ============================================================================

-- Demo tenant
INSERT INTO tenants (tenant_key, company_name, subscription_tier, contact_email) VALUES
('demo', 'Demo Company', 'trial', 'demo@example.com');

-- Demo user (password: password123)
-- Note: You'll need to hash this password properly using bcrypt in your app
-- This is a placeholder hash
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) VALUES
(1, 'demo@example.com', '$2a$10$YourHashedPasswordHere', 'Demo', 'User', 'admin');

-- Demo company
INSERT INTO companies (tenant_id, name, type, industry) VALUES
(1, 'Acme Government Solutions', 'customer', 'Federal Contracting');

-- Demo contact
INSERT INTO contacts (tenant_id, first_name, last_name, email, company_id, is_decision_maker) VALUES
(1, 'John', 'Anderson', 'john@acme.gov', 1, 1);

-- Demo opportunity
INSERT INTO opportunities (tenant_id, name, company_id, type, stage, amount, probability, expected_revenue, owner_id) VALUES
(1, 'Federal Cloud Migration', 1, 'new_business', 'qualification', 2500000, 60, 1500000, 1);

-- Demo capture
INSERT INTO captures (tenant_id, name, customer_name, capture_type, current_phase, pwin, contract_value, capture_manager_id) VALUES
(1, 'DoD Cybersecurity Initiative', 'Department of Defense', 'joint', 'phase2_qualifying', 55, 5000000, 1);

-- Verification
SELECT 'Demo data loaded successfully!' as status;
SELECT COUNT(*) as tenant_count FROM tenants;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as company_count FROM companies;
SELECT COUNT(*) as opportunity_count FROM opportunities;
