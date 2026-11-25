import { CalendarCheck2, Edit2, FileSpreadsheet, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fleetApi } from '../../api/client';
import type {
  LineItemType,
  MaintenanceSchedule,
  RepairCategory,
  RepairLineItem,
  RepairRecord,
  RepairStatus,
  ScheduleHealth,
  SchedulePriority,
  ServiceAppointment,
  Vehicle,
} from '../../types/fleet';
import { formatCurrency, formatDate, formatNumber, todayIsoDate } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';
import { LoadingRows } from '../common/LoadingRows';
import { Modal } from '../common/Modal';
import { StatusText } from '../common/StatusText';

interface RepairsSchedulesModuleProps {
  repairs: RepairRecord[];
  schedules: MaintenanceSchedule[];
  vehicles: Vehicle[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  externalCreateTrigger: number;
  seedAppointment: ServiceAppointment | null;
  onClearSeedAppointment: () => void;
  onGenerateInvoiceFromRepair: (repair: RepairRecord) => void;
}

type ServiceSubTab = 'repairs' | 'schedules';

const REPAIR_CATEGORIES: RepairCategory[] = [
  'Preventive Maintenance',
  'Brake & Suspension',
  'Engine & Transmission',
  'Electrical & Diagnostics',
  'Tires & Alignment',
  'Body & Safety',
];

const REPAIR_STATUSES: Array<'All' | RepairStatus> = ['All', 'In Progress', 'Pending Parts', 'Completed'];
const SCHEDULE_HEALTHS: Array<'All' | ScheduleHealth> = ['All', 'Overdue', 'Due Soon', 'Upcoming'];
const LINE_ITEM_TYPES: LineItemType[] = ['Part', 'Fluid', 'Diagnostic', 'Labor'];

export function RepairsSchedulesModule({
  repairs,
  schedules,
  vehicles,
  loading,
  onRefresh,
  externalCreateTrigger,
  seedAppointment,
  onClearSeedAppointment,
  onGenerateInvoiceFromRepair,
}: RepairsSchedulesModuleProps) {
  const [activeTab, setActiveTab] = useState<ServiceSubTab>('repairs');
  const [searchQuery, setSearchQuery] = useState('');
  const [repairStatusFilter, setRepairStatusFilter] = useState<'All' | RepairStatus>('All');
  const [scheduleHealthFilter, setScheduleHealthFilter] = useState<'All' | ScheduleHealth>('All');

  // Repair modal state
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairRecord | null>(null);
  const [repairForm, setRepairForm] = useState({
    vehicle_id: 0,
    appointment_id: null as number | null,
    service_date: todayIsoDate(),
    odometer_at_service: 0,
    service_category: 'Preventive Maintenance' as RepairCategory,
    title: '',
    description: '',
    technician: 'Ramesh Yadav',
    labor_hours: 1.5,
    labor_rate: 850,
    parts_cost: 0,
    status: 'Completed' as RepairStatus,
  });
  const [lineItems, setLineItems] = useState<Array<Omit<RepairLineItem, 'id' | 'repair_id' | 'line_total'>>>([]);

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    vehicle_id: 0,
    task_name: '',
    interval_km: 10000,
    interval_days: 180,
    last_completed_km: 0,
    last_completed_date: todayIsoDate(),
    priority: 'Standard' as SchedulePriority,
    notes: '',
  });

  // Complete schedule modal
  const [completingSchedule, setCompletingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [completeForm, setCompleteForm] = useState({
    completed_km: 0,
    completed_date: todayIsoDate(),
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (externalCreateTrigger > 0) {
      if (activeTab === 'schedules') {
        openNewScheduleModal();
      } else {
        openNewRepairModal();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCreateTrigger]);

  useEffect(() => {
    if (seedAppointment) {
      setActiveTab('repairs');
      const matchedVehicle = vehicles.find((v) => v.id === seedAppointment.vehicle_id);
      setEditingRepair(null);
      setFormError(null);
      setRepairForm({
        vehicle_id: seedAppointment.vehicle_id,
        appointment_id: seedAppointment.id,
        service_date: todayIsoDate(),
        odometer_at_service: matchedVehicle?.odometer_km || 0,
        service_category: 'Preventive Maintenance',
        title: seedAppointment.service_type,
        description: seedAppointment.notes || `Service work for appointment #${seedAppointment.id}`,
        technician: seedAppointment.assigned_technician,
        labor_hours: 2.0,
        labor_rate: 850,
        parts_cost: 0,
        status: 'Completed',
      });
      setLineItems([]);
      setRepairModalOpen(true);
      onClearSeedAppointment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedAppointment]);

  const openNewRepairModal = () => {
    const firstVehicle = vehicles[0];
    setEditingRepair(null);
    setFormError(null);
    setRepairForm({
      vehicle_id: firstVehicle?.id ?? 0,
      appointment_id: null,
      service_date: todayIsoDate(),
      odometer_at_service: firstVehicle?.odometer_km ?? 0,
      service_category: 'Preventive Maintenance',
      title: '',
      description: '',
      technician: 'Ramesh Yadav',
      labor_hours: 1.5,
      labor_rate: 850,
      parts_cost: 0,
      status: 'Completed',
    });
    setLineItems([
      {
        item_type: 'Part',
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
    setRepairModalOpen(true);
  };

  const openEditRepairModal = (r: RepairRecord) => {
    setEditingRepair(r);
    setFormError(null);
    setRepairForm({
      vehicle_id: r.vehicle_id,
      appointment_id: r.appointment_id,
      service_date: r.service_date,
      odometer_at_service: r.odometer_at_service,
      service_category: r.service_category,
      title: r.title,
      description: r.description,
      technician: r.technician,
      labor_hours: r.labor_hours,
      labor_rate: r.labor_rate,
      parts_cost: r.parts_cost,
      status: r.status,
    });
    setLineItems(
      r.line_items.map((li) => ({
        item_type: li.item_type,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
      }))
    );
    setRepairModalOpen(true);
  };

  const openNewScheduleModal = () => {
    const firstVehicle = vehicles[0];
    setFormError(null);
    setScheduleForm({
      vehicle_id: firstVehicle?.id ?? 0,
      task_name: '',
      interval_km: 10000,
      interval_days: 180,
      last_completed_km: firstVehicle?.odometer_km ?? 0,
      last_completed_date: todayIsoDate(),
      priority: 'Standard',
      notes: '',
    });
    setScheduleModalOpen(true);
  };

  const handleVehicleSelectInRepair = (vehicleId: number) => {
    const matched = vehicles.find((v) => v.id === vehicleId);
    setRepairForm((prev) => ({
      ...prev,
      vehicle_id: vehicleId,
      odometer_at_service: matched ? matched.odometer_km : prev.odometer_at_service,
    }));
  };

  const handleVehicleSelectInSchedule = (vehicleId: number) => {
    const matched = vehicles.find((v) => v.id === vehicleId);
    setScheduleForm((prev) => ({
      ...prev,
      vehicle_id: vehicleId,
      last_completed_km: matched ? matched.odometer_km : prev.last_completed_km,
    }));
  };

  const computedPartsFromItems = lineItems
    .filter((i) => i.description.trim().length > 0 && i.item_type !== 'Labor')
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const handleSaveRepair = async (e: FormEvent) => {
    e.preventDefault();
    if (!repairForm.vehicle_id) {
      setFormError('Please select a vehicle.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const validItems = lineItems.filter((item) => item.description.trim().length > 0);
      const partsCost =
        repairForm.parts_cost > 0 ? repairForm.parts_cost : Number(computedPartsFromItems.toFixed(2));

      const payload = {
        ...repairForm,
        parts_cost: partsCost,
        line_items: validItems,
      };

      if (editingRepair) {
        await fleetApi.updateRepair(editingRepair.id, payload);
      } else {
        await fleetApi.createRepair(payload);
      }
      setRepairModalOpen(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save repair record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRepair = async (id: number) => {
    try {
      await fleetApi.deleteRepair(id);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to delete repair record');
    }
  };

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.vehicle_id) {
      setFormError('Please select a vehicle.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await fleetApi.createSchedule(scheduleForm);
      setScheduleModalOpen(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save maintenance schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmScheduleComplete = async (e: FormEvent) => {
    e.preventDefault();
    if (!completingSchedule) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await fleetApi.completeSchedule(completingSchedule.id, completeForm);
      setCompletingSchedule(null);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to complete maintenance interval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await fleetApi.deleteSchedule(id);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to delete schedule');
    }
  };

  const filteredRepairs = repairs.filter((r) => {
    const matchesStatus = repairStatusFilter === 'All' || r.status === repairStatusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.technician.toLowerCase().includes(q) ||
      (r.license_plate || '').toLowerCase().includes(q) ||
      (r.customer_name || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredSchedules = schedules.filter((s) => {
    const matchesHealth = scheduleHealthFilter === 'All' || s.health === scheduleHealthFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.task_name.toLowerCase().includes(q) ||
      (s.license_plate || '').toLowerCase().includes(q) ||
      (s.vehicle_label || '').toLowerCase().includes(q);
    return matchesHealth && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('repairs')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'repairs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Repair & Service Logs ({repairs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Maintenance Schedules ({schedules.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'repairs'
                  ? 'Search repair title, plate, tech...'
                  : 'Search task, plate, vehicle...'
              }
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openNewScheduleModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Schedule</span>
          </button>

          <button
            type="button"
            onClick={openNewRepairModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Log Repair</span>
          </button>
        </div>
      </div>

      {activeTab === 'repairs' && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {REPAIR_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setRepairStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  repairStatusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingRows rows={5} cols={7} />
          ) : filteredRepairs.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No repair records found"
              description="Log diagnostic findings, parts replaced, labor hours, and technician notes to maintain a complete fleet service ledger."
              actionLabel="Log Repair Record"
              onAction={openNewRepairModal}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Date & Odometer</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Work Performed & Parts</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3 text-right">Labor + Parts</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRepairs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs tabular-nums">
                        <div className="font-semibold text-slate-900">{formatDate(r.service_date)}</div>
                        <div className="text-slate-500">{formatNumber(r.odometer_at_service)} km</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-900">{r.license_plate}</div>
                        <div className="text-xs text-slate-500">{r.vehicle_label}</div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="text-xs text-slate-500">{r.service_category}</div>
                        <div className="font-medium text-slate-900">{r.title}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {r.line_items.length > 0
                            ? `${r.line_items.length} itemized line(s) · ${r.description}`
                            : r.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{r.technician}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(r.total_cost || r.labor_hours * r.labor_rate + r.parts_cost)}
                        </div>
                        <div className="text-slate-500">
                          {r.labor_hours}h @ {formatCurrency(r.labor_rate)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusText value={r.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!r.invoice_id && (
                            <button
                              type="button"
                              onClick={() => onGenerateInvoiceFromRepair(r)}
                              title="Calculate charges & generate invoice"
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                            >
                              <FileSpreadsheet className="h-3 w-3" />
                              <span>Invoice</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditRepairModal(r)}
                            title="Edit repair record"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRepair(r.id)}
                            title="Delete repair record"
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

      {activeTab === 'schedules' && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {SCHEDULE_HEALTHS.map((health) => (
              <button
                key={health}
                type="button"
                onClick={() => setScheduleHealthFilter(health)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  scheduleHealthFilter === health
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {health}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingRows rows={5} cols={7} />
          ) : filteredSchedules.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="No maintenance schedules in this view"
              description="Define recurring mileage and calendar intervals (oil changes, brake inspections, DPF servicing) for fleet vehicles."
              actionLabel="Add Maintenance Schedule"
              onAction={openNewScheduleModal}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Vehicle</th>
                    <th className="px-4 py-3">Preventive Task & Interval</th>
                    <th className="px-4 py-3 text-right">Current Odometer</th>
                    <th className="px-4 py-3 text-right">Next Due Mileage</th>
                    <th className="px-4 py-3">Next Due Date</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-900">{sch.license_plate}</div>
                        <div className="text-xs text-slate-500">{sch.vehicle_label}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{sch.task_name}</div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums">
                          Every {formatNumber(sch.interval_km)} km or {sch.interval_days} days
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                        {formatNumber(sch.current_odometer_km || 0)} km
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatNumber(sch.next_due_km)} km
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums">
                        {formatDate(sch.next_due_date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusText value={sch.health || 'Upcoming'} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCompletingSchedule(sch);
                              setFormError(null);
                              setCompleteForm({
                                completed_km: sch.current_odometer_km || sch.next_due_km,
                                completed_date: todayIsoDate(),
                              });
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
                          >
                            Log Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sch.id)}
                            title="Delete maintenance schedule"
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
        </>
      )}

      {/* Repair Record Modal */}
      <Modal
        open={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        title={editingRepair ? 'Edit Repair Record' : 'Log Repair & Service Record'}
        subtitle="Module 3 · Record parts replaced, labor hours, and odometer telemetry"
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSaveRepair} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Fleet Vehicle *</label>
              <select
                required
                value={repairForm.vehicle_id}
                onChange={(e) => handleVehicleSelectInRepair(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value={0}>Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} — {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Service Category</label>
              <select
                value={repairForm.service_category}
                onChange={(e) =>
                  setRepairForm({ ...repairForm, service_category: e.target.value as RepairCategory })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {REPAIR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Repair / Service Title *</label>
              <input
                required
                type="text"
                value={repairForm.title}
                onChange={(e) => setRepairForm({ ...repairForm, title: e.target.value })}
                placeholder="e.g. Front Brake Pad & Rotor Replacement"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Assigned Technician *</label>
              <input
                required
                type="text"
                value={repairForm.technician}
                onChange={(e) => setRepairForm({ ...repairForm, technician: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Service Date *</label>
              <input
                required
                type="date"
                value={repairForm.service_date}
                onChange={(e) => setRepairForm({ ...repairForm, service_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Odometer at Service (km) *</label>
              <input
                required
                type="number"
                min={0}
                value={repairForm.odometer_at_service}
                onChange={(e) => setRepairForm({ ...repairForm, odometer_at_service: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Diagnostic Findings & Work Description *</label>
            <textarea
              required
              rows={2}
              value={repairForm.description}
              onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })}
              placeholder="Detail inspection results, torque specs, replaced components, and test drive confirmation..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Labor & Parts Costing */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Labor Hours</label>
              <input
                type="number"
                step="0.25"
                min={0}
                value={repairForm.labor_hours}
                onChange={(e) => setRepairForm({ ...repairForm, labor_hours: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Labor Rate (₹/hr)</label>
              <input
                type="number"
                step="10"
                min={0}
                value={repairForm.labor_rate}
                onChange={(e) => setRepairForm({ ...repairForm, labor_rate: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Parts Override (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={repairForm.parts_cost}
                onChange={(e) => setRepairForm({ ...repairForm, parts_cost: Number(e.target.value) })}
                placeholder={computedPartsFromItems.toFixed(2)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Record Status</label>
              <select
                value={repairForm.status}
                onChange={(e) => setRepairForm({ ...repairForm, status: e.target.value as RepairStatus })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Parts">Pending Parts</option>
              </select>
            </div>
          </div>

          {/* Itemized Parts & Diagnostics */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                Itemized Parts & Diagnostics (auto-summed if override is 0)
              </span>
              <button
                type="button"
                onClick={() =>
                  setLineItems([
                    ...lineItems,
                    { item_type: 'Part', description: '', quantity: 1, unit_price: 0 },
                  ])
                }
                className="text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                + Add line item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <select
                    value={item.item_type}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = { ...next[idx], item_type: e.target.value as LineItemType };
                      setLineItems(next);
                    }}
                    className="col-span-3 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    {LINE_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setLineItems(next);
                    }}
                    placeholder="Part / fluid description"
                    className="col-span-5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                      setLineItems(next);
                    }}
                    className="col-span-1 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs focus:border-blue-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unit_price}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = { ...next[idx], unit_price: Number(e.target.value) };
                      setLineItems(next);
                    }}
                    placeholder="Unit $"
                    className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                    aria-label="Remove line item"
                    className="col-span-1 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="font-mono text-xs text-slate-600 tabular-nums">
              Estimated Total:{' '}
              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  repairForm.labor_hours * repairForm.labor_rate +
                    (repairForm.parts_cost > 0 ? repairForm.parts_cost : computedPartsFromItems)
                )}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRepairModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingRepair ? 'Update Repair' : 'Save Repair Record'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Maintenance Schedule Modal */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Add Preventive Maintenance Schedule"
        subtitle="Track recurring mileage and calendar intervals per fleet vehicle"
      >
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Fleet Vehicle *</label>
            <select
              required
              value={scheduleForm.vehicle_id}
              onChange={(e) => handleVehicleSelectInSchedule(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value={0}>Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} — {v.year} {v.make} {v.model} ({formatNumber(v.odometer_km)} km)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Maintenance Task Name *</label>
            <input
              required
              type="text"
              value={scheduleForm.task_name}
              onChange={(e) => setScheduleForm({ ...scheduleForm, task_name: e.target.value })}
              placeholder="e.g. Transmission Fluid & Filter Service"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Interval Mileage (km) *</label>
              <input
                required
                type="number"
                min={500}
                value={scheduleForm.interval_km}
                onChange={(e) => setScheduleForm({ ...scheduleForm, interval_km: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Interval Calendar (days) *</label>
              <input
                required
                type="number"
                min={7}
                value={scheduleForm.interval_days}
                onChange={(e) => setScheduleForm({ ...scheduleForm, interval_days: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Last Completed Odometer (km) *</label>
              <input
                required
                type="number"
                min={0}
                value={scheduleForm.last_completed_km}
                onChange={(e) => setScheduleForm({ ...scheduleForm, last_completed_km: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Last Completed Date *</label>
              <input
                required
                type="date"
                value={scheduleForm.last_completed_date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, last_completed_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Priority</label>
              <select
                value={scheduleForm.priority}
                onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value as SchedulePriority })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="Standard">Standard</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Schedule Modal */}
      <Modal
        open={completingSchedule !== null}
        onClose={() => setCompletingSchedule(null)}
        title="Log Maintenance Interval Completed"
        subtitle={
          completingSchedule
            ? `${completingSchedule.license_plate} · ${completingSchedule.task_name}`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmScheduleComplete} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Odometer at Completion (km) *</label>
              <input
                required
                type="number"
                min={0}
                value={completeForm.completed_km}
                onChange={(e) => setCompleteForm({ ...completeForm, completed_km: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Completion Date *</label>
              <input
                required
                type="date"
                value={completeForm.completed_date}
                onChange={(e) => setCompleteForm({ ...completeForm, completed_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCompletingSchedule(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Advance Next Interval'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
