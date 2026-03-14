"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: invoice, isLoading, error } = useQuery({
    ...trpc.invoices.getById.queryOptions({ id }),
    enabled: !!id,
  });
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "cash" as "cash" | "upi" | "bank" | "cheque",
    reference: "",
    notes: "",
  });
  const createPaymentMutation = useMutation({
    ...trpc.payments.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.invoices.pathKey() });
        setPaymentModal(false);
        setPaymentError("");
        setPaymentForm({
          amount: "",
          paymentDate: new Date().toISOString().slice(0, 10),
          method: "cash",
          reference: "",
          notes: "",
        });
      },
    }),
  });
  const duplicateMutation = useMutation({
    ...trpc.invoices.duplicate.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: trpc.invoices.pathKey() });
        router.push(`/dashboard/invoices/${data.id}`);
      },
    }),
  });

  const canEdit = user?.subscriptionActive ?? false;
  const totalAmount = invoice ? Number(invoice.totalAmount) : 0;
  const paidAmount = invoice?.payments?.reduce(
    (s, p) => s + Number(p.amount),
    0,
  ) ?? 0;
  const balance = totalAmount - paidAmount;
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
  const isOverdue =
    dueDate &&
    balance > 0 &&
    dueDate < new Date(new Date().setHours(0, 0, 0, 0));

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const reminder = useMemo(() => {
    const toEmail = invoice?.customer?.email ?? "";
    const subject = `Payment reminder for invoice ${invoice?.invoiceNumber ?? ""}`;
    const bodyLines = [
      `Dear ${invoice?.customer?.name ?? "Customer"},`,
      "",
      `This is a gentle reminder that invoice ${invoice?.invoiceNumber ?? ""} for ₹${totalAmount.toLocaleString("en-IN")} is currently outstanding.`,
      invoice?.dueDate
        ? `Due date: ${format(new Date(invoice.dueDate), "dd MMM yyyy")}.`
        : undefined,
      "",
      "We would appreciate it if you could arrange the payment at your earliest convenience.",
      "",
      "Thank you,",
      user?.companyName ?? "Your company",
    ].filter(Boolean);
    const body = bodyLines.join("\n");
    const mailto = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { toEmail, subject, body, mailto };
  }, [invoice, totalAmount, user?.companyName]);

  if (isLoading || !id) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-50" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="mb-2 h-5 w-32 animate-pulse rounded bg-slate-50" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-50" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-50" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-4 w-full animate-pulse rounded bg-slate-50"
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-50" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-4 w-full animate-pulse rounded bg-slate-50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (error || !invoice) {
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        {error?.message ?? "Invoice not found"}
        <Link href="/dashboard/invoices" className="ml-2 underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(paymentForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setPaymentError("Enter a valid amount greater than 0.");
      return;
    }
    if (amount > balance) {
      setPaymentError("Amount cannot be more than the remaining balance.");
      return;
    }
    setPaymentError("");
    createPaymentMutation.mutate({
      invoiceId: id,
      amount,
      paymentDate: new Date(paymentForm.paymentDate),
      method: paymentForm.method,
      reference: paymentForm.reference || undefined,
      notes: paymentForm.notes || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/invoices"
            className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
          >
            ← Invoices
          </Link>
          <Link
            href={`/dashboard/invoices/${id}/print`}
            // target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Print / PDF
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={() => duplicateMutation.mutate({ id })}
              disabled={duplicateMutation.isPending}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              invoice.status === "paid"
                ? "app-badge-success"
                : invoice.status === "partial"
                  ? "app-badge-warning"
                  : "app-badge-muted"
            }`}
          >
            {invoice.status}
          </motion.span>
          {isOverdue && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200"
            >
              Overdue
            </motion.span>
          )}
          {isOverdue && invoice.customer?.email && (
            <button
              type="button"
              onClick={() => setReminderModalOpen(true)}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Send reminder
            </button>
          )}
        </div>
      </div>

      <motion.div
        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span className="font-medium">
          Total: ₹{totalAmount.toLocaleString("en-IN")}
        </span>
        <span className="mx-1.5 text-slate-500">•</span>
        <span>
          Paid: ₹{paidAmount.toLocaleString("en-IN")}
        </span>
        <span className="mx-1.5 text-slate-500">•</span>
        <span className={balance > 0 ? "font-medium text-warning" : "text-slate-600"}>
          Balance: ₹{balance.toLocaleString("en-IN")}
        </span>
      </motion.div>

      <motion.div
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mb-6 flex justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-slate-600">
              Date: {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
            </p>
            {dueDate && (
              <p className="text-sm text-slate-600">
                Due: {format(dueDate, "dd MMM yyyy")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Customer</p>
            <p className="font-medium text-slate-900">
              {invoice.customer?.name ?? "—"}
            </p>
            {invoice.customer?.address && (
              <p className="text-sm text-slate-600">
                {invoice.customer.address}
              </p>
            )}
            {invoice.customer?.gstin && (
              <p className="text-sm text-slate-500">
                GSTIN: {invoice.customer.gstin}
              </p>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Product
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Qty
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Price
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                GST %
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map(
              (
                line: {
                  product?: { name: string };
                  quantity: string;
                  unitPrice: string;
                  gstRate: string;
                  lineTotal: string;
                },
                idx: number,
              ) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-2 text-slate-900">
                    {line.product?.name ?? "—"}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    {line.quantity ?? "—"}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    ₹{(Number(line.unitPrice) || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    {line.gstRate ?? "—"}%
                  </td>
                  <td className="py-2 text-right font-medium">
                    ₹{(Number(line.lineTotal) || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <div className="w-48 space-y-1 text-right">
            {Number(invoice.discountAmount) > 0 && (
              <p className="text-sm text-slate-600">
                Discount: ₹{Number(invoice.discountAmount).toLocaleString("en-IN")}
              </p>
            )}
            <p className="text-lg font-semibold text-slate-900">
              Total: ₹{totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {invoice.notes && (
          <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
            {invoice.notes}
          </p>
        )}
      </motion.div>

      {/* Payments timeline */}
      <motion.div
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">Payments</h2>
          {canEdit && balance > 0 && (
            <button
              type="button"
              onClick={() => setPaymentModal(true)}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900-hover"
            >
              Record payment
            </button>
          )}
        </div>
        {invoice.payments?.length ? (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {invoice.payments.map(
                  (p: {
                    id: string;
                    paymentDate: Date | string;
                    method: string;
                    amount: string;
                    reference: string | null;
                  }) => (
                    <motion.li
                      key={p.id}
                      className="relative flex items-start gap-3 pl-8"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span className="absolute left-1 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-blue-500" />
                      <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            {format(new Date(p.paymentDate), "dd MMM yyyy")}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            ₹{Number(p.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 capitalize">
                            {p.method}
                          </span>
                          {p.reference && (
                            <span className="truncate text-slate-500">
                              Ref: {p.reference}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ),
                )}
              </AnimatePresence>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No payments recorded.</p>
        )}
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            Paid: ₹{paidAmount.toLocaleString("en-IN")} · Balance: ₹
            {balance.toLocaleString("en-IN")}
          </p>
        </div>
      </motion.div>

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-title"
          >
            <h2
              id="record-payment-title"
              className="mb-1 text-lg font-semibold"
            >
              Record payment
            </h2>
            <p className="mb-4 text-xs text-slate-600">
              This will be added to the payment history and reduce the outstanding balance.
            </p>
            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  required
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    paymentError
                      ? "border-red-300 focus:border-red-300 focus:ring-red-200"
                      : "border-slate-200"
                  }`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Balance: ₹{balance.toLocaleString("en-IN")}
                </p>
                {paymentError && (
                  <p className="mt-1 text-xs text-red-700">{paymentError}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Date *
                </label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      paymentDate: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      method: e.target.value as "cash" | "upi" | "bank" | "cheque",
                    }))
                  }
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Reference
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  Notes
                </label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModal(false);
                    setPaymentError("");
                  }}
                  className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900-hover disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-reminder-title"
          >
            <h2
              id="invoice-reminder-title"
              className="mb-2 text-lg font-semibold text-slate-900"
            >
              Payment reminder email
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Review and copy this message, or open it in your email app to send to the customer.
            </p>
            <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <span className="font-medium text-slate-600">To: </span>
                <span className="text-slate-900">{reminder.toEmail || "—"}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Subject: </span>
                <span className="text-slate-900">{reminder.subject}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Body:</span>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-slate-900">
                  {reminder.body}
                </pre>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <a
                href={reminder.mailto}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900-hover"
              >
                Open in email app
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}