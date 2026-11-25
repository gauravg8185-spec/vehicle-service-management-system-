import { Router } from 'express';
import { getDb } from '../db/connection';
import { HttpError } from '../middleware/errorHandler';
import { invoiceSchema, invoiceStatusSchema } from '../validators/schemas';

export const invoicesRouter = Router();

function generateInvoiceNumber(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const row = db
    .prepare('SELECT COALESCE(MAX(id), 0) AS max_id FROM invoices')
    .get() as { max_id: number };
  const seq = 101 + row.max_id;
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

invoicesRouter.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (status && status !== 'All') {
      clauses.push('i.payment_status = ?');
      params.push(status);
    }

    if (search) {
      clauses.push(
        '(i.invoice_number LIKE ? OR v.license_plate LIKE ? OR c.name LIKE ? OR c.company_name LIKE ?)'
      );
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`
        SELECT
          i.*,
          v.license_plate,
          v.vin,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          c.company_name,
          c.email AS customer_email,
          c.phone AS customer_phone,
          c.address AS customer_address,
          r.title AS repair_title
        FROM invoices i
        JOIN vehicles v ON v.id = i.vehicle_id
        JOIN customers c ON c.id = i.customer_id
        LEFT JOIN repair_records r ON r.id = i.repair_id
        ${where}
        ORDER BY i.id DESC
      `)
      .all(...params) as Array<Record<string, unknown>>;

    const itemStmt = db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?');
    const enriched = rows.map((inv) => ({
      ...inv,
      line_items: inv.repair_id ? itemStmt.all(inv.repair_id) : [],
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.post('/', (req, res, next) => {
  try {
    const parsed = invoiceSchema.parse(req.body);
    const db = getDb();

    const vehicle = db
      .prepare('SELECT id, customer_id FROM vehicles WHERE id = ?')
      .get(parsed.vehicle_id) as { id: number; customer_id: number } | undefined;

    if (!vehicle) {
      throw new HttpError(404, 'Selected vehicle does not exist');
    }

    const customerId = parsed.customer_id ?? vehicle.customer_id;

    const taxableSubtotal = Math.max(
      0,
      parsed.labor_charge + parsed.parts_charge + parsed.shop_supplies - parsed.discount_amount
    );
    const taxAmount = roundMoney(taxableSubtotal * (parsed.tax_rate / 100));
    const totalAmount = roundMoney(taxableSubtotal + taxAmount);
    const invoiceNumber = generateInvoiceNumber();

    const result = db
      .prepare(`
        INSERT INTO invoices (
          invoice_number, repair_id, vehicle_id, customer_id,
          issue_date, due_date, labor_charge, parts_charge, shop_supplies,
          discount_amount, tax_rate, tax_amount, total_amount,
          payment_status, payment_method, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        invoiceNumber,
        parsed.repair_id,
        parsed.vehicle_id,
        customerId,
        parsed.issue_date,
        parsed.due_date,
        roundMoney(parsed.labor_charge),
        roundMoney(parsed.parts_charge),
        roundMoney(parsed.shop_supplies),
        roundMoney(parsed.discount_amount),
        parsed.tax_rate,
        taxAmount,
        totalAmount,
        parsed.payment_status,
        parsed.payment_method,
        parsed.notes
      );

    const created = db
      .prepare(`
        SELECT
          i.*,
          v.license_plate,
          v.vin,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          c.company_name,
          c.email AS customer_email,
          c.phone AS customer_phone,
          c.address AS customer_address,
          r.title AS repair_title
        FROM invoices i
        JOIN vehicles v ON v.id = i.vehicle_id
        JOIN customers c ON c.id = i.customer_id
        LEFT JOIN repair_records r ON r.id = i.repair_id
        WHERE i.id = ?
      `)
      .get(result.lastInsertRowid) as Record<string, unknown>;

    const lineItems = created.repair_id
      ? db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?').all(created.repair_id)
      : [];

    res.status(201).json({ ...created, line_items: lineItems });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.patch('/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid invoice ID');
    }

    const parsed = invoiceStatusSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT id, payment_method FROM invoices WHERE id = ?').get(id) as
      | { id: number; payment_method: string }
      | undefined;

    if (!existing) {
      throw new HttpError(404, 'Invoice not found');
    }

    db.prepare('UPDATE invoices SET payment_status = ?, payment_method = ? WHERE id = ?').run(
      parsed.payment_status,
      parsed.payment_method ?? existing.payment_method,
      id
    );

    const updated = db
      .prepare(`
        SELECT
          i.*,
          v.license_plate,
          v.vin,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          c.company_name,
          c.email AS customer_email,
          c.phone AS customer_phone,
          c.address AS customer_address,
          r.title AS repair_title
        FROM invoices i
        JOIN vehicles v ON v.id = i.vehicle_id
        JOIN customers c ON c.id = i.customer_id
        LEFT JOIN repair_records r ON r.id = i.repair_id
        WHERE i.id = ?
      `)
      .get(id) as Record<string, unknown>;

    const lineItems = updated.repair_id
      ? db.prepare('SELECT * FROM repair_line_items WHERE repair_id = ?').all(updated.repair_id)
      : [];

    res.json({ ...updated, line_items: lineItems });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'Invalid invoice ID');
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new HttpError(404, 'Invoice not found');
    }

    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
