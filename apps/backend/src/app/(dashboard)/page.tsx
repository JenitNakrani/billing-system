"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

export default function DashboardPage() {
  const trpc = useTRPC();
  const { data, isPending, error } = useQuery(trpc.dashboard.summary.queryOptions());

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
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
          <div
            key={c.label}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-medium text-gray-800">Recent invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Invoice
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Customer
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Amount
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                data.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {inv.customer?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {format(new Date(inv.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-2">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 px-4 py-2">
          <Link
            href="/dashboard/invoices"
            className="text-sm text-blue-600 hover:underline"
          >
            View all invoices →
          </Link>
        </div>
      </div>
    </div>
  );
}
