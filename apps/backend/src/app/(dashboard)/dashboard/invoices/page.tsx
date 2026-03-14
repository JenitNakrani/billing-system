"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, MoreVertical, Search, X } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

const STORAGE_KEY_STATUS = "billing-invoices-status-filter";
const STORAGE_KEY_OVERDUE = "billing-invoices-overdue-only";
const STORAGE_KEY_SEARCH = "billing-invoices-search";

type StatusFilter = "all" | "unpaid" | "partial" | "paid";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: Date | string;
  dueDate: Date | string | null;
  status: string;
  totalAmount: string;
  createdAt: Date | string;
  customer: { id: string; name: string };
};

function isOverdue(inv: { dueDate?: Date | string | null; status: string }) {
  if (!inv.dueDate || inv.status === "paid") return false;
  const due = new Date(inv.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function InvoicesListPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "invoiceDate", desc: true }]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedSearch = localStorage.getItem(STORAGE_KEY_SEARCH);
      if (savedSearch != null) setSearch(savedSearch);
      const s = localStorage.getItem(STORAGE_KEY_STATUS) as StatusFilter | null;
      if (s && ["all", "unpaid", "partial", "paid"].includes(s)) setStatusFilter(s);
      const o = localStorage.getItem(STORAGE_KEY_OVERDUE);
      if (o === "true") setOverdueOnly(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SEARCH, search);
      localStorage.setItem(STORAGE_KEY_STATUS, statusFilter);
      localStorage.setItem(STORAGE_KEY_OVERDUE, String(overdueOnly));
    } catch {
      // ignore
    }
  }, [search, statusFilter, overdueOnly]);

  const { data, isLoading } = useQuery(
    trpc.invoices.list.queryOptions({
      limit: 500,
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      overdue: overdueOnly || undefined,
    }),
  );
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const duplicateMutation = useMutation({
    ...trpc.invoices.duplicate.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: trpc.invoices.pathKey() });
        router.push(`/dashboard/invoices/${data.id}`);
      },
    }),
  });
  const canEdit = user?.subscriptionActive ?? false;
  const rows = useMemo(() => data?.items ?? [], [data?.items]);
  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || overdueOnly;
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOverdueOnly(false);
  };

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/invoices/${row.original.id}`}
            className="font-medium text-slate-900 underline-offset-2 hover:text-slate-700 hover:underline"
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
        cell: ({ getValue }) => <span className="text-slate-700">{getValue() as string}</span>,
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium">
            ₹{Number(row.original.totalAmount).toLocaleString("en-IN")}
          </span>
        ),
        meta: { align: "right" },
      },
      {
        accessorKey: "invoiceDate",
        header: "Date",
        accessorFn: (row) => new Date(row.invoiceDate).getTime(),
        cell: ({ row }) => (
          <span className="text-slate-700">
            {format(new Date(row.original.invoiceDate), "dd MMM yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Due",
        accessorFn: (row) => (row.dueDate ? new Date(row.dueDate).getTime() : 0),
        cell: ({ row }) => (
          <span className="text-slate-700">
            {row.original.dueDate
              ? format(new Date(row.original.dueDate), "dd MMM yyyy")
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const inv = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                  inv.status === "paid"
                    ? "app-badge-success"
                    : inv.status === "partial"
                      ? "app-badge-warning"
                      : "app-badge-muted"
                }`}
              >
                {inv.status}
              </span>
              {isOverdue(inv) && (
                <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                  Overdue
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="relative flex items-center justify-end">
            <button
              type="button"
              onClick={() => setOpenMenuId((id) => (id === row.original.id ? null : row.original.id))}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-50-hover hover:text-slate-700"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {openMenuId === row.original.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setOpenMenuId(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    <Link
                      href={`/dashboard/invoices/${row.original.id}`}
                      className="block px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50-hover"
                      onClick={() => setOpenMenuId(null)}
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/invoices/${row.original.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50-hover"
                      onClick={() => setOpenMenuId(null)}
                    >
                      Print
                    </Link>
                    {canEdit && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50-hover disabled:opacity-50"
                        onClick={() => {
                          duplicateMutation.mutate({ id: row.original.id });
                          setOpenMenuId(null);
                        }}
                        disabled={duplicateMutation.isPending}
                      >
                        {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ),
      },
    ],
    [canEdit, duplicateMutation],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-50" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-50" />
          </div>
          <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-50" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-50" />
          </div>
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-8 animate-pulse rounded bg-slate-50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

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
          <Link href="/dashboard/invoices/new" className="app-btn-primary">
            New invoice
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search by invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200  py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-label="Search invoices"
            />
          </div>
          <span className="text-xs font-medium text-slate-500">Status:</span>
          {(["all", "unpaid", "partial", "paid"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-50-hover"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-slate-200"
            />
            <span className="text-xs text-slate-700">Overdue only</span>
          </label>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {rows.length === 0
            ? "No invoices match your search or filters."
            : `Showing ${rows.length} invoice${rows.length !== 1 ? "s" : ""}. Sort by clicking column headers.`}
        </p>
      </div>

      <div className="app-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50/80">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                        (header.column.columnDef.meta as { align?: string })?.align === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort() ? "cursor-pointer select-none" : ""
                        } ${(header.column.columnDef.meta as { align?: string })?.align === "right" ? "justify-end" : ""}`}
                        onClick={header.column.getToggleSortingHandler()}
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
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {!rows.length ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No invoices match your search or filters. Try a different search or clear filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    className="border-b border-slate-200 hover:bg-slate-50-hover"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 ${(cell.column.columnDef.meta as { align?: string })?.align === "right" ? "text-right" : ""}`}
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
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {pageCount} · {rows.length} invoice{rows.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
