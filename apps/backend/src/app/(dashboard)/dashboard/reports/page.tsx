"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const trpc = useTRPC();
  const { data: salesByMonth, isLoading: salesLoading } = useQuery(
    trpc.reports.salesByMonth.queryOptions(),
  );
  const { data: topCustomers, isLoading: customersLoading } = useQuery(
    trpc.reports.topCustomers.queryOptions({ limit: 10 }),
  );
  const { data: topProducts, isLoading: productsLoading } = useQuery(
    trpc.reports.topProducts.queryOptions({ limit: 10 }),
  );

  const maxSales = salesByMonth?.length
    ? Math.max(...salesByMonth.map((m) => m.total), 1)
    : 1;

  if (salesLoading || customersLoading || productsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500">
          Sales overview, top customers, and top products by revenue.
        </p>
      </div>

      <motion.div
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h3 className="mb-4 text-sm font-semibold text-slate-800">
          Sales by month (last 12 months)
        </h3>
        {!salesByMonth?.length ? (
          <p className="py-8 text-center text-sm text-slate-500">No invoice data yet</p>
        ) : (
          <div className="space-y-3">
            {salesByMonth.map((m, i) => {
              const [y, mo] = m.month.split("-");
              const label = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, 1).toLocaleDateString(
                "en-IN",
                { month: "short", year: "2-digit" },
              );
              const pct = maxSales > 0 ? (m.total / maxSales) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="w-14 text-xs font-medium text-slate-600">{label}</span>
                  <div className="flex-1">
                    <div
                      className="h-7 rounded bg-slate-200"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                      title={`₹${m.total.toLocaleString("en-IN")}`}
                    />
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-slate-900">
                    ₹{m.total.toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Top customers by revenue</h3>
          </div>
          <div className="overflow-x-auto">
            {!topCustomers?.length ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                      Customer
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">
                      Invoices
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, idx) => (
                    <tr key={c.customerId} className="border-b border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {idx + 1}. {c.customerName ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">{c.count}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        ₹{c.total.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Top products by revenue</h3>
          </div>
          <div className="overflow-x-auto">
            {!topProducts?.length ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                      Product
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">
                      Qty sold
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={p.productId} className="border-b border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {idx + 1}. {p.productName ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {p.totalQuantity.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ₹{p.totalRevenue.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
