import { Router } from 'express';
import { getDb } from '../db/connection';
import { computeScheduleHealth } from './vehicles';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req, res, next) => {
  try {
    const db = getDb();

    const vehicleCounts = db
      .prepare(`
        SELECT
          COUNT(*) AS total_vehicles,
          SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_vehicles,
          SUM(CASE WHEN status = 'In Service' THEN 1 ELSE 0 END) AS in_service_vehicles
        FROM vehicles
      `)
      .get() as { total_vehicles: number; active_vehicles: number | null; in_service_vehicles: number | null };

    const customerCount = db
      .prepare('SELECT COUNT(*) AS total_customers FROM customers')
      .get() as { total_customers: number };

    const appointmentCount = db
      .prepare("SELECT COUNT(*) AS upcoming_appointments FROM service_appointments WHERE status IN ('Scheduled', 'In Bay')")
      .get() as { upcoming_appointments: number };

    const openRepairsCount = db
      .prepare("SELECT COUNT(*) AS open_repairs FROM repair_records WHERE status != 'Completed'")
      .get() as { open_repairs: number };

    const invoiceTotals = db
      .prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN payment_status IN ('Pending', 'Overdue') THEN total_amount ELSE 0 END), 0) AS pending_invoice_total,
          COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END), 0) AS paid_invoice_total
        FROM invoices
      `)
      .get() as { pending_invoice_total: number; paid_invoice_total: number };

    const rawSchedules = db
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
        ORDER BY ms.next_due_date ASC
      `)
      .all() as Array<Record<string, unknown>>;

    const schedulesWithHealth = rawSchedules.map((s) => ({
      ...s,
      health: computeScheduleHealth(
        Number(s.next_due_km),
        String(s.next_due_date),
        Number(s.current_odometer_km)
      ),
    }));

    const overdueCount = schedulesWithHealth.filter((s) => s.health === 'Overdue').length;
    const dueSoonCount = schedulesWithHealth.filter((s) => s.health === 'Due Soon').length;

    const maintenanceAlerts = schedulesWithHealth
      .filter((s) => s.health === 'Overdue' || s.health === 'Due Soon')
      .slice(0, 6);

    const upcomingAppointments = db
      .prepare(`
        SELECT
          a.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name
        FROM service_appointments a
        JOIN vehicles v ON v.id = a.vehicle_id
        JOIN customers c ON c.id = a.customer_id
        WHERE a.status IN ('Scheduled', 'In Bay')
        ORDER BY a.appointment_date ASC, a.id ASC
        LIMIT 6
      `)
      .all();

    const recentRepairs = db
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
        ORDER BY r.service_date DESC, r.id DESC
        LIMIT 5
      `)
      .all() as Array<Record<string, unknown>>;

    const enrichedRepairs = recentRepairs.map((r) => ({
      ...r,
      total_cost: Number(r.labor_hours) * Number(r.labor_rate) + Number(r.parts_cost),
      line_items: [],
    }));

    const recentInvoices = db
      .prepare(`
        SELECT
          i.*,
          v.license_plate,
          (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_label,
          c.name AS customer_name,
          c.company_name
        FROM invoices i
        JOIN vehicles v ON v.id = i.vehicle_id
        JOIN customers c ON c.id = i.customer_id
        ORDER BY i.id DESC
        LIMIT 5
      `)
      .all();

    res.json({
      metrics: {
        total_vehicles: vehicleCounts.total_vehicles || 0,
        active_vehicles: vehicleCounts.active_vehicles || 0,
        in_service_vehicles: vehicleCounts.in_service_vehicles || 0,
        total_customers: customerCount.total_customers || 0,
        upcoming_appointments: appointmentCount.upcoming_appointments || 0,
        overdue_schedules: overdueCount,
        due_soon_schedules: dueSoonCount,
        open_repairs: openRepairsCount.open_repairs || 0,
        pending_invoice_total: invoiceTotals.pending_invoice_total || 0,
        paid_invoice_total: invoiceTotals.paid_invoice_total || 0,
      },
      maintenance_alerts: maintenanceAlerts,
      upcoming_appointments: upcomingAppointments,
      recent_repairs: enrichedRepairs,
      recent_invoices: recentInvoices,
    });
  } catch (err) {
    next(err);
  }
});
