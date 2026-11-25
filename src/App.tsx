import { useCallback, useEffect, useState } from 'react';
import { fleetApi } from './api/client';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AppointmentsModule } from './components/modules/AppointmentsModule';
import { CustomersVehiclesModule } from './components/modules/CustomersVehiclesModule';
import { InvoicesModule } from './components/modules/InvoicesModule';
import { OverviewDashboard } from './components/modules/OverviewDashboard';
import { RepairsSchedulesModule } from './components/modules/RepairsSchedulesModule';
import type {
  ActiveModule,
  Customer,
  DashboardSummary,
  Invoice,
  MaintenanceSchedule,
  RepairRecord,
  ServiceAppointment,
  Vehicle,
} from './types/fleet';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Cross-module workflow bridges
  const [createTrigger, setCreateTrigger] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [preselectedVehicleForAppt, setPreselectedVehicleForAppt] = useState<number | null>(null);
  const [seedAppointmentForRepair, setSeedAppointmentForRepair] = useState<ServiceAppointment | null>(null);
  const [seedRepairForInvoice, setSeedRepairForInvoice] = useState<RepairRecord | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setErrorBanner(null);
      const [dashData, custData, vehData, apptData, repairData, schedData, invData] = await Promise.all([
        fleetApi.getDashboard(),
        fleetApi.getCustomers(),
        fleetApi.getVehicles(),
        fleetApi.getAppointments(),
        fleetApi.getRepairs(),
        fleetApi.getSchedules(),
        fleetApi.getInvoices(),
      ]);
      setDashboard(dashData);
      setCustomers(custData);
      setVehicles(vehData);
      setAppointments(apptData);
      setRepairs(repairData);
      setSchedules(schedData);
      setInvoices(invData);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to connect to fleet service database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handlePrimaryAction = () => {
    if (activeModule === 'overview') {
      setActiveModule('appointments');
      setCreateTrigger((n) => n + 1);
      return;
    }
    setCreateTrigger((n) => n + 1);
  };

  const primaryActionLabel: Record<ActiveModule, string> = {
    overview: 'Book Appointment',
    'customers-vehicles': 'Register Vehicle',
    appointments: 'Book Appointment',
    'repairs-schedules': 'Log Repair',
    invoices: 'New Invoice',
  };

  const handleQuickBookForVehicle = (vehicleId: number) => {
    setPreselectedVehicleForAppt(vehicleId);
    setActiveModule('appointments');
  };

  const handleOpenVehicleDetail = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    setActiveModule('customers-vehicles');
  };

  const handleConvertToRepair = (appointment: ServiceAppointment) => {
    setSeedAppointmentForRepair(appointment);
    setActiveModule('repairs-schedules');
  };

  const handleGenerateInvoiceFromRepair = (repair: RepairRecord) => {
    setSeedRepairForInvoice(repair);
    setActiveModule('invoices');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        overdueCount={dashboard?.metrics.overdue_schedules ?? 0}
        appointmentsCount={dashboard?.metrics.upcoming_appointments ?? 0}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeModule={activeModule}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          primaryActionLabel={primaryActionLabel[activeModule]}
          onPrimaryAction={handlePrimaryAction}
        />

        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {errorBanner && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 no-print">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={loadAllData}
                className="font-medium underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {activeModule === 'overview' && (
            <OverviewDashboard
              data={dashboard}
              loading={loading}
              onNavigate={setActiveModule}
              onQuickBookForVehicle={handleQuickBookForVehicle}
              onOpenVehicleDetail={handleOpenVehicleDetail}
            />
          )}

          {activeModule === 'customers-vehicles' && (
            <CustomersVehiclesModule
              customers={customers}
              vehicles={vehicles}
              loading={loading}
              onRefresh={loadAllData}
              externalCreateTrigger={activeModule === 'customers-vehicles' ? createTrigger : 0}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicleId={setSelectedVehicleId}
              onQuickBookForVehicle={handleQuickBookForVehicle}
            />
          )}

          {activeModule === 'appointments' && (
            <AppointmentsModule
              appointments={appointments}
              vehicles={vehicles}
              loading={loading}
              onRefresh={loadAllData}
              externalCreateTrigger={activeModule === 'appointments' ? createTrigger : 0}
              preselectedVehicleId={preselectedVehicleForAppt}
              onClearPreselectedVehicle={() => setPreselectedVehicleForAppt(null)}
              onConvertToRepair={handleConvertToRepair}
            />
          )}

          {activeModule === 'repairs-schedules' && (
            <RepairsSchedulesModule
              repairs={repairs}
              schedules={schedules}
              vehicles={vehicles}
              loading={loading}
              onRefresh={loadAllData}
              externalCreateTrigger={activeModule === 'repairs-schedules' ? createTrigger : 0}
              seedAppointment={seedAppointmentForRepair}
              onClearSeedAppointment={() => setSeedAppointmentForRepair(null)}
              onGenerateInvoiceFromRepair={handleGenerateInvoiceFromRepair}
            />
          )}

          {activeModule === 'invoices' && (
            <InvoicesModule
              invoices={invoices}
              repairs={repairs}
              vehicles={vehicles}
              loading={loading}
              onRefresh={loadAllData}
              externalCreateTrigger={activeModule === 'invoices' ? createTrigger : 0}
              seedRepair={seedRepairForInvoice}
              onClearSeedRepair={() => setSeedRepairForInvoice(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
