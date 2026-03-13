"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

  if (isLoading || !id) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="mb-2 h-5 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-4 w-full animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-4 w-full animate-pulse rounded bg-slate-100"
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
    if (Number.isNaN(amount) || amount <= 0) return;
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
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Print / PDF
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={() => duplicateMutation.mutate({ id })}
              disabled={duplicateMutation.isPending}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              invoice.status === "paid"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : invoice.status === "partial"
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {invoice.status}
          </span>
          {isOverdue && (
            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
              Overdue
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                <tr key={idx} className="border-b border-slate-100">
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
          <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {invoice.notes}
          </p>
        )}
      </div>

      {/* Payments */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-gray-800">Payments</h2>
          {canEdit && balance > 0 && (
            <button
              type="button"
              onClick={() => setPaymentModal(true)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Record payment
            </button>
          )}
        </div>
        {invoice.payments?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-2 font-medium text-gray-600">Date</th>
                <th className="pb-2 font-medium text-gray-600">Method</th>
                <th className="pb-2 text-right font-medium text-gray-600">
                  Amount
                </th>
                <th className="pb-2 font-medium text-gray-600">Reference</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p: { id: string; paymentDate: Date | string; method: string; amount: string; reference: string | null }) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">
                    {format(new Date(p.paymentDate), "dd MMM yyyy")}
                  </td>
                  <td className="py-2 capitalize text-gray-600">{p.method}</td>
                  <td className="py-2 text-right font-medium">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 text-gray-600">{p.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No payments recorded.</p>
        )}
        <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600">
            Paid: ₹{paidAmount.toLocaleString("en-IN")} · Balance: ₹
            {balance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Record payment</h2>
            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Balance: ₹{balance.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reference
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}