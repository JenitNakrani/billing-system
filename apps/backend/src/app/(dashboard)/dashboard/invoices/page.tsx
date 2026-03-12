"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

type StatusFilter = "all" | "unpaid" | "partial" | "paid";

export default function InvoicesListPage() {
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    if (searchParams.get("overdue") === "1") setOverdueOnly(true);
  }, [searchParams]);
  const { data, isLoading } = useQuery(
    trpc.invoices.list.queryOptions({
      limit: 50,
      status: statusFilter === "all" ? undefined : statusFilter,
      overdue: overdueOnly || undefined,
    }),
  );
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const canEdit = user?.subscriptionActive ?? false;

  const isOverdue = (inv: { dueDate?: Date | string | null; status: string }) => {
    if (!inv.dueDate || inv.status === "paid") return false;
    const due = new Date(inv.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-8 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
          <p className="text-sm text-slate-500">
            View and manage all invoices for your company.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/dashboard/invoices/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            New invoice
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Status:</span>
        {(["all", "unpaid", "partial", "paid"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          <span className="text-xs text-slate-600">Overdue only</span>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!data?.items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                data.items.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {inv.customer?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(inv.invoiceDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inv.dueDate
                        ? format(new Date(inv.dueDate), "dd MMM yyyy")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            inv.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : inv.status === "partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {inv.status}
                        </span>
                        {isOverdue(inv) && (
                          <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
