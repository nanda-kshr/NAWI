# NAWI Platform — OIML R76 Type Evaluation System

> Production-grade digital workflow for **Non-Automatic Weighing Instrument (NAWI)** type evaluation per **OIML R 76-1:2006**.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Flutter 3.7+
- MongoDB Atlas (or local MongoDB)

### 1. Backend (Next.js)

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set MONGODB_URI in .env.local

# Seed demo data
npm run seed

# Start dev server
npm run dev
# → http://localhost:3000
```

### 2. Seed Demo Data

```bash
cd backend
MONGODB_URI="mongodb+srv://..." npm run seed
```

**Demo credentials (password: `demo1234`):**

| Role | Email |
|------|-------|
| Admin | `admin@nawi.demo` |
| Technician | `tech@nawi.demo` |
| Reviewer | `reviewer@nawi.demo` |
| Approver | `approver@nawi.demo` |

### 3. Flutter Mobile App

```bash
cd frontend
flutter pub get
flutter run
```

---

## 🏗️ Architecture

```
NAWI/
├── backend/              # Next.js 16 — API + Web UI
│   ├── app/
│   │   ├── api/          # REST API routes
│   │   │   ├── auth/login/
│   │   │   ├── instruments/
│   │   │   ├── test-sessions/
│   │   │   ├── reports/
│   │   │   ├── equipment/
│   │   │   ├── dashboard/
│   │   │   ├── rules/
│   │   │   └── audit-logs/
│   │   ├── dashboard/    # Dashboard UI
│   │   ├── instruments/  # Instrument management
│   │   ├── test-sessions/# Test execution
│   │   ├── reports/      # Report repository
│   │   ├── equipment/    # Equipment management
│   │   └── audit-log/    # Audit trail
│   ├── lib/
│   │   ├── db.ts         # MongoDB connection
│   │   ├── models.ts     # All Mongoose models
│   │   ├── auth.ts       # JWT + RBAC
│   │   ├── audit.ts      # Audit logging
│   │   └── rules-engine/
│   │       └── oiml-r76.ts  # ← OIML R76 Rules Engine
│   └── scripts/
│       └── seed.ts       # Demo data seeder
│
├── frontend/             # Flutter mobile app
│   └── lib/
│       ├── main.dart
│       ├── theme/
│       ├── services/
│       │   ├── api_service.dart      # HTTP client
│       │   ├── auth_service.dart     # JWT auth
│       │   ├── local_db_service.dart # SQLite offline
│       │   └── sync_service.dart     # Online/offline sync
│       └── screens/
│           ├── login_screen.dart
│           ├── home_screen.dart
│           ├── instruments_screen.dart
│           ├── instrument_detail_screen.dart
│           ├── scan_screen.dart           # QR scanner
│           ├── test_sessions_screen.dart
│           ├── test_session_detail_screen.dart
│           ├── ar_assistant_screen.dart   # AR overlay
│           └── reports_screen.dart
│
└── docker-compose.yml
```

---

## 🔬 OIML R76 Rules Engine

The rules engine lives exclusively in [`backend/lib/rules-engine/oiml-r76.ts`](backend/lib/rules-engine/oiml-r76.ts).

**Test modules implemented:**

| Module | Standard Reference | Formula |
|--------|-------------------|---------|
| General Examination | Section 3 | Checklist pass/fail |
| Zero Indication | Section 4.2 | \|zero\| ≤ 0.25e `[OIML-VERIFY]` |
| Accuracy (Error) | Section 4.1, Table 1 | Error = Indication − Load; \|Error\| ≤ MPE |
| Repeatability | Section 4.5 | Range ≤ 0.5e `[OIML-VERIFY]` |
| Eccentricity | Section 4.3 | \|Position − Center\| ≤ 0.5e `[OIML-VERIFY]` |
| Tare | Section 4.4 | Zero + net accuracy checks `[OIML-VERIFY]` |
| Discrimination | Section 4.6 | 1.4d load → ≥ 1d change `[OIML-VERIFY]` |

> **`[OIML-VERIFY]`** — formulas marked with this tag should be verified against the official OIML R 76-1:2006 document before production use.

---

## 🔑 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET/POST | `/api/instruments` | List / create instruments |
| GET/PATCH | `/api/instruments/[id]` | Detail / update |
| GET/POST | `/api/test-sessions` | List / create sessions |
| GET/POST/PATCH | `/api/test-sessions/[id]` | Detail / submit obs / workflow |
| GET/POST | `/api/reports` | List / generate report |
| GET/PATCH | `/api/reports/[id]` | Detail / sign / finalize |
| GET | `/api/reports/[id]/html` | Full HTML report (print to PDF) |
| GET | `/api/dashboard` | Analytics & stats |
| GET/POST | `/api/equipment` | Equipment management |
| GET | `/api/rules` | OIML R76 test module definitions |
| GET | `/api/audit-logs` | Audit trail |

---

## 👤 User Roles (RBAC)

| Role | Capabilities |
|------|-------------|
| **Admin** | All access, user management, system config |
| **Technician** | Register instruments, conduct tests, enter observations |
| **Reviewer** | Review observations, request corrections, mark under review |
| **Approver** | Final sign-off, digitally finalize reports |

---

## 📱 Flutter Features

- **Offline-first** — SQLite local DB, sync queue
- **QR scanning** — `mobile_scanner`, decodes NAWI instrument QR
- **AR Test Assistant** — camera + contextual overlay guidance
- **Provider state management** — auth, sync, API
- **Connectivity monitoring** — auto-sync on reconnect

---

## 🐳 Docker

```bash
# Set environment variables
export MONGODB_URI="mongodb+srv://..."
export JWT_SECRET="your-secret"

# Run
docker-compose up -d
```

---

## 🎭 Demo Data

After seeding, the following demo data is available:

- **Lab:** National Metrology Institute Demo Lab
- **Instrument:** `NAWI-2024-0001` — Mettler Toledo ICS445, 150kg, Class III
- **Session:** `SES-2024-DEMO01` — 6 PASS + 1 intentional FAIL (Discrimination)
- **Report:** `NAWI-RPT-2024-0001` — Finalized, conditional conclusion
- **Equipment:** E2 reference weights, digital thermohygrometer
- **Audit log:** 8 seeded entries covering the full workflow

---

## ⚠️ Important Notes

1. **OIML-VERIFY** — Formulas tagged `[OIML-VERIFY]` must be verified against the official OIML R 76-1:2006 document
2. **Credentials** — Never commit `.env.local`. Use environment variables in production
3. **Report locking** — Finalized reports are immutable; revisions create a new version
4. **Audit trail** — All actions are logged and append-only
# NAWI
