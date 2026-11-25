import type {
  AppointmentStatus,
  Customer,
  DashboardSummary,
  Invoice,
  MaintenanceSchedule,
  PaymentStatus,
  RepairLineItem,
  RepairRecord,
  ServiceAppointment,
  Vehicle,
  VehicleDetailPayload,
} from '../types/fleet';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export const fleetApi = {
  getDashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/dashboard');
  },

  // Module 1: Customers & Vehicles
  getCustomers(query = ''): Promise<Customer[]> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<Customer[]>(`/api/customers${qs}`);
  },
  createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'vehicle_count'>): Promise<Customer> {
    return request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCustomer(id: number, data: Omit<Customer, 'id' | 'created_at' | 'vehicle_count'>): Promise<Customer> {
    return request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteCustomer(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/customers/${id}`, { method: 'DELETE' });
  },

  getVehicles(params?: { q?: string; status?: string }): Promise<Vehicle[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status && params.status !== 'All') search.set('status', params.status);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<Vehicle[]>(`/api/vehicles${qs}`);
  },
  getVehicleDetail(id: number): Promise<VehicleDetailPayload> {
    return request<VehicleDetailPayload>(`/api/vehicles/${id}`);
  },
  createVehicle(data: Omit<Vehicle, 'id' | 'created_at' | 'customer_name' | 'company_name'>): Promise<Vehicle> {
    return request<Vehicle>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateVehicle(
    id: number,
    data: Omit<Vehicle, 'id' | 'created_at' | 'customer_name' | 'company_name'>
  ): Promise<Vehicle> {
    return request<Vehicle>(`/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteVehicle(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/vehicles/${id}`, { method: 'DELETE' });
  },

  // Module 2: Service Appointments
  getAppointments(params?: { q?: string; status?: string }): Promise<ServiceAppointment[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status && params.status !== 'All') search.set('status', params.status);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<ServiceAppointment[]>(`/api/appointments${qs}`);
  },
  createAppointment(
    data: Omit<
      ServiceAppointment,
      'id' | 'created_at' | 'customer_id' | 'license_plate' | 'vehicle_label' | 'customer_name'
    > & { customer_id?: number }
  ): Promise<ServiceAppointment> {
    return request<ServiceAppointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateAppointmentStatus(id: number, status: AppointmentStatus): Promise<ServiceAppointment> {
    return request<ServiceAppointment>(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  deleteAppointment(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/appointments/${id}`, { method: 'DELETE' });
  },

  // Module 3: Repair Records & Maintenance Schedules
  getRepairs(params?: { q?: string; status?: string; category?: string }): Promise<RepairRecord[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status && params.status !== 'All') search.set('status', params.status);
    if (params?.category && params.category !== 'All') search.set('category', params.category);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<RepairRecord[]>(`/api/repairs${qs}`);
  },
  createRepair(data: {
    vehicle_id: number;
    appointment_id: number | null;
    service_date: string;
    odometer_at_service: number;
    service_category: RepairRecord['service_category'];
    title: string;
    description: string;
    technician: string;
    labor_hours: number;
    labor_rate: number;
    parts_cost: number;
    status: RepairRecord['status'];
    line_items: Array<Omit<RepairLineItem, 'id' | 'repair_id' | 'line_total'>>;
  }): Promise<RepairRecord> {
    return request<RepairRecord>('/api/repairs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateRepair(
    id: number,
    data: {
      vehicle_id: number;
      appointment_id: number | null;
      service_date: string;
      odometer_at_service: number;
      service_category: RepairRecord['service_category'];
      title: string;
      description: string;
      technician: string;
      labor_hours: number;
      labor_rate: number;
      parts_cost: number;
      status: RepairRecord['status'];
      line_items: Array<Omit<RepairLineItem, 'id' | 'repair_id' | 'line_total'>>;
    }
  ): Promise<RepairRecord> {
    return request<RepairRecord>(`/api/repairs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteRepair(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/repairs/${id}`, { method: 'DELETE' });
  },

  getSchedules(params?: { vehicle_id?: number; health?: string }): Promise<MaintenanceSchedule[]> {
    const search = new URLSearchParams();
    if (params?.vehicle_id) search.set('vehicle_id', String(params.vehicle_id));
    if (params?.health && params.health !== 'All') search.set('health', params.health);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<MaintenanceSchedule[]>(`/api/schedules${qs}`);
  },
  createSchedule(data: {
    vehicle_id: number;
    task_name: string;
    interval_km: number;
    interval_days: number;
    last_completed_km: number;
    last_completed_date: string;
    priority: MaintenanceSchedule['priority'];
    notes: string;
  }): Promise<MaintenanceSchedule> {
    return request<MaintenanceSchedule>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  completeSchedule(
    id: number,
    payload: { completed_km: number; completed_date: string }
  ): Promise<MaintenanceSchedule> {
    return request<MaintenanceSchedule>(`/api/schedules/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteSchedule(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/schedules/${id}`, { method: 'DELETE' });
  },

  // Module 4: Service Charges & Invoices
  getInvoices(params?: { q?: string; status?: string }): Promise<Invoice[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status && params.status !== 'All') search.set('status', params.status);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<Invoice[]>(`/api/invoices${qs}`);
  },
  createInvoice(data: {
    repair_id: number | null;
    vehicle_id: number;
    customer_id?: number;
    issue_date: string;
    due_date: string;
    labor_charge: number;
    parts_charge: number;
    shop_supplies: number;
    discount_amount: number;
    tax_rate: number;
    payment_status: PaymentStatus;
    payment_method: string;
    notes: string;
  }): Promise<Invoice> {
    return request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateInvoiceStatus(id: number, payment_status: PaymentStatus, payment_method?: string): Promise<Invoice> {
    return request<Invoice>(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status, payment_method }),
    });
  },
  deleteInvoice(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/invoices/${id}`, { method: 'DELETE' });
  },
};
