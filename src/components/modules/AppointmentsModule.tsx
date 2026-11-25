import { CalendarClock, Check, Play, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fleetApi } from '../../api/client';
import type {
  AppointmentPriority,
  AppointmentStatus,
  ServiceAppointment,
  Vehicle,
} from '../../types/fleet';
import { formatDate, todayIsoDate } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';
import { LoadingRows } from '../common/LoadingRows';
import { Modal } from '../common/Modal';
import { StatusText } from '../common/StatusText';

interface AppointmentsModuleProps {
  appointments: ServiceAppointment[];
  vehicles: Vehicle[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  externalCreateTrigger: number;
  preselectedVehicleId: number | null;
  onClearPreselectedVehicle: () => void;
  onConvertToRepair: (appointment: ServiceAppointment) => void;
}

const STATUS_TABS: Array<'All' | AppointmentStatus> = ['All', 'Scheduled', 'In Bay', 'Completed', 'Cancelled'];
const BAYS = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Alignment Rack'];
const TIME_SLOTS = ['08:00 AM', '08:30 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:30 PM'];

export function AppointmentsModule({
  appointments,
  vehicles,
  loading,
  onRefresh,
  externalCreateTrigger,
  preselectedVehicleId,
  onClearPreselectedVehicle,
  onConvertToRepair,
}: AppointmentsModuleProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    vehicle_id: 0,
    appointment_date: todayIsoDate(),
    time_slot: '09:00 AM',
    service_type: '',
    bay_number: 'Bay 1',
    assigned_technician: 'Ramesh Yadav',
    priority: 'Standard' as AppointmentPriority,
    notes: '',
  });

  useEffect(() => {
    if (externalCreateTrigger > 0) {
      openBookingModal(preselectedVehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCreateTrigger]);

  useEffect(() => {
    if (preselectedVehicleId) {
      openBookingModal(preselectedVehicleId);
      onClearPreselectedVehicle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedVehicleId]);

  const openBookingModal = (vehicleId?: number | null) => {
    setFormError(null);
    setForm({
      vehicle_id: vehicleId || vehicles[0]?.id || 0,
      appointment_date: todayIsoDate(),
      time_slot: '09:00 AM',
      service_type: '',
      bay_number: 'Bay 1',
      assigned_technician: 'Ramesh Yadav',
      priority: 'Standard',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleBookAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id) {
      setFormError('Please select a registered vehicle.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await fleetApi.createAppointment({
        ...form,
        status: 'Scheduled',
      });
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, status: AppointmentStatus) => {
    try {
      await fleetApi.updateAppointmentStatus(id, status);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fleetApi.deleteAppointment(id);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to remove appointment');
    }
  };

  const filtered = appointments.filter((a) => {
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (a.license_plate || '').toLowerCase().includes(q) ||
      (a.vehicle_label || '').toLowerCase().includes(q) ||
      (a.customer_name || '').toLowerCase().includes(q) ||
      a.service_type.toLowerCase().includes(q) ||
      a.assigned_technician.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, service, technician..."
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => openBookingModal(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={5} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No service appointments in this view"
          description="Book a service appointment for a fleet vehicle to reserve a workshop bay and assign a technician."
          actionLabel="Book Appointment"
          onAction={() => openBookingModal(null)}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Date & Slot</th>
                <th className="px-4 py-3">Vehicle & Owner</th>
                <th className="px-4 py-3">Requested Service</th>
                <th className="px-4 py-3">Bay · Technician</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs tabular-nums">
                    <div className="font-semibold text-slate-900">{formatDate(appt.appointment_date)}</div>
                    <div className="text-slate-500">{appt.time_slot}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-slate-900">{appt.license_plate}</div>
                    <div className="text-xs text-slate-500">
                      {appt.vehicle_label} · {appt.customer_name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{appt.service_type}</div>
                    {appt.notes && <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{appt.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    <div className="font-medium text-slate-900">{appt.bay_number}</div>
                    <div className="text-slate-500">{appt.assigned_technician}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusText value={appt.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusText value={appt.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {appt.status === 'Scheduled' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(appt.id, 'In Bay')}
                          title="Move vehicle into bay"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                        >
                          <Play className="h-3 w-3" />
                          <span>Start Bay</span>
                        </button>
                      )}
                      {appt.status === 'In Bay' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onConvertToRepair(appt)}
                            title="Log repair record from this appointment"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            <Wrench className="h-3 w-3" />
                            <span>Log Repair</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(appt.id, 'Completed')}
                            title="Mark appointment complete"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
                          >
                            <Check className="h-3 w-3" />
                            <span>Complete</span>
                          </button>
                        </>
                      )}
                      {appt.status === 'Scheduled' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                          title="Cancel appointment"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(appt.id)}
                        title="Delete appointment"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
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

      {/* Book Service Appointment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Book Service Appointment"
        subtitle="Module 2 · Schedule workshop bay, technician, and service window"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Fleet Vehicle *</label>
            <select
              required
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value={0}>Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} — {v.year} {v.make} {v.model} ({v.company_name || v.customer_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Service / Inspection Type *</label>
            <input
              required
              type="text"
              value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              placeholder="e.g. 10,000 km Preventive Oil & Brake Inspection"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Appointment Date *</label>
              <input
                required
                type="date"
                value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Time Slot *</label>
              <select
                value={form.time_slot}
                onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Workshop Bay</label>
              <select
                value={form.bay_number}
                onChange={(e) => setForm({ ...form, bay_number: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {BAYS.map((bay) => (
                  <option key={bay} value={bay}>
                    {bay}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Assigned Technician</label>
              <input
                type="text"
                value={form.assigned_technician}
                onChange={(e) => setForm({ ...form, assigned_technician: e.target.value })}
                placeholder="Technician name"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as AppointmentPriority })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="Standard">Standard</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Driver / Intake Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Symptoms, driver drop-off window, or parts staging notes..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
