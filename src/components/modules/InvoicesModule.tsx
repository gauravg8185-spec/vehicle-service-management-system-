import { CheckCircle2, FileSpreadsheet, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fleetApi } from '../../api/client';
import type { Invoice, PaymentStatus, RepairRecord, Vehicle } from '../../types/fleet';
import { addDaysIsoDate, formatCurrency, formatDate, todayIsoDate } from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';
import { LoadingRows } from '../common/LoadingRows';
import { Modal } from '../common/Modal';
import { StatusText } from '../common/StatusText';

interface InvoicesModuleProps {
  invoices: Invoice[];
  repairs: RepairRecord[];
  vehicles: Vehicle[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  externalCreateTrigger: number;
  seedRepair: RepairRecord | null;
  onClearSeedRepair: () => void;
}

const PAYMENT_TABS: Array<'All' | PaymentStatus> = ['All', 'Pending', 'Paid', 'Overdue'];
const PAYMENT_METHODS = [
  'UPI (GPay / PhonePe / Paytm)',
  'NEFT / RTGS / IMPS',
  'Corporate NetBanking',
  'Credit / Debit Card',
  'Cheque',
  'Cash',
];

export function InvoicesModule({
  invoices,
  repairs,
  vehicles,
  loading,
  onRefresh,
  externalCreateTrigger,
  seedRepair,
  onClearSeedRepair,
}: InvoicesModuleProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    repair_id: null as number | null,
    vehicle_id: 0,
    issue_date: todayIsoDate(),
    due_date: addDaysIsoDate(15),
    labor_charge: 0,
    parts_charge: 0,
    shop_supplies: 250,
    discount_amount: 0,
    tax_rate: 18,
    payment_status: 'Pending' as PaymentStatus,
    payment_method: 'UPI (GPay / PhonePe / Paytm)',
    notes: '',
  });

  useEffect(() => {
    if (externalCreateTrigger > 0) {
      openGeneratorModal(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCreateTrigger]);

  useEffect(() => {
    if (seedRepair) {
      openGeneratorModal(seedRepair);
      onClearSeedRepair();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedRepair]);

  const openGeneratorModal = (repair: RepairRecord | null) => {
    setFormError(null);
    if (repair) {
      const labor = Number((repair.labor_hours * repair.labor_rate).toFixed(2));
      setForm({
        repair_id: repair.id,
        vehicle_id: repair.vehicle_id,
        issue_date: todayIsoDate(),
        due_date: addDaysIsoDate(15),
        labor_charge: labor,
        parts_charge: Number(repair.parts_cost.toFixed(2)),
        shop_supplies: 250,
        discount_amount: 0,
        tax_rate: 18,
        payment_status: 'Pending',
        payment_method: 'UPI (GPay / PhonePe / Paytm)',
        notes: `Tax Invoice for: ${repair.title}`,
      });
    } else {
      const firstUnbilled = repairs.find((r) => !r.invoice_id);
      if (firstUnbilled) {
        const labor = Number((firstUnbilled.labor_hours * firstUnbilled.labor_rate).toFixed(2));
        setForm({
          repair_id: firstUnbilled.id,
          vehicle_id: firstUnbilled.vehicle_id,
          issue_date: todayIsoDate(),
          due_date: addDaysIsoDate(15),
          labor_charge: labor,
          parts_charge: Number(firstUnbilled.parts_cost.toFixed(2)),
          shop_supplies: 250,
          discount_amount: 0,
          tax_rate: 18,
          payment_status: 'Pending',
          payment_method: 'NEFT / RTGS / IMPS',
          notes: `Tax Invoice for: ${firstUnbilled.title}`,
        });
      } else {
        setForm({
          repair_id: null,
          vehicle_id: vehicles[0]?.id ?? 0,
          issue_date: todayIsoDate(),
          due_date: addDaysIsoDate(15),
          labor_charge: 1700,
          parts_charge: 0,
          shop_supplies: 250,
          discount_amount: 0,
          tax_rate: 18,
          payment_status: 'Pending',
          payment_method: 'UPI (GPay / PhonePe / Paytm)',
          notes: '',
        });
      }
    }
    setGeneratorOpen(true);
  };

  const handleSelectRepairSource = (repairIdStr: string) => {
    if (!repairIdStr) {
      setForm((prev) => ({ ...prev, repair_id: null }));
      return;
    }
    const repairId = Number(repairIdStr);
    const matched = repairs.find((r) => r.id === repairId);
    if (!matched) return;
    setForm((prev) => ({
      ...prev,
      repair_id: matched.id,
      vehicle_id: matched.vehicle_id,
      labor_charge: Number((matched.labor_hours * matched.labor_rate).toFixed(2)),
      parts_charge: Number(matched.parts_cost.toFixed(2)),
      notes: `Service Invoice for: ${matched.title}`,
    }));
  };

  const taxableSubtotal = Math.max(
    0,
    form.labor_charge + form.parts_charge + form.shop_supplies - form.discount_amount
  );
  const calculatedTax = Math.round((taxableSubtotal * (form.tax_rate / 100) + Number.EPSILON) * 100) / 100;
  const calculatedGrandTotal = Math.round((taxableSubtotal + calculatedTax + Number.EPSILON) * 100) / 100;

  const handleGenerateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id) {
      setFormError('Please select a vehicle.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await fleetApi.createInvoice(form);
      setGeneratorOpen(false);
      setPreviewInvoice(created);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to generate invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, payment_status: PaymentStatus) => {
    try {
      const updated = await fleetApi.updateInvoiceStatus(id, payment_status);
      if (previewInvoice?.id === id) {
        setPreviewInvoice(updated);
      }
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update invoice status');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fleetApi.deleteInvoice(id);
      if (previewInvoice?.id === id) {
        setPreviewInvoice(null);
      }
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to delete invoice');
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All' || inv.payment_status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.license_plate || '').toLowerCase().includes(q) ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.company_name || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const paidSum = invoices
    .filter((i) => i.payment_status === 'Paid')
    .reduce((sum, i) => sum + i.total_amount, 0);
  const outstandingSum = invoices
    .filter((i) => i.payment_status !== 'Paid')
    .reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Billing Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Total Billed ({invoices.length} invoices)</div>
          <div className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(paidSum + outstandingSum)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Collected Revenue</div>
          <div className="mt-1 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
            {formatCurrency(paidSum)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Outstanding Receivables</div>
          <div className="mt-1 font-mono text-xl font-semibold text-amber-700 tabular-nums">
            {formatCurrency(outstandingSum)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
          {PAYMENT_TABS.map((tab) => (
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
              placeholder="Search invoice #, plate, customer..."
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => openGeneratorModal(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Calculate & Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="no-print">
        {loading ? (
          <LoadingRows rows={5} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No invoices found"
            description="Calculate labor, parts, shop supplies, discounts, and tax to generate itemized fleet service invoices."
            actionLabel="Generate Invoice"
            onAction={() => openGeneratorModal(null)}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer / Fleet</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Issue · Due Date</th>
                  <th className="px-4 py-3 text-right">Labor + Parts</th>
                  <th className="px-4 py-3 text-right">Total (incl. GST)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{inv.company_name || inv.customer_name}</div>
                      {inv.company_name && <div className="text-xs text-slate-500">{inv.customer_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-slate-900">{inv.license_plate}</div>
                      <div className="text-xs text-slate-500">{inv.vehicle_label}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      <div>{formatDate(inv.issue_date)}</div>
                      <div className="text-slate-400">Due {formatDate(inv.due_date)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatCurrency(inv.labor_charge + inv.parts_charge)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText value={inv.payment_status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          title="View & print invoice"
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          View / Print
                        </button>
                        {inv.payment_status !== 'Paid' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(inv.id, 'Paid')}
                            title="Mark invoice paid"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id)}
                          title="Delete invoice"
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
      </div>

      {/* Charge Calculator & Invoice Generator Modal */}
      <Modal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        title="Calculate Service Charges & Generate Invoice"
        subtitle="Module 4 · Import repair costs or customize labor, parts, supplies, discount, and tax"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Link Repair Record (Optional)</label>
              <select
                value={form.repair_id ?? ''}
                onChange={(e) => handleSelectRepairSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="">Custom charge (no repair link)</option>
                {repairs.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} · {r.license_plate} — {r.title}
                  </option>
                ))}
              </select>
            </div>

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
                    {v.license_plate} — {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Issue Date *</label>
              <input
                required
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Due Date *</label>
              <input
                required
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Labor Charge (₹)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.labor_charge}
                onChange={(e) => setForm({ ...form, labor_charge: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Parts & Fluids (₹)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.parts_charge}
                onChange={(e) => setForm({ ...form, parts_charge: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Consumables & Misc (₹)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.shop_supplies}
                onChange={(e) => setForm({ ...form, shop_supplies: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">AMC / Fleet Discount (₹)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.discount_amount}
                onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">GST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={50}
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value</span>
              <span className="font-mono tabular-nums">{formatCurrency(taxableSubtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST ({form.tax_rate}% · CGST {(form.tax_rate / 2).toFixed(1)}% + SGST {(form.tax_rate / 2).toFixed(1)}%)</span>
              <span className="font-mono tabular-nums">{formatCurrency(calculatedTax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-semibold text-slate-900">
              <span>Grand Total (INR)</span>
              <span className="font-mono tabular-nums">{formatCurrency(calculatedGrandTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Invoice Notes / UTR or UPI Reference</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Paid via UPI / Net-15 AMC fleet terms"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setGeneratorOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice View Modal */}
      {previewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl print-only-sheet">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">FleetCare Service Desk</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Commercial Fleet Maintenance & Repair Workshop · Chakan MIDC, Pune, MH
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  TAX INVOICE · GSTIN: 27AAACF4821K1Z5 · SAC: 998714
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-base font-bold text-slate-900">{previewInvoice.invoice_number}</div>
                <div className="mt-1">
                  <StatusText value={previewInvoice.payment_status} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <div className="font-semibold uppercase tracking-wide text-slate-400">Bill To</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {previewInvoice.company_name || previewInvoice.customer_name}
                </div>
                {previewInvoice.company_name && (
                  <div className="text-slate-600">Attn: {previewInvoice.customer_name}</div>
                )}
                {previewInvoice.customer_email && <div className="text-slate-600">{previewInvoice.customer_email}</div>}
                {previewInvoice.customer_phone && <div className="font-mono text-slate-600">{previewInvoice.customer_phone}</div>}
                {previewInvoice.customer_address && <div className="text-slate-500">{previewInvoice.customer_address}</div>}
              </div>
              <div className="sm:text-right">
                <div className="font-semibold uppercase tracking-wide text-slate-400">Vehicle & Dates</div>
                <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {previewInvoice.license_plate}
                </div>
                <div className="text-slate-700">{previewInvoice.vehicle_label}</div>
                {previewInvoice.vin && <div className="font-mono text-slate-500">VIN: {previewInvoice.vin}</div>}
                <div className="mt-2 font-mono text-slate-600 tabular-nums">
                  Issued: {formatDate(previewInvoice.issue_date)} · Due: {formatDate(previewInvoice.due_date)}
                </div>
              </div>
            </div>

            {previewInvoice.line_items && previewInvoice.line_items.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewInvoice.line_items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-slate-500">{item.item_type}</td>
                        <td className="px-3 py-2 text-slate-900">{item.description}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium text-slate-900 tabular-nums">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 ml-auto max-w-xs space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Labor Charge</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewInvoice.labor_charge)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Parts & Fluids</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewInvoice.parts_charge)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shop Supplies</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewInvoice.shop_supplies)}</span>
              </div>
              {previewInvoice.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Fleet Discount</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(previewInvoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>CGST ({(previewInvoice.tax_rate / 2).toFixed(1)}%)</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewInvoice.tax_amount / 2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST ({(previewInvoice.tax_rate / 2).toFixed(1)}%)</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewInvoice.tax_amount / 2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total Due (INR)</span>
                <span className="font-mono tabular-nums">{formatCurrency(previewInvoice.total_amount)}</span>
              </div>
            </div>

            {previewInvoice.notes && (
              <div className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-600">
                <span className="font-medium text-slate-800">Notes:</span> {previewInvoice.notes} · Payment method:{' '}
                {previewInvoice.payment_method}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 no-print">
              <div>
                {previewInvoice.payment_status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(previewInvoice.id, 'Paid')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Paid</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
