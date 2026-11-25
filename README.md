# FleetCare Service Desk — Vehicle Service Management System

A full-stack, modular **Vehicle Service Management System (VSMS)** built with **React**, **TypeScript**, **Tailwind CSS**, **Express**, and **SQLite** (`better-sqlite3`). Designed for fleet operators and service workshops to register customers and vehicles, schedule bay appointments, track preventive maintenance intervals and repair history, and calculate itemized service invoices.

---

## Core Modules

1. **Fleet Overview Dashboard**
   - Live operational KPIs (active fleet count, vehicles in service, overdue maintenance intervals, pending/collected billing).
   - Preventive maintenance alerts with one-click appointment booking.
   - Upcoming bay queue, recent repair logs, and recent invoices.

2. **Module 1 — Register Customer & Vehicle Details**
   - Manage commercial fleet accounts, logistics partners, and individual vehicle owners (`+91` contacts and Indian depot addresses).
   - Register vehicles with Chassis/VIN, RTO registration number (e.g. `MH-14-FC-4021`), make/model/year, vehicle type, fuel/powertrain, odometer reading, and operational status.
   - Click any vehicle to open its complete **Service Dossier** (owner details, maintenance schedules, appointment history, repair history, and billing).

3. **Module 2 — Book Service Appointments**
   - Schedule service appointments linked to registered vehicles and owners.
   - Assign workshop bays, time slots, technicians, and priority levels (`Standard` / `Urgent`).
   - Transition appointments across `Scheduled → In Bay → Completed / Cancelled` (automatically syncing vehicle `In Service` / `Active` status) and convert in-bay appointments directly into repair records.

4. **Module 3 — Manage Repair Records & Maintenance Schedules**
   - Log repair records with diagnostic notes, odometer-at-service, technician, labor hours/rate (₹), and dynamic itemized parts/fluids/diagnostics.
   - Automatically synchronizes vehicle odometer readings and last service dates.
   - Track recurring **Preventive Maintenance Schedules** (by both kilometer interval and calendar days) with automatic health classification (`Overdue`, `Due Soon`, `Upcoming`) and one-click interval completion.

5. **Module 4 — Calculate Service Charges & Generate Invoices**
   - Import labor and parts directly from completed repair records or build custom service charges in INR (`₹`).
   - Live server-validated calculation of labor, parts, consumables, AMC/fleet discounts, GST (18% split into CGST + SGST), and grand total.
   - Supports Indian payment modes (**UPI — GPay / PhonePe / Paytm**, **NEFT / RTGS / IMPS**, **Corporate NetBanking**, **Card**, **Cheque**, **Cash**), sequential tax invoice numbers (`INV-YYYY-XXXX`), and print-ready GST invoice sheets.

---

## Project Architecture

```text
├── server.ts                          # Express entry point (API + Vite dev/prod static serving)
├── index.html                         # HTML entry & Google Fonts (Plus Jakarta Sans, Public Sans, JetBrains Mono)
├── package.json                       # Scripts and dependencies
├── .env.example                       # Environment variable template
├── data/                              # Auto-created SQLite database directory (gitignored)
└── src/
    ├── api/
    │   └── client.ts                  # Typed frontend REST API client
    ├── components/
    │   ├── common/                    # Reusable Modal, EmptyState, LoadingRows, StatusText
    │   ├── layout/                    # Sidebar navigation and TopBar header
    │   └── modules/                   # Overview + Modules 1–4 UI views
    ├── server/
    │   ├── db/
    │   │   ├── connection.ts          # SQLite singleton (WAL mode, foreign keys enabled)
    │   │   ├── schema.ts              # Relational DDL schema & indexes
    │   │   └── seed.ts                # Initial realistic fleet seed data (runs only when DB is empty)
    │   ├── middleware/
    │   │   └── errorHandler.ts        # Centralized Zod, HTTP, and SQLite constraint error handler
    │   ├── routes/
    │   │   ├── index.ts               # Modular API router aggregator
    │   │   ├── dashboard.ts           # GET /api/dashboard
    │   │   ├── customers.ts           # CRUD /api/customers
    │   │   ├── vehicles.ts            # CRUD /api/vehicles (+ GET /:id dossier)
    │   │   ├── appointments.ts        # CRUD /api/appointments (+ PATCH /:id/status)
    │   │   ├── repairs.ts             # CRUD /api/repairs (transactional line items)
    │   │   ├── schedules.ts           # CRUD /api/schedules (+ POST /:id/complete)
    │   │   └── invoices.ts            # CRUD /api/invoices (+ PATCH /:id/status)
    │   └── validators/
    │       └── schemas.ts             # Zod request validation schemas
    ├── types/
    │   └── fleet.ts                   # Shared TypeScript interfaces
    ├── utils/
    │   └── formatters.ts              # Currency, mileage, and date helpers
    ├── App.tsx                        # Workspace shell & cross-module state orchestration
    ├── index.css                      # Tailwind CSS v4 tokens & @media print invoice styling
    └── main.tsx                       # React entry point
```

---

## Database Schema

The application uses a normalized relational SQLite database (`data/fleetcare.db`) with foreign-key enforcement (`PRAGMA foreign_keys = ON`):

- `customers` — Fleet and individual customer contact records.
- `vehicles` — Registered vehicles linked via `customer_id` (`ON DELETE CASCADE`).
- `maintenance_schedules` — Preventive interval rules (`interval_km`, `interval_days`, `next_due_km`, `next_due_date`) linked via `vehicle_id`.
- `service_appointments` — Bay bookings linked via `vehicle_id` and `customer_id`.
- `repair_records` — Repair and service logs linked via `vehicle_id` and optional `appointment_id`.
- `repair_line_items` — Itemized parts, fluids, diagnostics, and labor rows linked via `repair_id`.
- `invoices` — Financial billing records linked via `vehicle_id`, `customer_id`, and optional `repair_id`.

---

## Local Setup & Installation

### Prerequisites

- **Node.js** `v20+` (tested on Node `v22`)
- **npm** `v10+`

### 1. Clone the repository

```bash
git clone <your-github-repo-url>
cd <repo-folder>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables (optional)

Copy `.env.example` to `.env` if you want to customize the server port or database path:

```bash
cp .env.example .env
```

Default configuration:
- `PORT=3000`
- `SQLITE_DB_PATH=./data/fleetcare.db`

### 4. Start the development server

```bash
npm run dev
```

This starts the Express server with Vite middleware at **http://localhost:3000**. On first boot, the SQLite database schema is created automatically and populated with sample fleet vehicles, appointments, maintenance schedules, repair logs, and invoices.

### 5. Build & run in production

```bash
npm run build
npm start
```

### 6. Type-checking

```bash
npm run lint
```

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/dashboard` | Aggregated fleet KPIs, alerts, upcoming bays, recent logs |
| `GET / POST` | `/api/customers` | List/search customers or register a new customer |
| `PUT / DELETE` | `/api/customers/:id` | Update or remove a customer account |
| `GET / POST` | `/api/vehicles` | List/filter fleet vehicles or register a new vehicle |
| `GET / PUT / DELETE` | `/api/vehicles/:id` | Fetch full vehicle dossier, update details, or delete vehicle |
| `GET / POST` | `/api/appointments` | List/filter service appointments or book a new bay slot |
| `PATCH / DELETE` | `/api/appointments/:id/status` | Transition appointment status (`Scheduled`, `In Bay`, `Completed`, `Cancelled`) |
| `GET / POST` | `/api/repairs` | List repair logs or record a repair with itemized line items |
| `PUT / DELETE` | `/api/repairs/:id` | Edit or delete a repair record |
| `GET / POST` | `/api/schedules` | List maintenance schedules (with health status) or add a rule |
| `POST / DELETE` | `/api/schedules/:id/complete` | Record completion mileage/date and advance next due thresholds |
| `GET / POST` | `/api/invoices` | List invoices or calculate charges and generate a new invoice |
| `PATCH / DELETE` | `/api/invoices/:id/status` | Update payment status (`Pending`, `Paid`, `Overdue`) |
