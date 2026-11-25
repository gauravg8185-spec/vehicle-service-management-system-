import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Contact name is required').max(120),
  company_name: z.string().trim().max(150).optional().default(''),
  email: z.string().trim().email('Valid email address is required').max(150),
  phone: z.string().trim().min(7, 'Phone number is required').max(40),
  address: z.string().trim().max(250).optional().default(''),
  account_type: z.enum(['Commercial Fleet', 'Individual', 'Logistics Partner']).default('Commercial Fleet'),
});

export const vehicleSchema = z.object({
  customer_id: z.coerce.number().int().positive('Customer is required'),
  vin: z.string().trim().min(5, 'VIN must be at least 5 characters').max(30).transform((s) => s.toUpperCase()),
  license_plate: z.string().trim().min(2, 'License plate is required').max(24).transform((s) => s.toUpperCase()),
  make: z.string().trim().min(1, 'Make is required').max(60),
  model: z.string().trim().min(1, 'Model is required').max(80),
  year: z.coerce.number().int().min(1980).max(2030),
  vehicle_type: z.enum(['Van', 'Box Truck', 'Sedan', 'Pickup', 'SUV', 'Semi-Truck']).default('Van'),
  fuel_type: z.enum(['Diesel', 'Gasoline', 'Hybrid', 'Electric']).default('Diesel'),
  odometer_km: z.coerce.number().int().min(0).max(5000000),
  status: z.enum(['Active', 'In Service', 'Maintenance Due', 'Out of Service']).default('Active'),
  last_service_date: z.string().trim().nullable().optional().default(null),
});

export const scheduleSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle is required'),
  task_name: z.string().trim().min(2, 'Task name is required').max(160),
  interval_km: z.coerce.number().int().min(500).max(500000),
  interval_days: z.coerce.number().int().min(7).max(3650),
  last_completed_km: z.coerce.number().int().min(0).max(5000000),
  last_completed_date: z.string().trim().min(8, 'Last completed date is required'),
  priority: z.enum(['Standard', 'High', 'Critical']).default('Standard'),
  notes: z.string().trim().max(500).optional().default(''),
});

export const completeScheduleSchema = z.object({
  completed_km: z.coerce.number().int().min(0).max(5000000),
  completed_date: z.string().trim().min(8),
});

export const appointmentSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle is required'),
  customer_id: z.coerce.number().int().positive().optional(),
  appointment_date: z.string().trim().min(8, 'Appointment date is required'),
  time_slot: z.string().trim().min(2, 'Time slot is required').max(40),
  service_type: z.string().trim().min(2, 'Service type is required').max(150),
  bay_number: z.string().trim().min(1).max(30).default('Bay 1'),
  assigned_technician: z.string().trim().min(1).max(80).default('Unassigned'),
  priority: z.enum(['Standard', 'Urgent']).default('Standard'),
  status: z.enum(['Scheduled', 'In Bay', 'Completed', 'Cancelled']).default('Scheduled'),
  notes: z.string().trim().max(500).optional().default(''),
});

export const appointmentStatusSchema = z.object({
  status: z.enum(['Scheduled', 'In Bay', 'Completed', 'Cancelled']),
});

export const repairLineItemSchema = z.object({
  item_type: z.enum(['Part', 'Labor', 'Diagnostic', 'Fluid']),
  description: z.string().trim().min(1, 'Line item description required').max(200),
  quantity: z.coerce.number().positive('Quantity must be > 0').max(10000),
  unit_price: z.coerce.number().min(0).max(1000000),
});

export const repairSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle is required'),
  appointment_id: z.coerce.number().int().positive().nullable().optional().default(null),
  service_date: z.string().trim().min(8, 'Service date is required'),
  odometer_at_service: z.coerce.number().int().min(0).max(5000000),
  service_category: z.enum([
    'Preventive Maintenance',
    'Brake & Suspension',
    'Engine & Transmission',
    'Electrical & Diagnostics',
    'Tires & Alignment',
    'Body & Safety',
  ]),
  title: z.string().trim().min(2, 'Repair title is required').max(180),
  description: z.string().trim().min(2, 'Repair description is required').max(1500),
  technician: z.string().trim().min(2, 'Technician name is required').max(80),
  labor_hours: z.coerce.number().min(0).max(500).default(0),
  labor_rate: z.coerce.number().min(0).max(50000).default(850),
  parts_cost: z.coerce.number().min(0).max(10000000).default(0),
  status: z.enum(['In Progress', 'Completed', 'Pending Parts']).default('Completed'),
  line_items: z.array(repairLineItemSchema).optional().default([]),
});

export const invoiceSchema = z.object({
  repair_id: z.coerce.number().int().positive().nullable().optional().default(null),
  vehicle_id: z.coerce.number().int().positive('Vehicle is required'),
  customer_id: z.coerce.number().int().positive().optional(),
  issue_date: z.string().trim().min(8, 'Issue date is required'),
  due_date: z.string().trim().min(8, 'Due date is required'),
  labor_charge: z.coerce.number().min(0).max(1000000),
  parts_charge: z.coerce.number().min(0).max(1000000),
  shop_supplies: z.coerce.number().min(0).max(100000).default(0),
  discount_amount: z.coerce.number().min(0).max(10000000).default(0),
  tax_rate: z.coerce.number().min(0).max(50).default(18),
  payment_status: z.enum(['Pending', 'Paid', 'Overdue']).default('Pending'),
  payment_method: z.string().trim().min(1).max(60).default('UPI (GPay / PhonePe / Paytm)'),
  notes: z.string().trim().max(500).optional().default(''),
});

export const invoiceStatusSchema = z.object({
  payment_status: z.enum(['Pending', 'Paid', 'Overdue']),
  payment_method: z.string().trim().min(1).max(60).optional(),
});
