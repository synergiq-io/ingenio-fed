// ============================================================================
// CLOUDFLARE WORKERS - MULTI-TENANT CRM API
// Secure, serverless backend with D1 database
// ============================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { bearerAuth } from 'hono/bearer-auth';
import * as bcrypt from 'bcryptjs';

// Type definitions
type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
};

type Variables = {
  user: {
    userId: number;
    tenantId: number;
    email: string;
    role: string;
  };
};

// Initialize Hono app
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS
app.use('/*', cors({
  origin: '*', // Configure for production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting middleware
async function rateLimit(c: any, identifier: string, limit: number = 100) {
  const db = c.env.DB;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60000).toISOString(); // 1 minute window
  
  // Clean old entries
  await db.prepare(
    'DELETE FROM rate_limits WHERE window_start < ?'
  ).bind(windowStart).run();
  
  // Get current count
  const result = await db.prepare(
    `SELECT count FROM rate_limits 
     WHERE identifier = ? AND endpoint = ? AND window_start >= ?`
  ).bind(identifier, c.req.path, windowStart).first();
  
  if (result && result.count >= limit) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  
  // Increment or insert
  await db.prepare(
    `INSERT INTO rate_limits (identifier, endpoint, count, window_start)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(identifier, endpoint, window_start) 
     DO UPDATE SET count = count + 1`
  ).bind(identifier, c.req.path, now.toISOString()).run();
  
  return null;
}

// JWT authentication middleware
app.use('/api/*', async (c, next) => {
  // Skip auth for login and register
  if (c.req.path.includes('/auth/login') || c.req.path.includes('/auth/register')) {
    return next();
  }
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const secret = c.env.JWT_SECRET;
    const payload = await verifyJWT(token, secret);
    
    c.set('user', {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role
    });
    
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

async function generateJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  const signature = await signHS256(`${encodedHeader}.${encodedPayload}`, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const [header, payload, signature] = token.split('.');
  
  const expectedSignature = await signHS256(`${header}.${payload}`, secret);
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  const decodedPayload = JSON.parse(atob(payload));
  
  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  
  return decodedPayload;
}

async function signHS256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToSign = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataToSign);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Encrypt sensitive data
async function encrypt(text: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').slice(0, 32)),
    'AES-GCM',
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...result));
}

// ============================================================================
// AUTH ROUTES
// ============================================================================

app.post('/api/auth/register', async (c) => {
  try {
    const { companyName, email, password, firstName, lastName } = await c.req.json();
    
    // Rate limit
    const rateLimited = await rateLimit(c, email, 5);
    if (rateLimited) return rateLimited;
    
    // Generate tenant key
    const tenantKey = companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const db = c.env.DB;
    
    // Check if tenant exists
    const existingTenant = await db.prepare(
      'SELECT id FROM tenants WHERE tenant_key = ?'
    ).bind(tenantKey).first();
    
    if (existingTenant) {
      return c.json({ error: 'Company name already registered' }, 400);
    }
    
    // Create tenant
    const tenantResult = await db.prepare(
      `INSERT INTO tenants (tenant_key, company_name, contact_email) 
       VALUES (?, ?, ?)`
    ).bind(tenantKey, companyName, email).run();
    
    const tenantId = tenantResult.meta.last_row_id;
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create admin user
    await db.prepare(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?, 'admin')`
    ).bind(tenantId, email, passwordHash, firstName, lastName).run();
    
    return c.json({
      message: 'Registration successful',
      tenantKey,
      tenantId
    }, 201);
  } catch (error: any) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed', details: error.message }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password, tenantKey } = await c.req.json();
    
    // Rate limit
    const rateLimited = await rateLimit(c, email, 10);
    if (rateLimited) return rateLimited;
    
    const db = c.env.DB;
    
    // Get tenant
    const tenant = await db.prepare(
      'SELECT id, is_active FROM tenants WHERE tenant_key = ?'
    ).bind(tenantKey).first();
    
    if (!tenant || !tenant.is_active) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Get user
    const user = await db.prepare(
      `SELECT * FROM users 
       WHERE tenant_id = ? AND email = ? AND is_active = 1`
    ).bind(tenant.id, email).first();
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash as string);
    if (!validPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Update last login
    await db.prepare(
      `UPDATE users SET last_login = datetime('now') WHERE id = ?`
    ).bind(user.id).run();
    
    // Generate JWT
    const token = await generateJWT(
      {
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
        role: user.role
      },
      c.env.JWT_SECRET
    );
    
    // Log activity
    await db.prepare(
      `INSERT INTO activity_log (tenant_id, user_id, activity_type, description)
       VALUES (?, ?, 'login', 'User logged in')`
    ).bind(tenant.id, user.id).run();
    
    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        tenantKey
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed', details: error.message }, 500);
  }
});

// ============================================================================
// OPPORTUNITIES ROUTES
// ============================================================================

app.get('/api/opportunities', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    
    const { stage, ownerId } = c.req.query();
    
    let query = `
      SELECT o.*, c.name as company_name, 
             u.first_name || ' ' || u.last_name as owner_name
      FROM opportunities o
      LEFT JOIN companies c ON o.company_id = c.id AND o.tenant_id = c.tenant_id
      LEFT JOIN users u ON o.owner_id = u.id AND o.tenant_id = u.tenant_id
      WHERE o.tenant_id = ?
    `;
    const params = [user.tenantId];
    
    if (stage) {
      query += ' AND o.stage = ?';
      params.push(stage);
    }
    
    if (ownerId) {
      query += ' AND o.owner_id = ?';
      params.push(parseInt(ownerId));
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const result = await db.prepare(query).bind(...params).all();
    
    return c.json(result.results || []);
  } catch (error: any) {
    console.error('Get opportunities error:', error);
    return c.json({ error: 'Failed to fetch opportunities' }, 500);
  }
});

app.post('/api/opportunities', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    const data = await c.req.json();
    
    const expectedRevenue = (data.amount || 0) * (data.probability || 0) / 100;
    
    const result = await db.prepare(
      `INSERT INTO opportunities 
       (tenant_id, name, company_id, type, stage, amount, probability, 
        expected_revenue, close_date, description, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.tenantId,
      data.name,
      data.companyId || null,
      data.type,
      data.stage || 'prospecting',
      data.amount || null,
      data.probability || 0,
      expectedRevenue,
      data.closeDate || null,
      data.description || null,
      user.userId
    ).run();
    
    // Log activity
    await db.prepare(
      `INSERT INTO activity_log (tenant_id, user_id, activity_type, entity_type, entity_id, description)
       VALUES (?, ?, 'create', 'opportunity', ?, ?)`
    ).bind(user.tenantId, user.userId, result.meta.last_row_id, `Created: ${data.name}`).run();
    
    const opportunity = await db.prepare(
      'SELECT * FROM opportunities WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return c.json(opportunity, 201);
  } catch (error: any) {
    console.error('Create opportunity error:', error);
    return c.json({ error: 'Failed to create opportunity' }, 500);
  }
});

app.put('/api/opportunities/:id', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    const id = c.req.param('id');
    const data = await c.req.json();
    
    // Verify ownership
    const existing = await db.prepare(
      'SELECT id FROM opportunities WHERE id = ? AND tenant_id = ?'
    ).bind(id, user.tenantId).first();
    
    if (!existing) {
      return c.json({ error: 'Opportunity not found' }, 404);
    }
    
    const updates = [];
    const params = [];
    
    if (data.name) { updates.push('name = ?'); params.push(data.name); }
    if (data.stage) { updates.push('stage = ?'); params.push(data.stage); }
    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
    if (data.probability !== undefined) { 
      updates.push('probability = ?'); 
      params.push(data.probability);
      updates.push('expected_revenue = ?');
      params.push((data.amount || 0) * data.probability / 100);
    }
    
    updates.push("updated_at = datetime('now')");
    params.push(id, user.tenantId);
    
    await db.prepare(
      `UPDATE opportunities SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...params).run();
    
    const opportunity = await db.prepare(
      'SELECT * FROM opportunities WHERE id = ?'
    ).bind(id).first();
    
    return c.json(opportunity);
  } catch (error: any) {
    console.error('Update opportunity error:', error);
    return c.json({ error: 'Failed to update opportunity' }, 500);
  }
});

// ============================================================================
// CONTACTS ROUTES
// ============================================================================

app.get('/api/contacts', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    
    const result = await db.prepare(
      `SELECT c.*, co.name as company_name
       FROM contacts c
       LEFT JOIN companies co ON c.company_id = co.id AND c.tenant_id = co.tenant_id
       WHERE c.tenant_id = ?
       ORDER BY c.last_name, c.first_name`
    ).bind(user.tenantId).all();
    
    return c.json(result.results || []);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch contacts' }, 500);
  }
});

app.post('/api/contacts', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    const data = await c.req.json();
    
    const result = await db.prepare(
      `INSERT INTO contacts 
       (tenant_id, first_name, last_name, email, phone, title, company_id, 
        contact_role, is_decision_maker, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.tenantId,
      data.firstName,
      data.lastName,
      data.email || null,
      data.phone || null,
      data.title || null,
      data.companyId || null,
      data.contactRole || null,
      data.isDecisionMaker ? 1 : 0,
      data.notes || null
    ).run();
    
    const contact = await db.prepare(
      'SELECT * FROM contacts WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return c.json(contact, 201);
  } catch (error: any) {
    return c.json({ error: 'Failed to create contact' }, 500);
  }
});

// ============================================================================
// COMPANIES ROUTES
// ============================================================================

app.get('/api/companies', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    
    const result = await db.prepare(
      'SELECT * FROM companies WHERE tenant_id = ? ORDER BY name'
    ).bind(user.tenantId).all();
    
    return c.json(result.results || []);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch companies' }, 500);
  }
});

app.post('/api/companies', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    const data = await c.req.json();
    
    const result = await db.prepare(
      `INSERT INTO companies 
       (tenant_id, name, type, industry, website, naics_codes, duns_number, cage_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.tenantId,
      data.name,
      data.type || 'customer',
      data.industry || null,
      data.website || null,
      data.naicsCodes ? JSON.stringify(data.naicsCodes) : null,
      data.dunsNumber || null,
      data.cageCode || null
    ).run();
    
    const company = await db.prepare(
      'SELECT * FROM companies WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return c.json(company, 201);
  } catch (error: any) {
    return c.json({ error: 'Failed to create company' }, 500);
  }
});

// ============================================================================
// CAPTURES ROUTES
// ============================================================================

app.get('/api/captures', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    
    const result = await db.prepare(
      `SELECT c.*, u.first_name || ' ' || u.last_name as capture_manager_name
       FROM captures c
       LEFT JOIN users u ON c.capture_manager_id = u.id
       WHERE c.tenant_id = ?
       ORDER BY c.created_at DESC`
    ).bind(user.tenantId).all();
    
    return c.json(result.results || []);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch captures' }, 500);
  }
});

app.post('/api/captures', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    const data = await c.req.json();
    
    const result = await db.prepare(
      `INSERT INTO captures 
       (tenant_id, name, customer_name, capture_type, current_phase, pwin,
        contract_value, rfp_release_date, proposal_due_date, capture_manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.tenantId,
      data.name,
      data.customerName,
      data.captureType,
      data.currentPhase || 'phase0_long_range',
      data.pwin || null,
      data.contractValue || null,
      data.rfpReleaseDate || null,
      data.proposalDueDate || null,
      user.userId
    ).run();
    
    const capture = await db.prepare(
      'SELECT * FROM captures WHERE id = ?'
    ).bind(result.meta.last_row_id).first();
    
    return c.json(capture, 201);
  } catch (error: any) {
    return c.json({ error: 'Failed to create capture' }, 500);
  }
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

app.get('/api/dashboard/kpis', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    
    // Total revenue
    const revenue = await db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM opportunities 
       WHERE tenant_id = ? AND stage = 'closed_won'`
    ).bind(user.tenantId).first();
    
    // Open opportunities
    const openOpps = await db.prepare(
      `SELECT COUNT(*) as count 
       FROM opportunities 
       WHERE tenant_id = ? AND stage NOT IN ('closed_won', 'closed_lost')`
    ).bind(user.tenantId).first();
    
    // Win rate
    const winRate = await db.prepare(
      `SELECT 
        CAST(COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS REAL) * 100.0 / 
        NULLIF(COUNT(CASE WHEN stage IN ('closed_won', 'closed_lost') THEN 1 END), 0) as win_rate
       FROM opportunities WHERE tenant_id = ?`
    ).bind(user.tenantId).first();
    
    // Pipeline value
    const pipeline = await db.prepare(
      `SELECT COALESCE(SUM(expected_revenue), 0) as total 
       FROM opportunities 
       WHERE tenant_id = ? AND stage NOT IN ('closed_won', 'closed_lost')`
    ).bind(user.tenantId).first();
    
    return c.json({
      totalRevenue: revenue?.total || 0,
      openOpportunities: openOpps?.count || 0,
      winRate: winRate?.win_rate || 0,
      pipelineValue: pipeline?.total || 0
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch KPIs' }, 500);
  }
});

app.get('/api/dashboard/pipeline-by-stage', async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;
    
    const result = await db.prepare(
      `SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as value
       FROM opportunities
       WHERE tenant_id = ? AND stage NOT IN ('closed_won', 'closed_lost')
       GROUP BY stage`
    ).bind(user.tenantId).all();
    
    return c.json(result.results || []);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch pipeline data' }, 500);
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// EXPORT
// ============================================================================

export default app;
