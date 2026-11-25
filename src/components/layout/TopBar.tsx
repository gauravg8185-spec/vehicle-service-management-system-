import { Menu, Plus } from 'lucide-react';
import type { ActiveModule } from '../../types/fleet';

interface TopBarProps {
  activeModule: ActiveModule;
  onOpenMobileMenu: () => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
}

const MODULE_META: Record<ActiveModule, { breadcrumb: string; title: string }> = {
  overview: {
    breadcrumb: 'Operations / Fleet Overview',
    title: 'Workshop & Maintenance Overview',
  },
  'customers-vehicles': {
    breadcrumb: 'Module 1 / Registry',
    title: 'Customers & Fleet Vehicles',
  },
  appointments: {
    breadcrumb: 'Module 2 / Scheduling',
    title: 'Service Appointments',
  },
  'repairs-schedules': {
    breadcrumb: 'Module 3 / Service Desk',
    title: 'Repair History & Maintenance Schedules',
  },
  invoices: {
    breadcrumb: 'Module 4 / Billing',
    title: 'Service Charges & Invoices',
  },
};

export function TopBar({
  activeModule,
  onOpenMobileMenu,
  primaryActionLabel,
  onPrimaryAction,
}: TopBarProps) {
  const meta = MODULE_META[activeModule];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 sm:px-6 no-print">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-xs text-slate-500">{meta.breadcrumb}</div>
          <h1 className="truncate font-display text-base font-semibold text-slate-900 sm:text-lg">
            {meta.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{primaryActionLabel}</span>
        </button>
      </div>
    </header>
  );
}
