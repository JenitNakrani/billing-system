"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

export default function DashboardPage() {
  const trpc = useTRPC();
  const { data, isPending, error } = useQuery(trpc.dashboard.summary.queryOptions());

  if (isPending) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80"
            />
          ))}
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
  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        {error.message}
      </div>
    );
  }
  if (!data) return null;

  const cards = [
    { label: "Total sales (this month)", value: `₹${data.totalSales.toLocaleString("en-IN")}` },
    { label: "Invoices (this month)", value: data.invoiceCount },
    { label: "Received (this month)", value: `₹${data.totalReceived.toLocaleString("en-IN")}` },
    { label: "Pending", value: `₹${data.pendingAmount.toLocaleString("en-IN")}` },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {c.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent invoices
          </h2>
          <Link
            href="/dashboard/invoices"
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoice
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No invoices yet
                  </td>
                </tr>
              ) : (
                data.recentInvoices.map((inv) => (
                  <motion.tr
                    key={inv.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {inv.customer?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {format(new Date(inv.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                            : inv.status === "partial"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                              : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
