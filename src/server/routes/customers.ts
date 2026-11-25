import { Router } from 'express';
import { getDb } from '../db/connection';
import { HttpError } from '../middleware/errorHandler';
import { customerSchema } from '../validators/schemas';

export const customersRouter = Router();

customersRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const sql = `
      SELECT
        c.*,
        COUNT(v.id) AS vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON v.customer_id = c.id
      ${search ? 'WHERE c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?' : ''}
      GROUP BY c.id
      ORDER BY c.id DESC
    `;

    const pattern = `%${search}%`;
    const rows = search
      ? db.prepare(sql).all(pattern, pattern, pattern, pattern)
      : db.prepare(sql).all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

customersRouter.post('/', (req, res, next) => {
  try {
    const parsed = customerSchema.parse(req.body);
    const db = getDb();

    const result = db
      .prepare(`
        INSERT INTO customers (name, company_name, email, phone, address, account_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        parsed.name,
        parsed.company_name,
        parsed.email,
        parsed.phone,
        parsed.address,
        parsed.account_type
      );

    const created = db
      .prepare('SELECT c.*, 0 AS vehicle_count FROM customers c WHERE c.id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

customersRouter.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid customer ID');
    }

    const parsed = customerSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'Customer not found');
    }

    db.prepare(`
      UPDATE customers
      SET name = ?, company_name = ?, email = ?, phone = ?, address = ?, account_type = ?
      WHERE id = ?
    `).run(
      parsed.name,
      parsed.company_name,
      parsed.email,
      parsed.phone,
      parsed.address,
      parsed.account_type,
      id
    );

    const updated = db
      .prepare(`
        SELECT c.*, COUNT(v.id) AS vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON v.customer_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
      `)
      .get(id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

customersRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid customer ID');
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new HttpError(404, 'Customer not found');
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
