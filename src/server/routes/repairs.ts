import { Router } from 'express';
import { getDb } from '../db/connection';
import { HttpError } from '../middleware/errorHandler';
import { repairSchema } from '../validators/schemas';

export const repairsRouter = Router();

repairsRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (status && status !== 'All') {
      clauses.push('r.status = ?');
      params.push(status);
    }

    if (category && category !== 'All') {
      clauses.push('r.service_category = ?');
      params.push(category);
    }

    if (search) {
      clauses.push(
        '(r.title LIKE ? OR r.description LIKE ? OR r.technician LIKE ? OR v.license_plate LIKE ? OR c.name LIKE ?)'
      );
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`
        SELECT
          r.*,
          v.license_plate,
          v.customer_id,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          i.id AS invoice_id
        FROM repair_records r
        JOIN vehicles v ON v.id = r.vehicle_id
        JOIN customers c ON c.id = v.customer_id
        LEFT JOIN invoices i ON i.repair_id = r.id
        ${where}
        ORDER BY r.service_date DESC, r.id DESC
      `)
      .all(...params) as Array<Record<string, unknown>>;

    const lineItemStmt = db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?');
    const enriched = rows.map((row) => ({
      ...row,
      total_cost: Number(row.labor_hours) * Number(row.labor_rate) + Number(row.parts_cost),
      line_items: lineItemStmt.all(row.id),
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

repairsRouter.post('/', (req, res, next) => {
  try {
    const parsed = repairSchema.parse(req.body);
    const db = getDb();

    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(parsed.vehicle_id);
    if (!vehicle) {
      throw new HttpError(404, 'Selected vehicle does not exist');
    }

    const computedPartsFromItems = parsed.line_items
      .filter((item) => item.item_type !== 'Labor')
      .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const effectivePartsCost =
      parsed.parts_cost > 0 ? parsed.parts_cost : Number(computedPartsFromItems.toFixed(2));

    const tx = db.transaction(() => {
      const insertResult = db
        .prepare(`
          INSERT INTO repair_records (
            vehicle_id, appointment_id, service_date, odometer_at_service,
            service_category, title, description, technician,
            labor_hours, labor_rate, parts_cost, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          parsed.vehicle_id,
          parsed.appointment_id,
          parsed.service_date,
          parsed.odometer_at_service,
          parsed.service_category,
          parsed.title,
          parsed.description,
          parsed.technician,
          parsed.labor_hours,
          parsed.labor_rate,
          effectivePartsCost,
          parsed.status
        );

      const repairId = Number(insertResult.lastInsertRowid);

      const insertItem = db.prepare(`
        INSERT INTO repair_line_items (repair_id, item_type, description, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of parsed.line_items) {
        const total = Number((item.quantity * item.unit_price).toFixed(2));
        insertItem.run(repairId, item.item_type, item.description, item.quantity, item.unit_price, total);
      }

      db.prepare(`
        UPDATE vehicles
        SET odometer_km = MAX(odometer_km, ?),
            last_service_date = ?,
            status = CASE
              WHEN ? = 'In Progress' THEN 'In Service'
              WHEN status = 'In Service' AND ? = 'Completed' THEN 'Active'
              ELSE status
            END
        WHERE id = ?
      `).run(
        parsed.odometer_at_service,
        parsed.service_date,
        parsed.status,
        parsed.status,
        parsed.vehicle_id
      );

      if (parsed.appointment_id && parsed.status === 'Completed') {
        db.prepare("UPDATE service_appointments SET status = 'Completed' WHERE id = ?").run(
          parsed.appointment_id
        );
      }

      return repairId;
    });

    const repairId = tx();
    const created = db
      .prepare(`
        SELECT
          r.*,
          v.license_plate,
          v.customer_id,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          NULL AS invoice_id
        FROM repair_records r
        JOIN vehicles v ON v.id = r.vehicle_id
        JOIN customers c ON c.id = v.customer_id
        WHERE r.id = ?
      `)
      .get(repairId) as Record<string, unknown>;

    const lineItems = db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?').all(repairId);

    res.status(201).json({
      ...created,
      total_cost: Number(created.labor_hours) * Number(created.labor_rate) + Number(created.parts_cost),
      line_items: lineItems,
    });
  } catch (err) {
    next(err);
  }
});

repairsRouter.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid repair record ID');
    }

    const parsed = repairSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM repair_records WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'Repair record not found');
    }

    const computedPartsFromItems = parsed.line_items
      .filter((item) => item.item_type !== 'Labor')
      .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const effectivePartsCost =
      parsed.parts_cost > 0 ? parsed.parts_cost : Number(computedPartsFromItems.toFixed(2));

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE repair_records
        SET vehicle_id = ?, appointment_id = ?, service_date = ?, odometer_at_service = ?,
            service_category = ?, title = ?, description = ?, technician = ?,
            labor_hours = ?, labor_rate = ?, parts_cost = ?, status = ?
        WHERE id = ?
      `).run(
        parsed.vehicle_id,
        parsed.appointment_id,
        parsed.service_date,
        parsed.odometer_at_service,
        parsed.service_category,
        parsed.title,
        parsed.description,
        parsed.technician,
        parsed.labor_hours,
        parsed.labor_rate,
        effectivePartsCost,
        parsed.status,
        id
      );

      db.prepare('DELETE FROM repair_line_items WHERE repair_id = ?').run(id);

      const insertItem = db.prepare(`
        INSERT INTO repair_line_items (repair_id, item_type, description, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of parsed.line_items) {
        const total = Number((item.quantity * item.unit_price).toFixed(2));
        insertItem.run(id, item.item_type, item.description, item.quantity, item.unit_price, total);
      }

      db.prepare(`
        UPDATE vehicles
        SET odometer_km = MAX(odometer_km, ?),
            last_service_date = ?,
            status = CASE
              WHEN ? = 'In Progress' THEN 'In Service'
              WHEN status = 'In Service' AND ? = 'Completed' THEN 'Active'
              ELSE status
            END
        WHERE id = ?
      `).run(
        parsed.odometer_at_service,
        parsed.service_date,
        parsed.status,
        parsed.status,
        parsed.vehicle_id
      );
    });

    tx();

    const updated = db
      .prepare(`
        SELECT
          r.*,
          v.license_plate,
          v.customer_id,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          i.id AS invoice_id
        FROM repair_records r
        JOIN vehicles v ON v.id = r.vehicle_id
        JOIN customers c ON c.id = v.customer_id
        LEFT JOIN invoices i ON i.repair_id = r.id
        WHERE r.id = ?
      `)
      .get(id) as Record<string, unknown>;

    const lineItems = db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?').all(id);

    res.json({
      ...updated,
      total_cost: Number(updated.labor_hours) * Number(updated.labor_rate) + Number(updated.parts_cost),
      line_items: lineItems,
    });
  } catch (err) {
    next(err);
  }
});

repairsRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid repair record ID');
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM repair_records WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new HttpError(404, 'Repair record not found');
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
