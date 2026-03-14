"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Header,
  type Table,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, BarChart3, Users, Package, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useTRPC } from "~/trpc/react";

type TopCustomerRow = {
  customerId: string;
  customerName: string | null;
  total: number;
  count: number;
};

type TopProductRow = {
  productId: string;
  productName: string | null;
  totalQuantity: number;
  totalRevenue: number;
};

type AgingRow = {
  customerId: string;
  customerName: string | null;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90_plus: number;
  total: number;
};

const AGING_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];
const PIE_COLORS = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

function renderTableHeader<T>(header: Header<T, unknown>) {
  return (
    <div
      className={`flex items-center gap-1 ${
        header.column.getCanSort() ? "cursor-pointer select-none" : ""
      } ${
        (header.column.columnDef.meta as { align?: string })?.align === "right"
          ? "justify-end"
          : ""
      }`}
      onClick={header.column.getToggleSortingHandler() as React.MouseEventHandler}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getCanSort() && (
        <span className="text-slate-500">
          {header.column.getIsSorted() === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : header.column.getIsSorted() === "desc" ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <span className="inline-block h-3.5 w-3.5" />
          )}
        </span>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const trpc = useTRPC();
  const [topCustomersSorting, setTopCustomersSorting] = useState<SortingState>([
    { id: "total", desc: true },
  ]);
  const [topProductsSorting, setTopProductsSorting] = useState<SortingState>([
    { id: "totalRevenue", desc: true },
  ]);
  const [agingSorting, setAgingSorting] = useState<SortingState>([
    { id: "total", desc: true },
  ]);

  const { data: salesByMonth, isLoading: salesLoading } = useQuery(
    trpc.reports.salesByMonth.queryOptions(),
  );
  const { data: topCustomers, isLoading: customersLoading } = useQuery(
    trpc.reports.topCustomers.queryOptions({ limit: 50 }),
  );
  const { data: topProducts, isLoading: productsLoading } = useQuery(
    trpc.reports.topProducts.queryOptions({ limit: 50 }),
  );
  const { data: agingByCustomer, isLoading: agingLoading } = useQuery(
    trpc.reports.agingByCustomer.queryOptions(),
  );

  const totalSalesLastYear =
    salesByMonth?.reduce((sum, m) => sum + m.total, 0) ?? 0;

  const salesChartData = useMemo(() => {
    if (!salesByMonth?.length) return [];
    return salesByMonth.map((m) => {
      const [y, mo] = m.month.split("-");
      const label = new Date(
        parseInt(y, 10),
        parseInt(mo, 10) - 1,
        1,
      ).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      return { month: label, total: m.total, sales: m.total };
    });
  }, [salesByMonth]);

  const topCustomersPieData = useMemo(() => {
    const list = (topCustomers ?? []).slice(0, 6);
    return list.map((c) => ({
      name: (c.customerName ?? "Unknown").length > 14 ? (c.customerName ?? "").slice(0, 14) + "…" : (c.customerName ?? "Unknown"),
      value: c.total,
    }));
  }, [topCustomers]);

  const topProductsPieData = useMemo(() => {
    const list = (topProducts ?? []).slice(0, 6);
    return list.map((p) => ({
      name: (p.productName ?? "Unknown").length > 14 ? (p.productName ?? "").slice(0, 14) + "…" : (p.productName ?? "Unknown"),
      value: p.totalRevenue,
    }));
  }, [topProducts]);

  const agingChartData = useMemo(() => {
    return (agingByCustomer ?? []).slice(0, 8).map((r) => ({
      name: (r.customerName ?? "—").slice(0, 10) + ((r.customerName?.length ?? 0) > 10 ? "…" : ""),
      "0–30 days": r.bucket0_30,
      "31–60 days": r.bucket31_60,
      "61–90 days": r.bucket61_90,
      "90+ days": r.bucket90_plus,
      total: r.total,
    }));
  }, [agingByCustomer]);

  const topCustomersRows = useMemo(
    () => (topCustomers ?? []) as TopCustomerRow[],
    [topCustomers],
  );
  const topProductsRows = useMemo(
    () => (topProducts ?? []) as TopProductRow[],
    [topProducts],
  );
  const agingRows = useMemo(
    () => (agingByCustomer ?? []) as AgingRow[],
    [agingByCustomer],
  );

  const topCustomersColumns = useMemo<ColumnDef<TopCustomerRow>[]>(
    () => [
      { id: "rank", header: "#", accessorFn: (_, i) => i + 1, cell: ({ row }) => <span className="text-slate-600">{row.index + 1}</span>, enableSorting: false },
      { accessorKey: "customerName", header: "Customer", cell: ({ getValue }) => <span className="font-medium text-slate-900">{(getValue() as string | null) ?? "—"}</span> },
      { accessorKey: "count", header: "Invoices", cell: ({ getValue }) => <span className="text-slate-600">{getValue() as number}</span>, meta: { align: "right" as const } },
      { accessorKey: "total", header: "Total", cell: ({ row }) => <span className="font-medium">₹{row.original.total.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
    ],
    [],
  );
  const topProductsColumns = useMemo<ColumnDef<TopProductRow>[]>(
    () => [
      { id: "rank", header: "#", accessorFn: (_, i) => i + 1, cell: ({ row }) => <span className="text-slate-600">{row.index + 1}</span>, enableSorting: false },
      { accessorKey: "productName", header: "Product", cell: ({ getValue }) => <span className="font-medium text-slate-900">{(getValue() as string | null) ?? "—"}</span> },
      { accessorKey: "totalQuantity", header: "Qty sold", cell: ({ getValue }) => <span className="text-slate-600">{(getValue() as number).toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
      { accessorKey: "totalRevenue", header: "Revenue", cell: ({ row }) => <span className="font-medium">₹{row.original.totalRevenue.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
    ],
    [],
  );
  const agingColumns = useMemo<ColumnDef<AgingRow>[]>(
    () => [
      { accessorKey: "customerName", header: "Customer", cell: ({ getValue }) => <span className="font-medium text-slate-900">{(getValue() as string | null) ?? "—"}</span> },
      { accessorKey: "bucket0_30", header: "0–30", cell: ({ row }) => <span className="text-slate-600">₹{row.original.bucket0_30.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
      { accessorKey: "bucket31_60", header: "31–60", cell: ({ row }) => <span className="text-slate-600">₹{row.original.bucket31_60.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
      { accessorKey: "bucket61_90", header: "61–90", cell: ({ row }) => <span className="text-slate-600">₹{row.original.bucket61_90.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
      { accessorKey: "bucket90_plus", header: "90+", cell: ({ row }) => <span className="text-slate-600">₹{row.original.bucket90_plus.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
      { accessorKey: "total", header: "Total", cell: ({ row }) => <span className="font-medium text-slate-900">₹{row.original.total.toLocaleString("en-IN")}</span>, meta: { align: "right" as const } },
    ],
    [],
  );

  const topCustomersTable = useReactTable({
    data: topCustomersRows,
    columns: topCustomersColumns,
    state: { sorting: topCustomersSorting },
    onSortingChange: setTopCustomersSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  const topProductsTable = useReactTable({
    data: topProductsRows,
    columns: topProductsColumns,
    state: { sorting: topProductsSorting },
    onSortingChange: setTopProductsSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  const agingTable = useReactTable({
    data: agingRows,
    columns: agingColumns,
    state: { sorting: agingSorting },
    onSortingChange: setAgingSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (salesLoading || customersLoading || productsLoading || agingLoading) {
    return (
      <div className="space-y-8">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-50" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-50" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-50" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-50" />
        </div>
      </div>
    );
  }

  const PaginationBar = <T,>({ table, totalRows, label }: { table: Table<T>; totalRows: number; label: string }) => {
    const pageCount = table.getPageCount();
    if (pageCount <= 1) return null;
    const currentPage = table.getState().pagination.pageIndex + 1;
    return (
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
        <p className="text-xs text-slate-500">Page {currentPage} of {pageCount} · {totalRows} {label}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Previous</button>
          <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Next</button>
        </div>
      </div>
    );
  };

  const renderTable = <T,>(table: ReturnType<typeof useReactTable<T>>, columns: ColumnDef<T>[], emptyMessage: string) => (
    <>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50/80">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${(header.column.columnDef.meta as { align?: string })?.align === "right" ? "text-right" : "text-left"}`}>
                  {renderTableHeader(header)}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</td></tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <motion.tr key={row.id} className="border-b border-slate-200 hover:bg-slate-100" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`px-4 py-2 ${(cell.column.columnDef.meta as { align?: string })?.align === "right" ? "text-right" : ""}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <BarChart3 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reports &amp; analytics</h1>
            <p className="mt-1 text-slate-300">Sales overview, top customers, top products, and receivables aging.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-baseline gap-6">
          <div>
            <p className="text-sm font-medium text-slate-500">Total sales (last 12 months)</p>
            <p className="text-3xl font-bold tabular-nums">₹{totalSalesLastYear.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </motion.div>

      {/* Sales by month — Area chart (trend over time) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sales trend</h2>
          <p className="text-sm text-slate-500">Last 12 months · total ₹{totalSalesLastYear.toLocaleString("en-IN")}</p>
        </div>
        {!salesChartData.length ? (
          <p className="py-16 text-center text-sm text-slate-500">No invoice data yet</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportsSalesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Sales"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Area type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2} fill="url(#reportsSalesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Top customers — Pie (revenue share) + Table (full list) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-5 py-4">
            <Users className="h-5 w-5 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900">Revenue by customer</h3>
          </div>
          {topCustomersPieData.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">No customer data yet. Create invoices to see your top customers.</p>
          ) : (
            <>
              <div className="flex justify-center px-4 py-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={topCustomersPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "#94a3b8" }}
                    >
                      {topCustomersPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="px-4 pb-2 text-center text-xs text-slate-500">Share of total revenue (top 6)</p>
              <div className="border-t border-slate-200">
                {renderTable(topCustomersTable, topCustomersColumns, "No customer data yet.")}
                <PaginationBar table={topCustomersTable} totalRows={topCustomersRows.length} label="customers" />
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-5 py-4">
            <Package className="h-5 w-5 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900">Revenue by product</h3>
          </div>
          {topProductsPieData.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">No product data yet. Create invoices to see your top products.</p>
          ) : (
            <>
              <div className="flex justify-center px-4 py-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={topProductsPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "#94a3b8" }}
                    >
                      {topProductsPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="px-4 pb-2 text-center text-xs text-slate-500">Share of total revenue (top 6)</p>
              <div className="border-t border-slate-200">
                {renderTable(topProductsTable, topProductsColumns, "No product data yet.")}
                <PaginationBar table={topProductsTable} totalRows={topProductsRows.length} label="products" />
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Aging — horizontal stacked bar (composition) + table (actionable detail) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-5 py-4">
          <Clock className="h-5 w-5 text-slate-600" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">Receivables aging</h3>
            <p className="text-xs text-slate-500">Outstanding by customer · table below for exact amounts</p>
          </div>
        </div>
        {agingRows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">No open invoices at the moment.</p>
        ) : (
          <>
            {agingChartData.length > 0 && (
              <div className="h-80 border-b border-slate-200 px-4 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingChartData} layout="vertical" margin={{ top: 8, right: 24, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, ""]} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Legend />
                    <Bar dataKey="0–30 days" stackId="a" fill={AGING_COLORS[0]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="31–60 days" stackId="a" fill={AGING_COLORS[1]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="61–90 days" stackId="a" fill={AGING_COLORS[2]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="90+ days" stackId="a" fill={AGING_COLORS[3]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              {renderTable(agingTable, agingColumns, "No open invoices at the moment.")}
            </div>
            {agingTable.getPageCount() > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
                <p className="text-xs text-slate-500">Page {agingTable.getState().pagination.pageIndex + 1} of {agingTable.getPageCount()} · {agingRows.length} customers</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => agingTable.previousPage()} disabled={!agingTable.getCanPreviousPage()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Previous</button>
                  <button type="button" onClick={() => agingTable.nextPage()} disabled={!agingTable.getCanNextPage()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
