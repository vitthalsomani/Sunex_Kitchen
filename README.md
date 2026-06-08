# SSPL Kitchen / Mess Management

Phase-1 web app for tracking factory mess daily meal headcount, purchases, monthly stock, and producing a cost-per-meal report. Designed to be merged into the main SSPL ERP later.

## Stack
- **Backend:** Python 3.12, FastAPI, Motor, MongoDB 7 (replica set), Redis 7
- **Frontend:** React 18, TypeScript 5.6, Vite 5, MUI v5, React Router v6, Axios
- **Infra:** Docker + Docker Compose
- **Testing:** pytest, Vitest, Playwright
- **Lint:** Ruff + mypy, ESLint + Prettier

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Backend: http://localhost:8090 (docs at `/docs`)
- Frontend: http://localhost:5180
- Mongo (host port): 27019  ·  Redis (host port): 6381
- Default admin login: `admin` / `admin123` (change in `.env`)

> The host ports are deliberately uncommon to avoid clashing with other local
> projects (e.g. CRM on 27017/6379, sunex_lab on 8000/5173). Change them
> in `docker-compose.yml` if you need different ports.

## Modules

### Masters
- Users (with roles: admin / data_entry / viewer)
- Contractors (with bulk CSV upload)
- Company Groups (e.g., Company Staff, Company Helper)
- Units (kg, litre, cylinder, piece, …)
- Item Categories (Grocery, Vegetables, Coal, Gas, Oil, …)
- Items (with category + unit reference)

### Transactional
- **Daily Meal Consumption** — one record per (date, shift) with contractor headcounts + company-group headcounts
- **Purchases** — per-item purchase entries
- **Monthly Stock** — opening + closing stock per item → derives consumption
- **Monthly Expenses** — manual manpower salary + contractor payment

### Reports
- **Monthly Mess Cost Analysis** — total meals, gas/coal, grocery & veg, oil, manpower, contractor payment, total expense, cost per meal

## Production deploy (sunexstones.com/mess)

```bash
# on the server
sudo mkdir -p /opt/sunex_mess
cd /opt/sunex_mess
git clone https://github.com/vitthalsomani/Sunex_Kitchen.git .
cp .env.prod.example .env
# edit .env: set JWT_SECRET (openssl rand -hex 64) and ADMIN_PASSWORD
./deploy/deploy.sh
```

The deploy script:
1. Builds and starts the prod stack (`docker-compose.prod.yml`)
   - Frontend: built React SPA served by nginx, bound to `127.0.0.1:3120`
   - Backend: FastAPI/uvicorn with `--root-path /mess/api`, bound to `127.0.0.1:3121`
   - Mongo + Redis: internal-only (no host port)
2. Installs `/etc/nginx/snippets/mess.conf` and includes it from `sunexstones.conf`
3. Reloads nginx → live at **https://sunexstones.com/mess/**

To update after a `git pull`, just re-run `./deploy/deploy.sh`.

## Local dev (without Docker)

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate     # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

You'll still need MongoDB (as a replica set) and Redis running locally.
