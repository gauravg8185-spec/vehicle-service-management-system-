import { ArrowRight, CalendarClock, CarFront, FileSpreadsheet, Wrench } from 'lucide-react';
import type { ActiveModule, DashboardSummary } from '../../types/fleet';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { LoadingRows } from '../common/LoadingRows';
import { StatusText } from '../common/StatusText';

interface OverviewDashboardProps {
  data: DashboardSummary | null;
  loading: boolean;
  onNavigate: (module: ActiveModule) => void;
  onQuickBookForVehicle: (vehicleId: number) => void;
  onOpenVehicleDetail: (vehicleId: number) => void;
}

export function OverviewDashboard({
  data,
  loading,
  onNavigate,
  onQuickBookForVehicle,
  onOpenVehicleDetail,
}: OverviewDashboardProps) {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
        <LoadingRows rows={5} cols={5} />
      </div>
    );
  }

  const { metrics, maintenance_alerts, upcoming_appointments, recent_repairs, recent_invoices } = data;

  return (
    <div className="space-y-8">
      {/* 4-Column KPI Strip */}
      <section aria-label="Fleet key performance indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Fleet Vehicles</span>
            <CarFront className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {metrics.total_vehicles}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {metrics.active_vehicles} active · {metrics.in_service_vehicles} in bay
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('customers-vehicles')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            <span>Manage fleet registry</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Maintenance Alerts</span>
            <Wrench className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {metrics.overdue_schedules + metrics.due_soon_schedules}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {metrics.overdue_schedules} overdue · {metrics.due_soon_schedules} due soon
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('repairs-schedules')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            <span>Review maintenance schedules</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Service Queue</span>
            <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {metrics.upcoming_appointments}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              scheduled · {metrics.open_repairs} active repairs
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('appointments')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            <span>Open appointment bay board</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Service Billing</span>
            <FileSpreadsheet className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(metrics.paid_invoice_total)}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              collected
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-medium tabular-nums">
              {formatCurrency(metrics.pending_invoice_total)} pending
            </span>
            <button
              type="button"
              onClick={() => onNavigate('invoices')}
              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-800"
            >
              <span>Invoices</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Maintenance Schedule Alerts */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Preventive Maintenance Alerts</h2>
            <p className="text-xs text-slate-500">Vehicles approaching or past mileage and calendar service intervals</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('repairs-schedules')}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            View all schedules
          </button>
        </div>

        {maintenance_alerts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            All fleet maintenance intervals are currently up to date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-2.5">Vehicle</th>
                  <th className="px-4 py-2.5">Maintenance Task</th>
                  <th className="px-4 py-2.5 text-right">Current Odometer</th>
                  <th className="px-4 py-2.5 text-right">Due Threshold</th>
                  <th className="px-4 py-2.5">Due Date</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenance_alerts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenVehicleDetail(item.vehicle_id)}
                        className="text-left hover:underline"
                      >
                        <div className="font-mono text-xs font-semibold text-slate-900">{item.license_plate}</div>
                        <div className="text-xs text-slate-500">{item.vehicle_label}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{item.task_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {formatNumber(item.current_odometer_km || 0)} km
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {formatNumber(item.next_due_km)} km
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatDate(item.next_due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText value={item.health || 'Due Soon'} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onQuickBookForVehicle(item.vehicle_id)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      >
                        Book service
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Upcoming Appointments & Recent Repairs */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Bay Appointments</h2>
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Manage schedule
            </button>
          </div>
          {upcoming_appointments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No active appointments queued.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming_appointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/70">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-900">{appt.license_plate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{appt.customer_name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{appt.bay_number}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-slate-900">{appt.service_type}</div>
                    <div className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                      {formatDate(appt.appointment_date)} · {appt.time_slot} · {appt.assigned_technician}
                    </div>
                  </div>
                  <StatusText value={appt.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Recent Repair Logs & Billing</h2>
            <button
              type="button"
              onClick={() => onNavigate('repairs-schedules')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              All repair logs
            </button>
          </div>
          {recent_repairs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No repair records logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent_repairs.map((repair) => (
                <div key={repair.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/70">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-900">{repair.license_plate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{repair.service_category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatDate(repair.service_date)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-slate-900">{repair.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Technician: {repair.technician}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(repair.total_cost || 0)}
                    </div>
                    <StatusText value={repair.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Invoices Strip */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Recent Service Invoices</h2>
          <button
            type="button"
            onClick={() => onNavigate('invoices')}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            Open billing ledger
          </button>
        </div>
        {recent_invoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No invoices generated yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Vehicle</th>
                  <th className="px-4 py-2.5">Issue Date</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-900">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-slate-700">{inv.company_name || inv.customer_name}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      <span className="font-mono text-xs text-slate-900">{inv.license_plate}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{inv.vehicle_label}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 tabular-nums">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusText value={inv.payment_status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
