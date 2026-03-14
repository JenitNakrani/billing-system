"use client";

import Link from "next/link";
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
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  TrendingUp,
  FileText,
  IndianRupee,
  Clock,
  AlertCircle,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";
import { useMemo, useState } from "react";

type RecentInvoiceRow = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  status: string;
  createdAt: Date | string;
  customer: { name: string };
};

type OverdueInvoiceRow = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate: Date | string | null;
  customer: { name: string };
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const trpc = useTRPC();
  const [recentSorting, setRecentSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [overdueSorting, setOverdueSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);

  const { data, isPending, error } = useQuery(trpc.dashboard.summary.queryOptions());
  const { data: salesByMonth } = useQuery(trpc.reports.salesByMonth.queryOptions());

  const chartData = useMemo(() => {
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

  const recentColumns = useMemo<ColumnDef<RecentInvoiceRow>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/invoices/${row.original.id}`}
            className="text-sm font-medium text-slate-900 hover:underline"
          >
            {row.original.invoiceNumber}
          </Link>
        ),
      },
      {
        accessorKey: "customer",
        id: "customerName",
        header: "Customer",
        accessorFn: (row) => row.customer?.name ?? "—",
        cell: ({ getValue }) => (
          <span className="text-slate-700">{(getValue() as string) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        accessorFn: (row) => Number(row.totalAmount),
        cell: ({ row }) => (
          <span className="font-medium">
            ₹{Number(row.original.totalAmount).toLocaleString("en-IN")}
          </span>
        ),
        meta: { align: "right" },
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-slate-700">
            {format(new Date(row.original.createdAt), "dd MMM yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              row.original.status === "paid"
                ? "app-badge-success"
                : row.original.status === "partial"
                  ? "app-badge-warning"
                  : "app-badge-muted"
            }`}
          >
            {row.original.status}
          </span>
        ),
      },
    ],
    [],
  );

  const overdueColumns = useMemo<ColumnDef<OverdueInvoiceRow>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/invoices/${row.original.id}`}
            className="font-medium text-slate-900 hover:underline"
          >
            {row.original.invoiceNumber}
          </Link>
        ),
      },
      {
        accessorKey: "customer",
        id: "customerName",
        header: "Customer",
        accessorFn: (row) => row.customer?.name ?? "—",
        cell: ({ getValue }) => (
          <span className="text-slate-700">{(getValue() as string) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        accessorFn: (row) => Number(row.totalAmount),
        cell: ({ row }) => (
          <span className="font-medium">
            ₹{Number(row.original.totalAmount).toLocaleString("en-IN")}
          </span>
        ),
        meta: { align: "right" },
      },
      {
        accessorKey: "dueDate",
        header: "Due date",
        accessorFn: (row) => (row.dueDate ? new Date(row.dueDate).getTime() : 0),
        cell: ({ row }) => (
          <span className="text-slate-700">
            {row.original.dueDate
              ? format(new Date(row.original.dueDate), "dd MMM yyyy")
              : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const recentRows = useMemo(
    () => (data?.recentInvoices ?? []) as RecentInvoiceRow[],
    [data?.recentInvoices],
  );
  const overdueRows = useMemo(
    () => (data?.topOverdueInvoices ?? []) as OverdueInvoiceRow[],
    [data?.topOverdueInvoices],
  );

  const recentTable = useReactTable({
    data: recentRows,
    columns: recentColumns,
    state: { sorting: recentSorting },
    onSortingChange: setRecentSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const overdueTable = useReactTable({
    data: overdueRows,
    columns: overdueColumns,
    state: { sorting: overdueSorting },
    onSortingChange: setOverdueSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (isPending) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/50" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/50" />
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/50" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-700">
        {error.message}
      </div>
    );
  }
  if (!data) return null;

  const overdueAmount = data.overdueAmount ?? 0;
  const totalSalesLastYear = chartData.reduce((s, d) => s + d.total, 0);

  const statCards = [
    {
      label: "Sales",
      sublabel: "This month",
      value: `₹${data.totalSales.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "bg-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Invoices",
      sublabel: "This month",
      value: data.invoiceCount,
      icon: FileText,
      color: "bg-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Received",
      sublabel: "This month",
      value: `₹${data.totalReceived.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "bg-violet-500",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Pending",
      value: `₹${data.pendingAmount.toLocaleString("en-IN")}`,
      icon: Clock,
      color: "bg-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Overdue",
      value: `₹${overdueAmount.toLocaleString("en-IN")}`,
      icon: AlertCircle,
      href: "/dashboard/invoices?overdue=1",
      color: "bg-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
      highlight: overdueAmount > 0,
    },
  ];

  const renderTableHeader = <T,>(header: Header<T, unknown>) => (
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
        <span className="text-slate-400">
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome strip — aligned row */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-700">
              Here’s your billing snapshot for the current month:{" "}
              <span className="font-semibold text-slate-900">
                {data.invoiceCount} invoices
              </span>
              ,{" "}
              <span className="font-semibold text-slate-900">
                ₹{data.totalSales.toLocaleString("en-IN")} sales
              </span>
              ,{" "}
              <span className="font-semibold text-slate-900">
                ₹{data.pendingAmount.toLocaleString("en-IN")} pending
              </span>
              .
            </p>
          </div>
          <Link
            href="/dashboard/reports"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <BarChart3 className="h-4 w-4" />
            View reports
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      {/* KPI cards — equal height, aligned grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          const cardContent = (
            <>
              <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.color} text-white shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">
                  {card.label}
                </p>
                {"sublabel" in card && card.sublabel && (
                  <p className="mt-0.5 text-xs text-slate-500">{card.sublabel}</p>
                )}
              </div>
              <p className={`mt-2 min-w-0 break-words text-xl font-bold tabular-nums leading-tight sm:text-2xl ${
                card.highlight ? "text-red-700" : "text-slate-900"
              }`} title={typeof card.value === "string" ? card.value : String(card.value)}>
                {card.value}
              </p>
              {card.href && (
                <p className="mt-2 text-xs text-slate-500">View overdue →</p>
              )}
            </>
          );
          const cardClass = `flex h-full min-h-[152px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${card.bg} ${card.border} ${card.highlight ? "ring-1 ring-red-200" : ""}`;
          return (
            <motion.div key={card.label} variants={item} className="flex min-w-0">
              {card.href ? (
                <Link href={card.href} className={cardClass}>
                  {cardContent}
                </Link>
              ) : (
                <div className={cardClass}>
                  {cardContent}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Sales trend — aligned header + chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Sales trend (last 12 months)
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Total: ₹{totalSalesLastYear.toLocaleString("en-IN")}
              </p>
            </div>
            <Link
              href="/dashboard/reports"
              className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Full report →
            </Link>
          </div>
          <div className="h-72 w-full overflow-visible px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={52}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  formatter={(value: number) => [`₹${Number(value).toLocaleString("en-IN")}`, "Sales"]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  baseValue={0}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {(data.topOverdueInvoices?.length ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="overflow-hidden rounded-2xl border border-red-200 bg-red-50/40 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-red-200/60 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Overdue invoices</h2>
            <Link
              href="/dashboard/invoices?overdue=1"
              className="text-xs font-medium text-red-700 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {overdueTable.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-red-200/50 bg-red-100/30"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-700 ${
                          (header.column.columnDef.meta as { align?: string })?.align === "right"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {renderTableHeader(header)}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {overdueTable.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    className="border-b border-red-100/50 hover:bg-red-100/20"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-2.5 ${
                          (cell.column.columnDef.meta as { align?: string })?.align === "right"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="app-card overflow-hidden"
      >
        <div className="app-card-header">
          <h2 className="text-sm font-semibold text-slate-900">Recent invoices</h2>
          <Link
            href="/dashboard/invoices"
            className="text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {recentTable.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50/80">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                        (header.column.columnDef.meta as { align?: string })?.align === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {renderTableHeader(header)}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {recentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={recentColumns.length}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No invoices yet
                  </td>
                </tr>
              ) : (
                recentTable.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-2.5 ${
                          (cell.column.columnDef.meta as { align?: string })?.align === "right"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {recentRows.length > 0 && recentTable.getPageCount() > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
            <p className="text-xs text-slate-500">
              Page {recentTable.getState().pagination.pageIndex + 1} of{" "}
              {recentTable.getPageCount()}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => recentTable.previousPage()}
                disabled={!recentTable.getCanPreviousPage()}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => recentTable.nextPage()}
                disabled={!recentTable.getCanNextPage()}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
