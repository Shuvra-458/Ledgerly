# 💰 Fathom

> A full-stack personal finance platform with an AI-powered review engine, transaction analytics, and a RAG-grounded knowledge pipeline.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

---

## ✨ Why This Project

Most portfolio finance trackers stop at CRUD + charts. This one goes further:

- **AI Financial Reviews** — Powered by Google Gemini, grounded in retrieved budgeting principles using a RAG (Retrieval-Augmented Generation) pipeline.
- **Graceful degradation** — If the LLM is unreachable, a templated review generator takes over. The feature never breaks.
- **Provider-agnostic LLM service** — Swap between Gemini, OpenAI, OpenRouter, or Ollama by editing environment variables and one file.
- **Production-grade Docker setup** — Multi-stage builds, health checks, authenticated MongoDB, named volumes, hot-reload for development.
- **Real security practices** — bcrypt password hashing, JWT cookies (`httpOnly`, `sameSite`), route-level authorization, ownership enforcement on every data access.

---

## 🎯 Features

### 🔐 Authentication
- User registration with server-side validation
- Secure password hashing via `bcryptjs` (10 rounds)
- JWT stored in `httpOnly` cookies (XSS-resistant)
- `protect` middleware for authenticated routes
- `redirectIfAuth` middleware to prevent authenticated users from seeing login/register pages
- HTML vs. JSON content negotiation (redirects for browsers, `401` for APIs)

### 💸 Transaction Management
- Full CRUD for income and expense entries
- Predefined categories (`Food`, `Rent`, `Salary`, `Transport`, etc.)
- Signed amount convention: income positive, expense negative
- Filtering by category, type, and date range
- Ownership enforcement — users can only see and modify their own data
- Summary cards: balance, monthly income, monthly expense, monthly net

### 📊 Dashboard Analytics
- Lifetime and monthly aggregations using MongoDB pipelines (`$group`, `$cond`, `$abs`, `$year`, `$month`)
- 6-month income vs. expense bar chart (Chart.js)
- Monthly expense doughnut chart by category
- Recent transactions table
- Responsive layout with full dark mode

### 🧠 AI Financial Reviews
- Generated per-user, per-month with idempotent upserts
- **RAG pipeline** retrieves relevant budgeting principles from a curated knowledge base
- **Two retrieval modes** — semantic (embeddings + cosine similarity) when available, keyword-based otherwise
- **Structured output** via Gemini's native JSON mode
- **Audit trail** — every review stores which principles grounded it, with relevance scores
- **Two-tier fallback** — LLM failure → templated review; embedding failure → keyword retrieval
- Sentiment badge (`positive` / `neutral` / `concerning`) derived from consistent rules
- Review history page

### 👤 Profile & Preferences
- Update name, email, and preferred currency
- Change password with current-password verification
- JWT cookie rotated after password change
- Email uniqueness enforced across accounts
- **Currency-aware display** — USD, EUR, GBP, INR, JPY; symbol propagates to dashboard, transactions, and chart labels

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20 (LTS) |
| **Web framework** | Express 4 |
| **Database** | MongoDB 7 |
| **ODM** | Mongoose 8 |
| **Templating** | EJS + `express-ejs-layouts` |
| **Auth** | `jsonwebtoken`, `bcryptjs`, `cookie-parser` |
| **AI / LLM** | Google Gemini via `@google/genai` |
| **Charts** | Chart.js 4 (CDN) |
| **Containerization** | Docker + Docker Compose |
| **Dev tooling** | nodemon (polling mode for Windows/Docker) |

---

## 🏗️ Architecture

```
┌──────────────┐      ┌────────────────────┐      ┌──────────────┐
│   Browser    │◄────►│  Express Server    │◄────►│   MongoDB    │
│  (EJS + JS)  │      │  (Node.js runtime) │      │  (auth on)   │
└──────────────┘      └─────────┬──────────┘      └──────────────┘
                                │
                                ├──────────────► Gemini API
                                │                (chat + JSON mode)
                                │
                                └──────────────► Gemini Embeddings
                                                 (optional, for semantic RAG)
```

### Request lifecycle for an AI review

```
POST /reviews/generate
   │
   ▼
[1] Snapshot ──── MongoDB aggregate: current + previous month + top categories
   │
   ▼
[2] Retrieval ── RAG: embed narrative → cosine similarity vs. tip embeddings
   │             └── fallback: keyword matching on derived "hot topics"
   ▼
[3] Prompt ───── Structured system prompt + financial snapshot + retrieved tips
   │
   ▼
[4] LLM ──────── Gemini generateContent (JSON mode, temp 0.3, retry w/ backoff)
   │             └── fallback: templated review generator
   ▼
[5] Parse ────── extractJson(): strips fences, brace-matches, validates shape
   │
   ▼
[6] Persist ──── upsert on { user, period.year, period.month }
   │
   ▼
[7] Render ───── Review panel with sentiment badge, advice, grounding audit
```

---

## 📂 Project Structure

```
finance-tracker/
├── config/
│   └── db.js                       # Mongoose connection
├── controllers/
│   ├── authController.js           # register / login / logout
│   ├── dashboardController.js      # analytics aggregations
│   ├── transactionController.js    # CRUD + filters
│   ├── reviewController.js         # LLM review generation + history
│   └── profileController.js        # profile details + password change
├── data/
│   └── financeTips.js              # Curated knowledge base for RAG
├── middleware/
│   ├── authMiddleware.js           # protect, redirectIfAuth
│   └── errorHandler.js             # notFound + centralized error renderer
├── models/
│   ├── User.js                     # bcrypt hooks, select:false password
│   ├── Transaction.js              # signed amounts, compound index
│   └── Review.js                   # snapshot + content + retrievedTips audit
├── public/
│   ├── css/style.css               # Design system (CSS variables, dark mode)
│   └── js/app.js                   # Theme toggle, toasts, loading states
├── routes/
│   ├── authRoutes.js
│   ├── transactionRoutes.js
│   ├── reviewRoutes.js
│   └── profileRoutes.js
├── scripts/
│   ├── seed.js                     # Generate demo transactions
│   ├── test-models.js              # Data layer smoke test
│   ├── diagnose-llm.js             # LLM provider health check
│   └── list-gemini-models.js       # Query available models for your key
├── services/
│   ├── llm.js                      # Provider-agnostic LLM client
│   ├── rag.js                      # Retrieval (semantic + keyword fallback)
│   └── financeReview.js            # Orchestrator + fallback + JSON extraction
├── utils/
│   ├── currency.js                 # Currency symbols + supported codes
│   └── generateToken.js            # JWT signing + cookie options
├── views/
│   ├── layouts/main.ejs
│   ├── partials/
│   │   ├── nav.ejs
│   │   └── review-panel.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── transactions/
│   │   ├── index.ejs
│   │   └── form.ejs
│   ├── reviews/
│   │   ├── index.ejs
│   │   └── show.ejs
│   ├── profile/
│   │   └── index.ejs
│   ├── dashboard.ejs
│   └── error.ejs
├── Dockerfile                      # Multi-stage: dev + production
├── docker-compose.yml              # app + mongo + healthchecks
├── docker-compose.dev.yml          # dev overrides (hot reload, Mongo Express)
├── nodemon.json                    # Polling config for Windows/Docker
├── .env.example                    # Template (safe to commit)
├── .env.docker.example             # Docker template (safe to commit)
├── .dockerignore
├── .gitignore
├── package.json
└── server.js                       # Entry point
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (with Compose v2)
- **Node.js 20+** (only if you want to run outside Docker)
- **Google Gemini API key** — free at https://aistudio.google.com/apikey

### 1. Clone and configure

```bash
git clone https://github.com/Shuvra-458/finance-tracker.git
cd finance-tracker
cp .env.docker.example .env.docker
```

Edit `.env.docker` and fill in your secrets:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://admin:supersecret@mongo:27017/finance_tracker?authSource=admin
JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRES_IN=7d

MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=supersecret
MONGO_DB=finance_tracker

LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
LLM_TIMEOUT_MS=30000
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Boot the stack

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### 3. Open in browser

| Service | URL |
|---|---|
| **App** | http://localhost:3000 |
| **Mongo Express** (dev only) | http://localhost:8081 |
| **Health check** | http://localhost:3000/health |

### 4. Seed demo data (optional)

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml exec app node scripts/seed.js
```

Then log in with:

```
Email:    demo@example.com
Password: demo1234
```

---

## 🔑 Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Runtime mode |
| `PORT` | No | `3000` | HTTP port |
| `MONGO_URI` | Yes | — | MongoDB connection string (with credentials in Docker) |
| `JWT_SECRET` | Yes | — | Signing key for JWT (use 64+ random bytes) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT lifetime |
| `MONGO_ROOT_USER` | Yes | — | Mongo init user (Compose substitution) |
| `MONGO_ROOT_PASSWORD` | Yes | — | Mongo init password |
| `MONGO_DB` | Yes | — | Database name |
| `LLM_PROVIDER` | Yes | `none` | `gemini` / `openrouter` / `none` |
| `GEMINI_API_KEY` | If Gemini | — | Google AI Studio key |
| `GEMINI_MODEL` | No | `gemini-3.8-flash` | Chat model |
| `GEMINI_EMBEDDING_MODEL` | No | `text-embedding-004` | Embeddings model |
| `LLM_TIMEOUT_MS` | No | `30000` | Per-call timeout |

> 💡 **Never commit `.env.docker` or `.env`.** Only the `.example` files belong in git.

---

## 🛣️ Routes Reference

### Authentication

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/register` | Registration form | Public (redirects if logged in) |
| `POST` | `/register` | Create account, set JWT cookie | Public |
| `GET` | `/login` | Login form | Public |
| `POST` | `/login` | Verify credentials, set cookie | Public |
| `POST` | `/logout` | Clear cookie | Any |

### Transactions

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/transactions` | List with filters (`category`, `type`, `from`, `to`) | 🔒 |
| `GET` | `/transactions/new` | New transaction form | 🔒 |
| `POST` | `/transactions` | Create | 🔒 |
| `GET` | `/transactions/:id/edit` | Edit form | 🔒 (owner only) |
| `POST` | `/transactions/:id` | Update | 🔒 (owner only) |
| `POST` | `/transactions/:id/delete` | Delete | 🔒 (owner only) |

### Dashboard, Reviews & Profile

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/dashboard` | Analytics + review panel | 🔒 |
| `GET` | `/reviews` | Review history list | 🔒 |
| `POST` | `/reviews/generate` | Generate/regenerate current-month review | 🔒 |
| `GET` | `/reviews/:id` | View single review | 🔒 (owner only) |
| `GET` | `/profile` | Profile page (details + password) | 🔒 |
| `POST` | `/profile` | Update name, email, currency | 🔒 |
| `POST` | `/profile/password` | Change password | 🔒 |

### Utility

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe (uptime, status) |

---

## 🗄️ Data Models

### `User`

| Field | Type | Notes |
|---|---|---|
| `name` | String | 2–50 chars, trimmed |
| `email` | String | Unique, lowercased, validated |
| `password` | String | bcrypt-hashed, `select: false` |
| `currency` | String | Enum: USD, EUR, GBP, INR, JPY |
| `timestamps` | — | `createdAt`, `updatedAt` |

**Instance method:** `matchPassword(plain)` → boolean (bcrypt compare)

### `Transaction`

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | Ref `User`, indexed |
| `title` | String | Max 100 chars |
| `amount` | Number | Signed: + income, − expense |
| `type` | String | Enum: `income` / `expense` |
| `category` | String | Enum from predefined list |
| `date` | Date | Indexed |
| `notes` | String | Optional, max 500 chars |
| `timestamps` | — | |

**Compound index:** `{ user: 1, date: -1 }` for fast dashboard queries
**Virtual:** `displayAmount` returns `💰 +$123.45` style string

### `Review`

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | Ref `User`, indexed |
| `period` | Object | `{ month, year }` |
| `snapshot` | Object | Financial stats used at generation time |
| `content` | Object | `{ headline, summary, expenseReview, incomeReview, advice[], sentiment }` |
| `retrievedTips` | Array | Audit trail: `[{ id, text, score }]` |
| `source` | String | Enum: `llm` / `fallback` |
| `model` | String | Model name used |
| `tokensUsed` | Object | `{ prompt, completion }` |

**Unique index:** `{ user, period.year, period.month }` — one review per user per month

---

## 🧠 AI & RAG Pipeline in Detail

### Knowledge base

`data/financeTips.js` contains 15 curated budgeting principles, each tagged with topics for keyword fallback:

```js
{
  id: 'rule-50-30-20',
  topics: ['budgeting', 'savings', 'overview'],
  text: 'The 50/30/20 rule: aim for 50% of take-home pay on needs...'
}
```

### Retrieval

`services/rag.js` implements a two-tier retrieval strategy:

1. **Semantic** (preferred) — Embeds a natural-language narrative of the user's financial snapshot using Gemini, then ranks tips via cosine similarity.
2. **Keyword** (fallback) — Derives "hot topics" from the snapshot (e.g., low savings rate → `savings` topic) and scores tips by topic overlap.

The choice is automatic based on `llm.supportsEmbeddings()`. Both modes are legitimate and both are recorded in `retrievedTips` with scores.

### Generation

`services/financeReview.js` orchestrates:

1. **Snapshot** — 4 parallel MongoDB aggregations (current month, previous month, top categories, transaction count)
2. **Retrieval** — top-3 relevant tips via RAG
3. **LLM call** — Gemini with JSON mode, temperature 0.3, retry with exponential backoff (1s/2s/4s)
4. **Parse** — `extractJson()` handles markdown fences, preamble, and truncated output
5. **Validate** — enforces required keys and sentiment enum
6. **Persist** — idempotent upsert

### Fallback

If the LLM fails after retries, `fallbackReview()` generates a deterministic, template-based review from the snapshot alone. Users never see an empty panel.

---

## 🐳 Docker

### Multi-stage build

| Stage | Purpose |
|---|---|
| `base` | Shared Node 20 Alpine + `dumb-init` + `package*.json` |
| `development` | Installs all deps, runs `nodemon` |
| `prod-deps` | Installs only production deps |
| `production` | Copies prod deps + source, runs as non-root user, health check |

### Services

- **`mongo`** — MongoDB 7 with authenticated root user, named volume, health check
- **`app`** — Express server, depends on `mongo` being healthy
- **`mongo-express`** — MongoDB admin UI (dev only)

### Common commands

```bash
# Dev (hot reload + admin UI)
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml up --build

# Stop (keep data)
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml down

# Stop and wipe volumes (destroys DB)
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml down -v

# Logs
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml logs -f app

# Shell into app
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml exec app sh

# Shell into Mongo
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml exec mongo mongosh -u admin -p supersecret
```

### Hot reload on Windows

File events don't propagate reliably from Windows to the WSL2 VM that runs Docker. `nodemon.json` enables polling to work around this:

```json
{
  "legacyWatch": true,
  "polling": true,
  "pollingInterval": 1000,
  "delay": 500
}
```

Result: ~1–2 second delay on restarts, but 100% reliable.

---

## 🧪 Testing

### Smoke test the data layer

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml exec app node scripts/test-models.js
```

Verifies: bcrypt hashing, `matchPassword`, transaction creation, aggregation sums, and cleanup.

### Diagnose the LLM

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml exec app node scripts/diagnose-llm.js
```

Checks: provider config, API key presence, `isEnabled()`, `supportsEmbeddings()`, and runs a live completion + embedding call.

### List available Gemini models

```bash
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.dev.yml exec app node scripts/list-gemini-models.js
```

Useful when Gemini deprecates a model name and you need to know what's currently available for your key.

---

## 🔐 Security Notes

- **Passwords** hashed with bcrypt (10 rounds), `select: false` to prevent accidental exposure
- **JWT** stored in `httpOnly`, `sameSite: 'lax'` cookies; `secure: true` in production
- **CSRF** mitigated by `sameSite` cookie policy (add CSRF tokens for higher assurance)
- **Ownership enforcement** on every transaction and review access — users cannot read or modify other users' data, even by guessing IDs
- **Input validation** server-side (length, enum, numeric range) — no trust in client
- **Generic auth errors** on login to prevent account enumeration
- **Password change requires current password** — protects against session hijacking
- **Secrets** never committed — `.env*` in `.gitignore`, only `.example` templates tracked

For production deployment:
- Add rate limiting (`express-rate-limit`) on auth endpoints
- Add Helmet for secure headers
- Enable Mongo `--auth` explicitly and use a scoped application user
- Put the app behind a reverse proxy (nginx/Caddy) with TLS
- Rotate the JWT secret on a schedule

---

## 🌳 Branching Strategy

- **`main`** — Stable, tagged releases only. Every commit here is demo-ready.
- **`develop`** — Integration branch for completed features before merging to `main`.
- **`feature/<name>`** — One branch per enhancement (e.g., `feature/plaid-sync`, `feature/csv-export`).
- **`fix/<name>`** — Bug fixes that need isolated testing.
- **`chore/<name>`** — Tooling, docs, dependency bumps.

**Workflow:**

```bash
git checkout main && git pull
git checkout -b feature/plaid-sync
# ... work, commit often ...
git push -u origin feature/plaid-sync
# Open PR → review → squash-merge into develop
# Periodically: develop → main when stable
```

**Commit convention:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

---

## 🗺️ Roadmap

### ✅ Shipped

- [x] Docker Compose (app + Mongo + Mongo Express)
- [x] Authentication (register / login / logout)
- [x] Transaction CRUD with filtering
- [x] Dashboard analytics with Chart.js
- [x] AI Financial Reviews (RAG + Gemini + fallback)
- [x] Polished UI with dark mode
- [x] Centralized error handling
- [x] Hot reload for Docker on Windows
- [x] Profile page (details + password change)
- [x] User-selectable currency display (USD, EUR, GBP, INR, JPY)

### 🚧 Planned

- [ ] **CSV / PDF export** — streamable exports of filtered transactions
- [ ] **Plaid bank sync** — OAuth-style token exchange, webhook-driven transaction ingestion, deduplication
- [ ] **Receipt OCR** — Vision AI extracts merchant/amount/date from uploaded images
- [ ] **Weekly email reports** — `node-cron` + SendGrid digest with AI summary
- [ ] **Live exchange rates** — convert amounts across currencies with TTL caching
- [ ] **CLI companion** — `node cli/cli.js add "Groceries" -50 food`
- [ ] **Budget alerts** — threshold-based notifications
- [ ] **Swagger / OpenAPI docs** — auto-generated API reference
- [ ] **Automated tests** — Jest + Supertest for controller + integration tests

### 🎁 Stretch

- [ ] Multi-user shared dashboards (household mode)
- [ ] Recurring transaction detection
- [ ] Goals and envelope budgeting
- [ ] Two-factor authentication (TOTP)
- [ ] Native mobile app (React Native, same API)

---

## 🤝 Contributing

This is a personal portfolio project, but issues and suggestions are welcome.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'feat: add your feature'`)
4. Push (`git push origin feature/your-feature`)
5. Open a Pull Request

Conventional commit style is preferred (`feat:`, `fix:`, `chore:`, `docs:`).

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Shuvrajyoti Nayak**

- GitHub: [@Shuvra-458](https://github.com/Shuvra-458)
- Project: [finance-tracker](https://github.com/Shuvra-458/finance-tracker)

---

## 🙏 Acknowledgments

- [Chart.js](https://www.chartjs.org/) for the visualizations
- [Google AI Studio](https://aistudio.google.com/) for the free Gemini API tier
- [MongoDB University](https://university.mongodb.com/) for aggregation pipeline references
- The countless open-source maintainers of Express, Mongoose, and EJS

---

<p align="center">
  Built with ☕ and a healthy respect for graceful degradation.
</p>