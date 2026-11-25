import { Router } from 'express';
import { getDb } from '../db/connection';
import { HttpError } from '../middleware/errorHandler';
import { appointmentSchema, appointmentStatusSchema } from '../validators/schemas';

export const appointmentsRouter = Router();

appointmentsRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (status && status !== 'All') {
      clauses.push('a.status = ?');
      params.push(status);
    }

    if (search) {
      clauses.push(
        '(v.license_plate LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR c.name LIKE ? OR a.service_type LIKE ? OR a.assigned_technician LIKE ?)'
      );
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`
        SELECT
          a.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name
        FROM service_appointments a
        JOIN vehicles v ON v.id = a.vehicle_id
        JOIN customers c ON c.id = a.customer_id
        ${where}
        ORDER BY a.appointment_date ASC, a.id DESC
      `)
      .all(...params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.post('/', (req, res, next) => {
  try {
    const parsed = appointmentSchema.parse(req.body);
    const db = getDb();

    const vehicle = db
      .prepare('SELECT id, customer_id FROM vehicles WHERE id = ?')
      .get(parsed.vehicle_id) as { id: number; customer_id: number } | undefined;

    if (!vehicle) {
      throw new HttpError(404, 'Selected vehicle does not exist');
    }

    const customerId = parsed.customer_id ?? vehicle.customer_id;

    const tx = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO service_appointments (
            vehicle_id, customer_id, appointment_date, time_slot,
            service_type, bay_number, assigned_technician, priority, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          parsed.vehicle_id,
          customerId,
          parsed.appointment_date,
          parsed.time_slot,
          parsed.service_type,
          parsed.bay_number,
          parsed.assigned_technician,
          parsed.priority,
          parsed.status,
          parsed.notes
        );

      if (parsed.status === 'In Bay') {
        db.prepare("UPDATE vehicles SET status = 'In Service' WHERE id = ?").run(parsed.vehicle_id);
      }

      return result.lastInsertRowid;
    });

    const newId = tx();
    const created = db
      .prepare(`
        SELECT
          a.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name
        FROM service_appointments a
        JOIN vehicles v ON v.id = a.vehicle_id
        JOIN customers c ON c.id = a.customer_id
        WHERE a.id = ?
      `)
      .get(newId);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.patch('/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid appointment ID');
    }

    const parsed = appointmentStatusSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT id, vehicle_id FROM service_appointments WHERE id = ?')
      .get(id) as { id: number; vehicle_id: number } | undefined;

    if (!existing) {
      throw new HttpError(404, 'Appointment not found');
    }

    const tx = db.transaction(() => {
      db.prepare('UPDATE service_appointments SET status = ? WHERE id = ?').run(parsed.status, id);

      if (parsed.status === 'In Bay') {
        db.prepare("UPDATE vehicles SET status = 'In Service' WHERE id = ?").run(existing.vehicle_id);
      } else if (parsed.status === 'Completed' || parsed.status === 'Cancelled') {
        db.prepare("UPDATE vehicles SET status = 'Active' WHERE id = ? AND status = 'In Service'").run(
          existing.vehicle_id
        );
      }
    });

    tx();

    const updated = db
      .prepare(`
        SELECT
          a.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name
        FROM service_appointments a
        JOIN vehicles v ON v.id = a.vehicle_id
        JOIN customers c ON c.id = a.customer_id
        WHERE a.id = ?
      `)
      .get(id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid appointment ID');
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM service_appointments WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new HttpError(404, 'Appointment not found');
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
