import { AlertTriangle, CheckCircle2, Clock, Wrench, XCircle } from 'lucide-react';

interface StatusTextProps {
  value: string;
}

export function StatusText({ value }: StatusTextProps) {
  switch (value) {
    case 'Active':
    case 'Completed':
    case 'Paid':
    case 'Upcoming':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{value}</span>
        </span>
      );
    case 'In Service':
    case 'In Bay':
    case 'In Progress':
    case 'Scheduled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          {value === 'Scheduled' ? (
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{value}</span>
        </span>
      );
    case 'Maintenance Due':
    case 'Due Soon':
    case 'Pending':
    case 'Pending Parts':
    case 'High':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{value}</span>
        </span>
      );
    case 'Overdue':
    case 'Out of Service':
    case 'Critical':
    case 'Urgent':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{value}</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{value}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <span>{value}</span>
        </span>
      );
  }
}
