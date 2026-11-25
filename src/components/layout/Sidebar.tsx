import {
  CalendarClock,
  CarFront,
  FileSpreadsheet,
  LayoutDashboard,
  Wrench,
  X,
} from 'lucide-react';
import type { ActiveModule } from '../../types/fleet';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  overdueCount: number;
  appointmentsCount: number;
}

interface NavItem {
  id: ActiveModule;
  label: string;
  subtitle: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Fleet Overview',
    subtitle: 'Operational summary',
    icon: LayoutDashboard,
  },
  {
    id: 'customers-vehicles',
    label: 'Customers & Vehicles',
    subtitle: 'Module 1 · Fleet registry',
    icon: CarFront,
  },
  {
    id: 'appointments',
    label: 'Service Appointments',
    subtitle: 'Module 2 · Bay scheduling',
    icon: CalendarClock,
  },
  {
    id: 'repairs-schedules',
    label: 'Repairs & Maintenance',
    subtitle: 'Module 3 · Logs & intervals',
    icon: Wrench,
  },
  {
    id: 'invoices',
    label: 'Charges & Invoices',
    subtitle: 'Module 4 · Billing ledger',
    icon: FileSpreadsheet,
  },
];

export function Sidebar({
  activeModule,
  onSelectModule,
  mobileOpen,
  onCloseMobile,
  overdueCount,
  appointmentsCount,
}: SidebarProps) {
  const handleSelect = (id: ActiveModule) => {
    onSelectModule(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden no-print"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="min-w-0">
            <span className="block font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              FleetCare Service Desk
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary modules">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            const countText =
              item.id === 'repairs-schedules' && overdueCount > 0
                ? `${overdueCount} due`
                : item.id === 'appointments' && appointmentsCount > 0
                ? `${appointmentsCount}`
                : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium whitespace-nowrap">{item.label}</span>
                    {countText && (
                      <span
                        className={`font-mono text-[11px] tabular-nums shrink-0 ${
                          isActive
                            ? 'text-slate-200'
                            : item.id === 'repairs-schedules'
                            ? 'text-red-700 font-medium'
                            : 'text-slate-500'
                        }`}
                      >
                        {countText}
                      </span>
                    )}
                  </div>
                  <span
                    className={`block truncate text-xs ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          <div className="font-medium text-slate-700">Pune Fleet Workshop · MIDC</div>
          <div className="mt-0.5 font-mono text-[11px]">GSTIN 27AAACF4821K1Z5 · 4 Bays</div>
        </div>
      </aside>
    </>
  );
}
