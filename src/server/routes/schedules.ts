import { Router } from 'express';
import { getDb } from '../db/connection';
import { HttpError } from '../middleware/errorHandler';
import { completeScheduleSchema, scheduleSchema } from '../validators/schemas';
import { computeScheduleHealth } from './vehicles';

function addDaysToIso(dateStr: string, days: number): string {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    return fallback.toISOString().slice(0, 10);
  }
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export const schedulesRouter = Router();

schedulesRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const vehicleId = req.query.vehicle_id ? Number(req.query.vehicle_id) : null;
    const healthFilter = typeof req.query.health === 'string' ? req.query.health.trim() : '';

    const sql = `
      SELECT
        ms.*,
        v.license_plate,
        (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
        v.odometer_km AS current_odometer_km,
        c.name AS customer_name
      FROM maintenance_schedules ms
      JOIN vehicles v ON v.id = ms.vehicle_id
      JOIN customers c ON c.id = v.customer_id
      ${vehicleId ? 'WHERE ms.vehicle_id = ?' : ''}
      ORDER BY ms.next_due_date ASC, ms.id DESC
    `;

    const rows = (vehicleId ? db.prepare(sql).all(vehicleId) : db.prepare(sql).all()) as Array<
      Record<string, unknown>
    >;

    const enriched = rows
      .map((row) => ({
        ...row,
        health: computeScheduleHealth(
          Number(row.next_due_km),
          String(row.next_due_date),
          Number(row.current_odometer_km)
        ),
      }))
      .filter((row) => !healthFilter || healthFilter === 'All' || row.health === healthFilter);

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post('/', (req, res, next) => {
  try {
    const parsed = scheduleSchema.parse(req.body);
    const db = getDb();

    const vehicle = db.prepare('SELECT id, odometer_km FROM vehicles WHERE id = ?').get(parsed.vehicle_id) as
      | { id: number; odometer_km: number }
      | undefined;

    if (!vehicle) {
      throw new HttpError(404, 'Vehicle not found');
    }

    const nextDueKm = parsed.last_completed_km + parsed.interval_km;
    const nextDueDate = addDaysToIso(parsed.last_completed_date, parsed.interval_days);

    const result = db
      .prepare(`
        INSERT INTO maintenance_schedules (
          vehicle_id, task_name, interval_km, interval_days,
          last_completed_km, last_completed_date, next_due_km, next_due_date,
          priority, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        parsed.vehicle_id,
        parsed.task_name,
        parsed.interval_km,
        parsed.interval_days,
        parsed.last_completed_km,
        parsed.last_completed_date,
        nextDueKm,
        nextDueDate,
        parsed.priority,
        parsed.notes
      );

    const created = db
      .prepare(`
        SELECT
          ms.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          v.odometer_km AS current_odometer_km,
          c.name AS customer_name
        FROM maintenance_schedules ms
        JOIN vehicles v ON v.id = ms.vehicle_id
        JOIN customers c ON c.id = v.customer_id
        WHERE ms.id = ?
      `)
      .get(result.lastInsertRowid) as Record<string, unknown>;

    res.status(201).json({
      ...created,
      health: computeScheduleHealth(
        Number(created.next_due_km),
        String(created.next_due_date),
        Number(created.current_odometer_km)
      ),
    });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post('/:id/complete', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid schedule ID');
    }

    const parsed = completeScheduleSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT * FROM maintenance_schedules WHERE id = ?')
      .get(id) as
      | { id: number; vehicle_id: number; interval_km: number; interval_days: number }
      | undefined;

    if (!existing) {
      throw new HttpError(404, 'Maintenance schedule not found');
    }

    const nextDueKm = parsed.completed_km + existing.interval_km;
    const nextDueDate = addDaysToIso(parsed.completed_date, existing.interval_days);

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE maintenance_schedules
        SET last_completed_km = ?, last_completed_date = ?, next_due_km = ?, next_due_date = ?
        WHERE id = ?
      `).run(parsed.completed_km, parsed.completed_date, nextDueKm, nextDueDate, id);

      db.prepare(`
        UPDATE vehicles
        SET odometer_km = MAX(odometer_km, ?),
            last_service_date = ?,
            status = CASE WHEN status = 'Maintenance Due' THEN 'Active' ELSE status END
        WHERE id = ?
      `).run(parsed.completed_km, parsed.completed_date, existing.vehicle_id);
    });

    tx();

    const updated = db
      .prepare(`
        SELECT
          ms.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          v.odometer_km AS current_odometer_km,
          c.name AS customer_name
        FROM maintenance_schedules ms
        JOIN vehicles v ON v.id = ms.vehicle_id
        JOIN customers c ON c.id = v.customer_id
        WHERE ms.id = ?
      `)
      .get(id) as Record<string, unknown>;

    res.json({
      ...updated,
      health: computeScheduleHealth(
        Number(updated.next_due_km),
        String(updated.next_due_date),
        Number(updated.current_odometer_km)
      ),
    });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid schedule ID');
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM maintenance_schedules WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new HttpError(404, 'Maintenance schedule not found');
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
