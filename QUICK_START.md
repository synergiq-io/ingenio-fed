# ⚡ QUICK START GUIDE

**Deploy your multi-tenant CRM to Cloudflare in 10 minutes!**

---

## 📦 What You're Getting

✅ **Production-ready React frontend** (TypeScript + Tailwind)  
✅ **Serverless backend API** (Cloudflare Workers + Hono)  
✅ **Multi-tenant SQL database** (Cloudflare D1)  
✅ **Complete security** (JWT auth, encryption, rate limiting)  
✅ **Auto-deployment** (GitHub Actions CI/CD)  
✅ **Global CDN** (Cloudflare's edge network)

---

## 🚀 Three Ways to Deploy

### Option 1: Automated Script (Easiest)

```bash
git clone https://github.com/your-username/synergiq-crm.git
cd synergiq-crm
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Install dependencies
- Create D1 database
- Set up secrets
- Deploy backend to Workers
- Deploy frontend to Pages

**Time: ~5 minutes**

---

### Option 2: Manual Steps (More Control)

#### Step 1: Clone & Install

```bash
git clone https://github.com/your-username/synergiq-crm.git
cd synergiq-crm

# Install all dependencies
npm run install:all
```

#### Step 2: Setup Cloudflare

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

#### Step 3: Create Database

```bash
cd backend

# Create D1 database
wrangler d1 create synergiq-crm

# Copy the database_id from output
# Paste it into backend/wrangler.toml:
#   database_id = "paste-here"

# Run schema migration
wrangler d1 execute synergiq-crm --file=./schema.sql

# (Optional) Load demo data
wrangler d1 execute synergiq-crm --file=./seed.sql
```

#### Step 4: Set Secrets

```bash
# Generate and set JWT secret (32+ chars)
wrangler secret put JWT_SECRET

# Generate and set encryption key (32 chars)
wrangler secret put ENCRYPTION_KEY
```

#### Step 5: Deploy Backend

```bash
npm run deploy

# Note the Worker URL, e.g.:
# https://synergiq-crm-api.your-subdomain.workers.dev
```

#### Step 6: Deploy Frontend

```bash
cd ../frontend

# Create .env file with your Worker URL
echo "VITE_API_URL=https://your-worker-url.workers.dev" > .env

# Build and deploy
npm run build
npm run deploy

# Your app is now live at:
# https://synergiq-crm.pages.dev
```

**Time: ~10 minutes**

---

### Option 3: GitHub Actions (Continuous Deployment)

#### Setup

1. **Fork this repository** on GitHub

2. **Add GitHub Secrets:**
   - Go to: Settings → Secrets and variables → Actions
   - Add:
     - `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard
     - `VITE_API_URL` - Your Worker URL

3. **Get Cloudflare API Token:**
   ```
   Cloudflare Dashboard → My Profile → API Tokens → Create Token
   Use template: "Edit Cloudflare Workers"
   ```

4. **Push to main branch:**
   ```bash
   git push origin main
   ```

GitHub Actions automatically deploys on every push!

**Time: ~3 minutes setup + auto deploys**

---

## 🧪 Local Development

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

Visit **http://localhost:3000** to see your CRM!

---

## 🔑 First Login

### Option A: Register New Company

1. Click **Register** tab
2. Enter:
   - Company Name: "Your Company"
   - Your Name & Email
   - Password
3. Click **Create Account**
4. Note your **Tenant Key** (auto-generated)
5. Switch to **Login** tab
6. Login with your tenant key + credentials

### Option B: Use Demo Account

If you loaded seed data:

- **Tenant:** `demo`
- **Email:** `demo@example.com`
- **Password:** `password123`

---

## 📁 Project Structure

```
synergiq-crm/
├── backend/              # Cloudflare Worker
│   ├── src/
│   │   └── index.ts     # API routes
│   ├── schema.sql       # Database schema
│   ├── seed.sql         # Demo data
│   ├── wrangler.toml    # Cloudflare config
│   └── package.json
│
├── frontend/            # React App
│   ├── src/
│   │   ├── App.tsx     # Main application
│   │   └── main.tsx    # Entry point
│   ├── vite.config.ts
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── deploy.yml  # CI/CD pipeline
│
├── deploy.sh           # Deployment script
├── README.md           # Full documentation
└── package.json        # Monorepo config
```

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Run both backend + frontend

# Database
cd backend
wrangler d1 execute synergiq-crm --command="SELECT * FROM tenants"
wrangler d1 execute synergiq-crm --file=./schema.sql

# Deployment
npm run deploy:backend   # Deploy API
npm run deploy:frontend  # Deploy app
npm run deploy          # Deploy everything

# Logs
cd backend
wrangler tail           # Real-time Worker logs
```

---

## 🌐 Custom Domains

### Backend (API)

Update `backend/wrangler.toml`:
```toml
routes = [
  { pattern = "api.yourcompany.com", custom_domain = true }
]
```

### Frontend (App)

1. Cloudflare Dashboard → Pages → synergiq-crm
2. Custom domains → Add domain
3. Follow DNS instructions

---

## ✅ Production Checklist

Before going live:

- [ ] Change default secrets (JWT_SECRET, ENCRYPTION_KEY)
- [ ] Update CORS origins in `backend/wrangler.toml`
- [ ] Set up custom domains
- [ ] Configure backups (D1 export)
- [ ] Enable monitoring/alerts
- [ ] Review security settings
- [ ] Test with real data
- [ ] Update API URLs in frontend .env

---

## 🆘 Troubleshooting

### Database not found
```bash
# Create database
wrangler d1 create synergiq-crm
# Update wrangler.toml with database_id
```

### Authentication fails
```bash
# Set JWT secret
wrangler secret put JWT_SECRET
```

### CORS errors
```bash
# Update wrangler.toml ALLOWED_ORIGINS
# Or add to frontend .env:
VITE_API_URL=https://your-actual-worker-url.workers.dev
```

### Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

---

## 📖 Next Steps

1. ✅ **Deploy to production** (you're here!)
2. 📚 Read [full documentation](README.md)
3. 🔒 Review [security guidelines](SECURITY.md)
4. 🎨 Customize branding and features
5. 📊 Add integrations (SAM.gov, etc.)
6. 🚀 Launch to customers!

---

## 💡 Pro Tips

### Fastest Way to Start

```bash
git clone https://github.com/your-username/synergiq-crm.git
cd synergiq-crm
./deploy.sh
```

### Check Status

```bash
# Backend
wrangler deployments list

# Frontend  
wrangler pages deployments list --project-name=synergiq-crm

# Database
wrangler d1 list
```

### Monitoring

```bash
# Watch logs in real-time
cd backend
wrangler tail
```

---

## 🎯 What's Included

- ✅ Multi-tenant architecture
- ✅ User authentication (JWT)
- ✅ Dashboard with KPIs
- ✅ Opportunities management
- ✅ Contact & company tracking
- ✅ Capture management (Shipley)
- ✅ RFP/Proposal tracking
- ✅ Credential vault
- ✅ Activity logging
- ✅ Rate limiting
- ✅ Data encryption
- ✅ Responsive design
- ✅ TypeScript throughout
- ✅ Production-ready

---

## 🆘 Get Help

- 📖 [Full Documentation](README.md)
- 🔒 [Security Policy](SECURITY.md)
- 💬 [GitHub Issues](https://github.com/your-repo/issues)
- 📧 [Email Support](mailto:support@synergiq.com)

---

**🎉 Congratulations! Your multi-tenant CRM is live on Cloudflare's global network!**

**Built with ❤️ for Government Contractors**
