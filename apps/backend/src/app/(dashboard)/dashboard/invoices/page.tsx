"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

export default function InvoicesListPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.invoices.list.queryOptions({ limit: 50 }));
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const canEdit = user?.subscriptionActive ?? false;

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
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No invoices yet
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
                    <td className="px-4 py-3">
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
