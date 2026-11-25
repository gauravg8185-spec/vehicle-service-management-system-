export type AccountType = 'Commercial Fleet' | 'Individual' | 'Logistics Partner';

export type VehicleType = 'Van' | 'Box Truck' | 'Sedan' | 'Pickup' | 'SUV' | 'Semi-Truck';
export type FuelType = 'Diesel' | 'Gasoline' | 'Hybrid' | 'Electric';
export type VehicleStatus = 'Active' | 'In Service' | 'Maintenance Due' | 'Out of Service';

export type AppointmentStatus = 'Scheduled' | 'In Bay' | 'Completed' | 'Cancelled';
export type AppointmentPriority = 'Standard' | 'Urgent';

export type SchedulePriority = 'Standard' | 'High' | 'Critical';
export type ScheduleHealth = 'Overdue' | 'Due Soon' | 'Upcoming';

export type RepairCategory =
  | 'Preventive Maintenance'
  | 'Brake & Suspension'
  | 'Engine & Transmission'
  | 'Electrical & Diagnostics'
  | 'Tires & Alignment'
  | 'Body & Safety';

export type RepairStatus = 'In Progress' | 'Completed' | 'Pending Parts';
export type LineItemType = 'Part' | 'Labor' | 'Diagnostic' | 'Fluid';
export type PaymentStatus = 'Pending' | 'Paid' | 'Overdue';

export interface Customer {
  id: number;
  name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  account_type: AccountType;
  vehicle_count?: number;
  created_at: string;
}

export interface Vehicle {
  id: number;
  customer_id: number;
  customer_name?: string;
  company_name?: string;
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: VehicleType;
  fuel_type: FuelType;
  odometer_km: number;
  status: VehicleStatus;
  last_service_date: string | null;
  created_at: string;
}

export interface MaintenanceSchedule {
  id: number;
  vehicle_id: number;
  license_plate?: string;
  vehicle_label?: string;
  current_odometer_km?: number;
  customer_name?: string;
  task_name: string;
  interval_km: number;
  interval_days: number;
  last_completed_km: number;
  last_completed_date: string;
  next_due_km: number;
  next_due_date: string;
  priority: SchedulePriority;
  health?: ScheduleHealth;
  notes: string;
  created_at: string;
}

export interface ServiceAppointment {
  id: number;
  vehicle_id: number;
  customer_id: number;
  license_plate?: string;
  vehicle_label?: string;
  customer_name?: string;
  appointment_date: string;
  time_slot: string;
  service_type: string;
  bay_number: string;
  assigned_technician: string;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
}

export interface RepairLineItem {
  id?: number;
  repair_id?: number;
  item_type: LineItemType;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface RepairRecord {
  id: number;
  vehicle_id: number;
  appointment_id: number | null;
  license_plate?: string;
  vehicle_label?: string;
  customer_id?: number;
  customer_name?: string;
  service_date: string;
  odometer_at_service: number;
  service_category: RepairCategory;
  title: string;
  description: string;
  technician: string;
  labor_hours: number;
  labor_rate: number;
  parts_cost: number;
  total_cost?: number;
  invoice_id?: number | null;
  status: RepairStatus;
  line_items: RepairLineItem[];
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  repair_id: number | null;
  vehicle_id: number;
  customer_id: number;
  license_plate?: string;
  vehicle_label?: string;
  vin?: string;
  customer_name?: string;
  company_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  repair_title?: string | null;
  issue_date: string;
  due_date: string;
  labor_charge: number;
  parts_charge: number;
  shop_supplies: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: string;
  notes: string;
  line_items?: RepairLineItem[];
  created_at: string;
}

export interface DashboardSummary {
  metrics: {
    total_vehicles: number;
    active_vehicles: number;
    in_service_vehicles: number;
    total_customers: number;
    upcoming_appointments: number;
    overdue_schedules: number;
    due_soon_schedules: number;
    open_repairs: number;
    pending_invoice_total: number;
    paid_invoice_total: number;
  };
  maintenance_alerts: MaintenanceSchedule[];
  upcoming_appointments: ServiceAppointment[];
  recent_repairs: RepairRecord[];
  recent_invoices: Invoice[];
}

export interface VehicleDetailPayload {
  vehicle: Vehicle;
  customer: Customer;
  schedules: MaintenanceSchedule[];
  appointments: ServiceAppointment[];
  repairs: RepairRecord[];
  invoices: Invoice[];
}

export type ActiveModule =
  | 'overview'
  | 'customers-vehicles'
  | 'appointments'
  | 'repairs-schedules'
  | 'invoices';
