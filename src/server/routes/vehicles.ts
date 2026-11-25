import { Router } from 'express';
import { getDb } from '../db/connection';
import { HttpError } from '../middleware/errorHandler';
import { vehicleSchema } from '../validators/schemas';

export function computeScheduleHealth(
  nextDueKm: number,
  nextDueDate: string,
  currentOdometerKm: number
): 'Overdue' | 'Due Soon' | 'Upcoming' {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const twoWeeks = new Date(today.getTime());
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const twoWeeksIso = twoWeeks.toISOString().slice(0, 10);

  if (currentOdometerKm >= nextDueKm || todayIso > nextDueDate) {
    return 'Overdue';
  }
  if (nextDueKm - currentOdometerKm <= 1500 || nextDueDate <= twoWeeksIso) {
    return 'Due Soon';
  }
  return 'Upcoming';
}

export const vehiclesRouter = Router();

vehiclesRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (search) {
      clauses.push(
        '(v.vin LIKE ? OR v.license_plate LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR c.name LIKE ? OR c.company_name LIKE ?)'
      );
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (statusFilter && statusFilter !== 'All') {
      clauses.push('v.status = ?');
      params.push(statusFilter);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`
        SELECT
          v.*,
          c.name AS customer_name,
          c.company_name AS company_name
        FROM vehicles v
        JOIN customers c ON c.id = v.customer_id
        ${where}
        ORDER BY v.id DESC
      `)
      .all(...params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid vehicle ID');
    }

    const db = getDb();
    const vehicle = db
      .prepare(`
        SELECT v.*, c.name AS customer_name, c.company_name AS company_name
        FROM vehicles v
        JOIN customers c ON c.id = v.customer_id
        WHERE v.id = ?
      `)
      .get(id) as Record<string, unknown> | undefined;

    if (!vehicle) {
      throw new HttpError(404, 'Vehicle not found');
    }

    const customer = db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(vehicle.customer_id);

    const rawSchedules = db
      .prepare('SELECT * FROM maintenance_schedules WHERE vehicle_id = ? ORDER BY next_due_date ASC')
      .all(id) as Array<Record<string, unknown>>;

    const currentKm = Number(vehicle.odometer_km || 0);
    const schedules = rawSchedules.map((s) => ({
      ...s,
      health: computeScheduleHealth(Number(s.next_due_km), String(s.next_due_date), currentKm),
    }));

    const appointments = db
      .prepare('SELECT * FROM service_appointments WHERE vehicle_id = ? ORDER BY appointment_date DESC, id DESC')
      .all(id);

    const repairs = db
      .prepare(`
        SELECT r.*, i.id AS invoice_id
        FROM repair_records r
        LEFT JOIN invoices i ON i.repair_id = r.id
        WHERE r.vehicle_id = ?
        ORDER BY r.service_date DESC, r.id DESC
      `)
      .all(id) as Array<Record<string, unknown>>;

    const lineItemStmt = db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?');
    const enrichedRepairs = repairs.map((r) => ({
      ...r,
      total_cost: Number(r.labor_hours) * Number(r.labor_rate) + Number(r.parts_cost),
      line_items: lineItemStmt.all(r.id),
    }));

    const invoices = db
      .prepare('SELECT * FROM invoices WHERE vehicle_id = ? ORDER BY issue_date DESC, id DESC')
      .all(id);

    res.json({
      vehicle,
      customer,
      schedules,
      appointments,
      repairs: enrichedRepairs,
      invoices,
    });
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.post('/', (req, res, next) => {
  try {
    const parsed = vehicleSchema.parse(req.body);
    const db = getDb();

    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(parsed.customer_id);
    if (!customer) {
      throw new HttpError(404, 'Selected customer does not exist');
    }

    const result = db
      .prepare(`
        INSERT INTO vehicles (
          customer_id, vin, license_plate, make, model, year,
          vehicle_type, fuel_type, odometer_km, status, last_service_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        parsed.customer_id,
        parsed.vin,
        parsed.license_plate,
        parsed.make,
        parsed.model,
        parsed.year,
        parsed.vehicle_type,
        parsed.fuel_type,
        parsed.odometer_km,
        parsed.status,
        parsed.last_service_date
      );

    const created = db
      .prepare(`
        SELECT v.*, c.name AS customer_name, c.company_name AS company_name
        FROM vehicles v
        JOIN customers c ON c.id = v.customer_id
        WHERE v.id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid vehicle ID');
    }

    const parsed = vehicleSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'Vehicle not found');
    }

    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(parsed.customer_id);
    if (!customer) {
      throw new HttpError(404, 'Selected customer does not exist');
    }

    db.prepare(`
      UPDATE vehicles
      SET customer_id = ?, vin = ?, license_plate = ?, make = ?, model = ?, year = ?,
          vehicle_type = ?, fuel_type = ?, odometer_km = ?, status = ?, last_service_date = ?
      WHERE id = ?
    `).run(
      parsed.customer_id,
      parsed.vin,
      parsed.license_plate,
      parsed.make,
      parsed.model,
      parsed.year,
      parsed.vehicle_type,
      parsed.fuel_type,
      parsed.odometer_km,
      parsed.status,
      parsed.last_service_date,
      id
    );

    const updated = db
      .prepare(`
        SELECT v.*, c.name AS customer_name, c.company_name AS company_name
        FROM vehicles v
        JOIN customers c ON c.id = v.customer_id
        WHERE v.id = ?
      `)
      .get(id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid vehicle ID');
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new HttpError(404, 'Vehicle not found');
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
