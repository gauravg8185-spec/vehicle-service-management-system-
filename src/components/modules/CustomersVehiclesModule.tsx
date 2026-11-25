import { CarFront, Edit2, Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fleetApi } from '../../api/client';
import type {
  AccountType,
  Customer,
  FuelType,
  Vehicle,
  VehicleDetailPayload,
  VehicleStatus,
  VehicleType,
} from '../../types/fleet';
import { formatCurrency, formatDate, formatNumber, todayIsoDate } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';
import { LoadingRows } from '../common/LoadingRows';
import { Modal } from '../common/Modal';
import { StatusText } from '../common/StatusText';

interface CustomersVehiclesModuleProps {
  customers: Customer[];
  vehicles: Vehicle[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  externalCreateTrigger: number;
  selectedVehicleId: number | null;
  onSelectVehicleId: (id: number | null) => void;
  onQuickBookForVehicle: (vehicleId: number) => void;
}

type RegistryTab = 'vehicles' | 'customers';

const VEHICLE_STATUSES: Array<'All' | VehicleStatus> = [
  'All',
  'Active',
  'In Service',
  'Maintenance Due',
  'Out of Service',
];

const VEHICLE_TYPES: VehicleType[] = ['Van', 'Box Truck', 'Sedan', 'Pickup', 'SUV', 'Semi-Truck'];
const FUEL_TYPES: FuelType[] = ['Diesel', 'Gasoline', 'Hybrid', 'Electric'];
const ACCOUNT_TYPES: AccountType[] = ['Commercial Fleet', 'Logistics Partner', 'Individual'];

export function CustomersVehiclesModule({
  customers,
  vehicles,
  loading,
  onRefresh,
  externalCreateTrigger,
  selectedVehicleId,
  onSelectVehicleId,
  onQuickBookForVehicle,
}: CustomersVehiclesModuleProps) {
  const [activeTab, setActiveTab] = useState<RegistryTab>('vehicles');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | VehicleStatus>('All');

  // Customer Modal state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    account_type: 'Commercial Fleet' as AccountType,
  });

  // Vehicle Modal state
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    customer_id: 0,
    vin: '',
    license_plate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicle_type: 'Van' as VehicleType,
    fuel_type: 'Diesel' as FuelType,
    odometer_km: 0,
    status: 'Active' as VehicleStatus,
    last_service_date: todayIsoDate(),
  });

  // Vehicle Detail Dossier
  const [vehicleDetail, setVehicleDetail] = useState<VehicleDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (externalCreateTrigger > 0) {
      if (activeTab === 'customers') {
        openNewCustomerModal();
      } else {
        openNewVehicleModal();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCreateTrigger]);

  useEffect(() => {
    if (!selectedVehicleId) {
      setVehicleDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fleetApi
      .getVehicleDetail(selectedVehicleId)
      .then((payload) => {
        if (!cancelled) setVehicleDetail(payload);
      })
      .catch(() => {
        if (!cancelled) setVehicleDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setFormError(null);
    setCustomerForm({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      account_type: 'Commercial Fleet',
    });
    setCustomerModalOpen(true);
  };

  const openEditCustomerModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormError(null);
    setCustomerForm({
      name: c.name,
      company_name: c.company_name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      account_type: c.account_type,
    });
    setCustomerModalOpen(true);
  };

  const openNewVehicleModal = () => {
    setEditingVehicle(null);
    setFormError(null);
    setVehicleForm({
      customer_id: customers[0]?.id ?? 0,
      vin: '',
      license_plate: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vehicle_type: 'Van',
      fuel_type: 'Diesel',
      odometer_km: 0,
      status: 'Active',
      last_service_date: todayIsoDate(),
    });
    setVehicleModalOpen(true);
  };

  const openEditVehicleModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormError(null);
    setVehicleForm({
      customer_id: v.customer_id,
      vin: v.vin,
      license_plate: v.license_plate,
      make: v.make,
      model: v.model,
      year: v.year,
      vehicle_type: v.vehicle_type,
      fuel_type: v.fuel_type,
      odometer_km: v.odometer_km,
      status: v.status,
      last_service_date: v.last_service_date || '',
    });
    setVehicleModalOpen(true);
  };

  const handleSaveCustomer = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingCustomer) {
        await fleetApi.updateCustomer(editingCustomer.id, customerForm);
      } else {
        await fleetApi.createCustomer(customerForm);
      }
      setCustomerModalOpen(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await fleetApi.deleteCustomer(id);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to delete customer');
    }
  };

  const handleSaveVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.customer_id) {
      setFormError('Please register or select a customer owner first.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        ...vehicleForm,
        last_service_date: vehicleForm.last_service_date ? vehicleForm.last_service_date : null,
      };
      if (editingVehicle) {
        await fleetApi.updateVehicle(editingVehicle.id, payload);
      } else {
        await fleetApi.createVehicle(payload);
      }
      setVehicleModalOpen(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    try {
      await fleetApi.deleteVehicle(id);
      if (selectedVehicleId === id) {
        onSelectVehicleId(null);
      }
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to delete vehicle');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      v.license_plate.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.customer_name || '').toLowerCase().includes(q) ||
      (v.company_name || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.company_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'vehicles'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fleet Vehicles ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Accounts ({customers.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'vehicles' ? 'Search plate, VIN, model...' : 'Search customer, company, email...'}
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openNewCustomerModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Register Customer</span>
          </button>

          <button
            type="button"
            onClick={openNewVehicleModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      {activeTab === 'vehicles' && (
        <>
          {/* Status filter bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {VEHICLE_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingRows rows={6} cols={7} />
          ) : filteredVehicles.length === 0 ? (
            <EmptyState
              icon={CarFront}
              title="No matching vehicles found"
              description="Register a fleet vehicle with its VIN, license plate, owner, and current odometer reading to begin tracking maintenance schedules."
              actionLabel="Register Vehicle"
              onAction={openNewVehicleModal}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Plate & VIN</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Customer / Fleet</th>
                    <th className="px-4 py-3">Type · Fuel</th>
                    <th className="px-4 py-3 text-right">Odometer</th>
                    <th className="px-4 py-3">Last Service</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-900">{v.license_plate}</div>
                        <div className="font-mono text-[11px] text-slate-500">{v.vin}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {v.year} {v.make} {v.model}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{v.company_name || v.customer_name}</div>
                        {v.company_name && <div className="text-xs text-slate-500">{v.customer_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {v.vehicle_type} · {v.fuel_type}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                        {formatNumber(v.odometer_km)} km
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                        {formatDate(v.last_service_date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusText value={v.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectVehicleId(v.id)}
                            title="View full history & schedules"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditVehicleModal(v)}
                            title="Edit vehicle"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(v.id)}
                            title="Delete vehicle"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'customers' && (
        <>
          {loading ? (
            <LoadingRows rows={5} cols={6} />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customer accounts found"
              description="Register fleet operators or individual vehicle owners to link vehicles, appointments, and billing invoices."
              actionLabel="Register Customer"
              onAction={openNewCustomerModal}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Contact & Company</th>
                    <th className="px-4 py-3">Account Type</th>
                    <th className="px-4 py-3">Email & Phone</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3 text-right">Vehicles</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.company_name || 'Private Account'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{c.account_type}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-800">{c.email}</div>
                        <div className="font-mono text-xs text-slate-500">{c.phone}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-600">
                        {c.address || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {c.vehicle_count ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditCustomerModal(c)}
                            title="Edit customer"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c.id)}
                            title="Delete customer"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Customer Registration / Edit Modal */}
      <Modal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Account' : 'Register Customer Account'}
        subtitle="Module 1 · Fleet owner or individual customer profile"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Primary Contact Name *</label>
              <input
                required
                type="text"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="e.g. Rajesh Kulkarni"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Company / Fleet Name</label>
              <input
                type="text"
                value={customerForm.company_name}
                onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                placeholder="e.g. Sahyadri Cold Chain Logistics Pvt. Ltd."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address *</label>
              <input
                required
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="fleet@company.in"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Phone Number *</label>
              <input
                required
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="+91 98204 51820"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Account Classification</label>
              <select
                value={customerForm.account_type}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, account_type: e.target.value as AccountType })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Billing / Depot Address</label>
              <input
                type="text"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                placeholder="Plot / Street, City, State, PIN Code"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCustomerModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Registration / Edit Modal */}
      <Modal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        title={editingVehicle ? 'Edit Fleet Vehicle' : 'Register Fleet Vehicle'}
        subtitle="Module 1 · Assign vehicle telemetry and owner details"
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Customer / Fleet Owner *</label>
            <select
              required
              value={vehicleForm.customer_id}
              onChange={(e) => setVehicleForm({ ...vehicleForm, customer_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value={0}>Select customer account...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name ? `${c.company_name} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">RTO Registration No. *</label>
              <input
                required
                type="text"
                value={vehicleForm.license_plate}
                onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                placeholder="e.g. MH-14-FC-4021"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Chassis / VIN *</label>
              <input
                required
                type="text"
                value={vehicleForm.vin}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                placeholder="17-character Chassis / VIN"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Make *</label>
              <input
                required
                type="text"
                value={vehicleForm.make}
                onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                placeholder="e.g. Tata / Mahindra"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Model *</label>
              <input
                required
                type="text"
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                placeholder="e.g. Ace Gold Diesel+"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Year *</label>
              <input
                required
                type="number"
                min={1980}
                max={2030}
                value={vehicleForm.year}
                onChange={(e) => setVehicleForm({ ...vehicleForm, year: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Current Odometer (km) *</label>
              <input
                required
                type="number"
                min={0}
                value={vehicleForm.odometer_km}
                onChange={(e) => setVehicleForm({ ...vehicleForm, odometer_km: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Vehicle Type</label>
              <select
                value={vehicleForm.vehicle_type}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value as VehicleType })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {VEHICLE_TYPES.map((vt) => (
                  <option key={vt} value={vt}>
                    {vt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Fuel / Powertrain</label>
              <select
                value={vehicleForm.fuel_type}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value as FuelType })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Operational Status</label>
              <select
                value={vehicleForm.status}
                onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value as VehicleStatus })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {VEHICLE_STATUSES.filter((s) => s !== 'All').map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Last Service Date</label>
              <input
                type="date"
                value={vehicleForm.last_service_date}
                onChange={(e) => setVehicleForm({ ...vehicleForm, last_service_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setVehicleModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Dossier Modal (Full History & Maintenance Schedules) */}
      <Modal
        open={selectedVehicleId !== null}
        onClose={() => onSelectVehicleId(null)}
        title={
          vehicleDetail
            ? `${vehicleDetail.vehicle.year} ${vehicleDetail.vehicle.make} ${vehicleDetail.vehicle.model}`
            : 'Vehicle Service Dossier'
        }
        subtitle={
          vehicleDetail
            ? `${vehicleDetail.vehicle.license_plate} · VIN ${vehicleDetail.vehicle.vin}`
            : 'Loading vehicle telemetry and repair history...'
        }
        maxWidthClass="max-w-3xl"
      >
        {detailLoading || !vehicleDetail ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading vehicle history...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Fleet Owner</div>
                <div className="mt-0.5 text-sm font-medium text-slate-900">
                  {vehicleDetail.customer.company_name || vehicleDetail.customer.name}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Odometer</div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  {formatNumber(vehicleDetail.vehicle.odometer_km)} km
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Powertrain</div>
                <div className="mt-0.5 text-sm text-slate-800">
                  {vehicleDetail.vehicle.vehicle_type} · {vehicleDetail.vehicle.fuel_type}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="mt-1">
                  <StatusText value={vehicleDetail.vehicle.status} />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Maintenance Schedules ({vehicleDetail.schedules.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const id = vehicleDetail.vehicle.id;
                    onSelectVehicleId(null);
                    onQuickBookForVehicle(id);
                  }}
                  className="text-xs font-medium text-blue-700 hover:text-blue-800"
                >
                  Book service appointment
                </button>
              </div>
              {vehicleDetail.schedules.length === 0 ? (
                <p className="text-xs text-slate-500">No preventive maintenance schedules configured.</p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {vehicleDetail.schedules.map((sch) => (
                    <div key={sch.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <div>
                        <div className="font-medium text-slate-900">{sch.task_name}</div>
                        <div className="font-mono text-slate-500 tabular-nums">
                          Due at {formatNumber(sch.next_due_km)} km · {formatDate(sch.next_due_date)}
                        </div>
                      </div>
                      <StatusText value={sch.health || 'Upcoming'} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Repair & Service History ({vehicleDetail.repairs.length})
              </h3>
              {vehicleDetail.repairs.length === 0 ? (
                <p className="text-xs text-slate-500">No repair logs recorded for this vehicle yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {vehicleDetail.repairs.map((rep) => (
                    <div key={rep.id} className="px-4 py-3 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-medium text-slate-900">{rep.title}</div>
                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(rep.total_cost || 0)}
                        </div>
                      </div>
                      <div className="mt-0.5 text-slate-500">
                        {formatDate(rep.service_date)} · {formatNumber(rep.odometer_at_service)} km · {rep.technician}
                      </div>
                      <p className="mt-1 text-slate-600">{rep.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
