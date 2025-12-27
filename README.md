# 🚀 Synergiq Multi-Tenant CRM - Cloudflare Edition

**Production-ready, secure multi-tenant CRM platform built for Cloudflare's edge network.**

Deploy globally in minutes with:
- ⚡ **Cloudflare Workers** - Serverless backend
- 🗄️ **Cloudflare D1** - Serverless SQL database
- 🌐 **Cloudflare Pages** - React frontend
- 🔒 **Zero-trust security** - JWT auth, encrypted credentials, tenant isolation

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Deployment](#-deployment)
- [Development](#-development)
- [Configuration](#-configuration)
- [Security](#-security)
- [API Documentation](#-api-documentation)

---

## ✨ Features

### Multi-Tenant Architecture
- ✅ **Complete data isolation** per customer/company
- ✅ **Tenant-based authentication** with JWT
- ✅ **Row-level security** in database
- ✅ **Encrypted credentials** per tenant

### CRM Capabilities
- 📊 **Sales Pipeline** - Opportunities, stages, forecasting
- 👥 **Contact Management** - Decision makers, roles, relationships
- 🏢 **Company Tracking** - Customers, partners, competitors
- 🎯 **Capture Management** - Shipley 6-phase process
- 📄 **RFP/Proposal Management** - Document parsing, section tracking
- 🔐 **Credential Vault** - Secure integration storage

### Government Contracting
- 🏛️ **Gov Opportunities** - SAM.gov integration ready
- 🤝 **Teaming Partners** - Joint capture management
- 📋 **Compliance Tracking** - CAGE codes, NAICS, UEI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Cloudflare Pages (React Frontend)     │
│   Global CDN • Instant deploys          │
└─────────────────────────────────────────┘
                   │
                   │ HTTPS/REST API
                   ▼
┌─────────────────────────────────────────┐
│   Cloudflare Workers (Backend API)      │
│   Serverless • Edge computing           │
│   JWT Auth • Rate limiting              │
└─────────────────────────────────────────┘
                   │
                   │ SQL Queries
                   ▼
┌─────────────────────────────────────────┐
│   Cloudflare D1 (SQLite Database)       │
│   Serverless SQL • Multi-tenant         │
│   Tenant isolation • Encrypted data     │
└─────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Hono (lightweight framework) + TypeScript
- **Database:** Cloudflare D1 (SQLite)
- **Auth:** JWT with bcrypt password hashing
- **Deployment:** Cloudflare Workers + Pages

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works!)
- Git

### 1. Clone Repository

```bash
git clone https://github.com/your-username/synergiq-crm.git
cd synergiq-crm
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Setup Cloudflare

#### A. Install Wrangler CLI

```bash
npm install -g wrangler
```

#### B. Login to Cloudflare

```bash
wrangler login
```

#### C. Create D1 Database

```bash
cd backend
wrangler d1 create synergiq-crm
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "synergiq-crm"
database_id = "YOUR_DATABASE_ID_HERE"  # ← Paste here
```

#### D. Initialize Database

```bash
# Run schema migration
wrangler d1 execute synergiq-crm --file=./schema.sql

# Optional: Load demo data
wrangler d1 execute synergiq-crm --file=./seed.sql
```

#### E. Set Secrets

```bash
# Generate and set JWT secret
wrangler secret put JWT_SECRET
# Enter a random 32+ character string

# Generate and set encryption key
wrangler secret put ENCRYPTION_KEY
# Enter a random 32+ character string
```

### 4. Run Locally

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Runs on http://localhost:8787

# Terminal 2 - Frontend
cd frontend
cp .env.example .env
npm run dev
# Runs on http://localhost:3000
```

### 5. Access Application

Open **http://localhost:3000**

**Demo Credentials:**
- Tenant: `demo`
- Email: `demo@example.com`
- Password: `password123`

---

## 🌐 Deployment

### Automated Deployment (GitHub Actions)

1. **Fork this repository**

2. **Add GitHub Secrets:**
   - Go to Settings → Secrets and variables → Actions
   - Add secrets:
     - `CLOUDFLARE_API_TOKEN` - From Cloudflare dashboard
     - `VITE_API_URL` - Your Worker URL (e.g., `https://synergiq-crm-api.your-subdomain.workers.dev`)

3. **Push to main branch:**
   ```bash
   git push origin main
   ```

GitHub Actions will automatically deploy both backend and frontend!

### Manual Deployment

#### Deploy Backend

```bash
cd backend
npm run deploy
```

Your Worker will be live at: `https://synergiq-crm-api.YOUR-SUBDOMAIN.workers.dev`

#### Deploy Frontend

```bash
cd frontend

# Update .env with your Worker URL
echo "VITE_API_URL=https://synergiq-crm-api.YOUR-SUBDOMAIN.workers.dev" > .env

# Build and deploy
npm run build
npm run deploy
```

Your frontend will be live at: `https://synergiq-crm.pages.dev`

---

## 💻 Development

### Project Structure

```
synergiq-crm/
├── backend/
│   ├── src/
│   │   └── index.ts         # Worker entry point
│   ├── schema.sql           # D1 database schema
│   ├── seed.sql             # Demo data
│   ├── wrangler.toml        # Cloudflare config
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React app
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Tailwind styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
└── .github/
    └── workflows/
        └── deploy.yml       # CI/CD pipeline
```

### Database Management

```bash
# List all D1 databases
wrangler d1 list

# Execute SQL
wrangler d1 execute synergiq-crm --command="SELECT * FROM tenants"

# Backup database
wrangler d1 execute synergiq-crm --command=".dump" > backup.sql

# Local development database
wrangler d1 execute synergiq-crm --local --file=./schema.sql
```

### Viewing Logs

```bash
# Tail Worker logs in real-time
cd backend
wrangler tail
```

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## ⚙️ Configuration

### Environment Variables

**Backend (Secrets via Wrangler):**
```bash
wrangler secret put JWT_SECRET          # JWT signing key
wrangler secret put ENCRYPTION_KEY      # Credential encryption key
```

**Frontend (.env):**
```env
VITE_API_URL=https://your-worker.workers.dev
```

### Custom Domain

#### For Worker (Backend):

```bash
# In wrangler.toml
routes = [
  { pattern = "api.yourcompany.com", custom_domain = true }
]
```

#### For Pages (Frontend):

1. Go to Cloudflare Dashboard → Pages → Your Project → Custom domains
2. Add your domain (e.g., `app.yourcompany.com`)
3. Update DNS records as instructed

---

## 🔒 Security

### Authentication

- **JWT Tokens:** HS256 algorithm, 24-hour expiration
- **Password Hashing:** bcrypt with 10 rounds
- **Token Storage:** LocalStorage (HttpOnly cookies recommended for production)

### Data Protection

- **Tenant Isolation:** All queries filtered by `tenant_id`
- **Credential Encryption:** AES-GCM for sensitive data
- **Rate Limiting:** 100 requests/minute per IP
- **SQL Injection:** Parameterized queries only

### Production Checklist

- [ ] Change default secrets
- [ ] Enable HTTPS (Cloudflare auto-enables)
- [ ] Configure CORS for your domain
- [ ] Implement rate limiting per tenant
- [ ] Enable 2FA (future enhancement)
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Review and update security headers

---

## 📡 API Documentation

### Authentication

**POST** `/api/auth/register`
```json
{
  "companyName": "Acme Corp",
  "email": "admin@acme.com",
  "password": "secure-password",
  "firstName": "John",
  "lastName": "Doe"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "admin@acme.com",
  "password": "secure-password",
  "tenantKey": "acme-corp"
}
```

### Opportunities

**GET** `/api/opportunities` - List opportunities  
**POST** `/api/opportunities` - Create opportunity  
**PUT** `/api/opportunities/:id` - Update opportunity

### Companies

**GET** `/api/companies` - List companies  
**POST** `/api/companies` - Create company

### Contacts

**GET** `/api/contacts` - List contacts  
**POST** `/api/contacts` - Create contact

### Captures

**GET** `/api/captures` - List captures  
**POST** `/api/captures` - Create capture

### Dashboard

**GET** `/api/dashboard/kpis` - Get KPI metrics  
**GET** `/api/dashboard/pipeline-by-stage` - Pipeline breakdown

All endpoints (except auth) require `Authorization: Bearer <token>` header.

---

## 📊 Database Schema

Key tables with tenant isolation:

- `tenants` - Organizations using the CRM
- `users` - Users with tenant association
- `companies` - Customer/partner companies
- `contacts` - Individual contacts
- `opportunities` - Sales pipeline
- `captures` - Shipley capture process
- `teaming_partners` - Joint ventures
- `rfp_documents` - RFP uploads
- `credentials` - Encrypted integrations

All tables include `tenant_id` foreign key for complete data isolation.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file

---

## 🆘 Support

### Common Issues

**Issue:** Database not found
**Solution:** Run `wrangler d1 create synergiq-crm` and update `wrangler.toml`

**Issue:** Authentication fails
**Solution:** Ensure JWT_SECRET is set via `wrangler secret put JWT_SECRET`

**Issue:** CORS errors
**Solution:** Update ALLOWED_ORIGINS in `wrangler.toml`

### Getting Help

- 📧 Email: support@synergiq.com
- 💬 Discord: [Join our community](#)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

## 🎯 Roadmap

- [ ] Advanced reporting and analytics
- [ ] Email integration (SendGrid/Resend)
- [ ] Calendar sync (Google/Outlook)
- [ ] Mobile apps (React Native)
- [ ] AI-powered RFP parsing
- [ ] Workflow automation
- [ ] Advanced permissions
- [ ] Stripe billing integration
- [ ] SSO support (SAML/OAuth)

---

**Built with ❤️ for Government Contractors**

**Powered by Cloudflare's global network** 🌍

---

## 📦 Quick Deploy Commands

```bash
# One-time setup
git clone https://github.com/your-username/synergiq-crm.git
cd synergiq-crm
cd backend && npm install && cd ../frontend && npm install && cd ..

# Deploy everything
cd backend && wrangler d1 create synergiq-crm
# Update wrangler.toml with database_id
wrangler d1 execute synergiq-crm --file=./schema.sql
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
npm run deploy
cd ../frontend
echo "VITE_API_URL=https://your-worker-url.workers.dev" > .env
npm run build && npm run deploy
```

**Done! Your CRM is live globally! 🎉**
