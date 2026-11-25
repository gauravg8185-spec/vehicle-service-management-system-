import { getDb } from './connection';

export function initializeSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL DEFAULT 'Commercial Fleet',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      vin TEXT NOT NULL UNIQUE,
      license_plate TEXT NOT NULL UNIQUE,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      vehicle_type TEXT NOT NULL DEFAULT 'Van',
      fuel_type TEXT NOT NULL DEFAULT 'Diesel',
      odometer_km INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active',
      last_service_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      task_name TEXT NOT NULL,
      interval_km INTEGER NOT NULL DEFAULT 10000,
      interval_days INTEGER NOT NULL DEFAULT 180,
      last_completed_km INTEGER NOT NULL DEFAULT 0,
      last_completed_date TEXT NOT NULL,
      next_due_km INTEGER NOT NULL,
      next_due_date TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Standard',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      service_type TEXT NOT NULL,
      bay_number TEXT NOT NULL DEFAULT 'Bay 1',
      assigned_technician TEXT NOT NULL DEFAULT 'Unassigned',
      priority TEXT NOT NULL DEFAULT 'Standard',
      status TEXT NOT NULL DEFAULT 'Scheduled',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS repair_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      appointment_id INTEGER,
      service_date TEXT NOT NULL,
      odometer_at_service INTEGER NOT NULL,
      service_category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      technician TEXT NOT NULL,
      labor_hours REAL NOT NULL DEFAULT 0,
      labor_rate REAL NOT NULL DEFAULT 850,
      parts_cost REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Completed',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES service_appointments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS repair_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (repair_id) REFERENCES repair_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      repair_id INTEGER,
      vehicle_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      labor_charge REAL NOT NULL DEFAULT 0,
      parts_charge REAL NOT NULL DEFAULT 0,
      shop_supplies REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      payment_method TEXT NOT NULL DEFAULT 'UPI (GPay / PhonePe / Paytm)',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (repair_id) REFERENCES repair_records(id) ON DELETE SET NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_vehicle ON maintenance_schedules(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON service_appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON service_appointments(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_vehicle ON repair_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_repair ON invoices(repair_id);
  `);
}
