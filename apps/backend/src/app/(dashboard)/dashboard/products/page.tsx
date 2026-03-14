"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const STORAGE_KEY_SEARCH = "billing-products-search";
const STORAGE_KEY_UNIT = "billing-products-unit-filter";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  price: string;
  gstRate: string;
  hsnCode: string | null;
};

export default function ProductsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    unit: "pcs",
    price: "",
    gstRate: "18",
    hsnCode: "",
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_SEARCH);
      if (s != null) setSearch(s);
      const u = localStorage.getItem(STORAGE_KEY_UNIT);
      if (u != null) setUnitFilter(u);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SEARCH, search);
      localStorage.setItem(STORAGE_KEY_UNIT, unitFilter);
    } catch {
      // ignore
    }
  }, [search, unitFilter]);

  const { data, isLoading } = useQuery(
    trpc.products.list.queryOptions({ search: search.trim() || undefined, limit: 500 }),
  );
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const createMutation = useMutation({
    ...trpc.products.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.products.pathKey() });
        setModalOpen(false);
        resetForm();
      },
    }),
  });
  const updateMutation = useMutation({
    ...trpc.products.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.products.pathKey() });
        setModalOpen(false);
        setEditingId(null);
        resetForm();
        setOpenMenuId(null);
      },
    }),
  });
  const deleteMutation = useMutation({
    ...trpc.products.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.products.pathKey() });
        setOpenMenuId(null);
      },
    }),
  });

  const resetForm = () =>
    setForm({
      name: "",
      sku: "",
      unit: "pcs",
      price: "",
      gstRate: "18",
      hsnCode: "",
    });

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      unit: p.unit ?? "pcs",
      price: p.price,
      gstRate: p.gstRate,
      hsnCode: p.hsnCode ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number.parseFloat(form.price);
    const gstRate = Number.parseFloat(form.gstRate);
    if (Number.isNaN(price) || price < 0 || Number.isNaN(gstRate) || gstRate < 0 || gstRate > 100) {
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: form.name,
        sku: form.sku || undefined,
        unit: form.unit || undefined,
        price,
        gstRate,
        hsnCode: form.hsnCode || undefined,
      });
    } else {
      createMutation.mutate({
        name: form.name,
        sku: form.sku || undefined,
        unit: form.unit || undefined,
        price,
        gstRate,
        hsnCode: form.hsnCode || undefined,
      });
    }
  };

  const canEdit = user?.subscriptionActive ?? false;
  const isAdmin = user?.role === "admin";
  const allRows = useMemo(() => data?.items ?? [], [data?.items]);
  const unitOptions = useMemo(
    () =>
      [...new Set(allRows.map((p) => p.unit ?? "pcs"))].filter(Boolean).sort() as string[],
    [allRows],
  );
  const rows = useMemo(() => {
    if (!unitFilter) return allRows;
    return allRows.filter((p) => (p.unit ?? "pcs") === unitFilter);
  }, [allRows, unitFilter]);
  const hasActiveFilters = search.trim() !== "" || unitFilter !== "";
  const clearFilters = () => {
    setSearch("");
    setUnitFilter("");
  };

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <span className="font-medium text-slate-900">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{(getValue() as string | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{(getValue() as string | null) ?? "pcs"}</span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        accessorFn: (row) => Number(row.price),
        cell: ({ row }) => (
          <span className="font-medium">
            ₹{Number(row.original.price).toLocaleString("en-IN")}
          </span>
        ),
        meta: { align: "right" },
      },
      {
        accessorKey: "gstRate",
        header: "GST %",
        accessorFn: (row) => Number(row.gstRate),
        cell: ({ row }) => (
          <span className="text-slate-600">{row.original.gstRate}%</span>
        ),
        meta: { align: "right" },
      },
      {
        accessorKey: "hsnCode",
        header: "HSN",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{(getValue() as string | null) ?? "—"}</span>
        ),
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "Actions",
              enableSorting: false,
              meta: { align: "right" as const },
              cell: ({ row }: { row: { original: ProductRow } }) => (
                <div className="relative flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((id) => (id === row.original.id ? null : row.original.id))
                    }
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-50-hover-hover hover:text-slate-600"
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
                          className="absolute right-0 top-8 z-20 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                        >
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50-hover-hover"
                            onClick={() => openEdit(row.original)}
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (
                                  confirm("Delete this product? This cannot be undone.")
                                ) {
                                  deleteMutation.mutate({ id: row.original.id });
                                }
                                setOpenMenuId(null);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </button>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ),
            } as ColumnDef<ProductRow>,
          ]
        : []),
    ],
    [canEdit, isAdmin, deleteMutation],
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

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">
            Manage items and pricing used in your invoices.
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={openCreate} className="app-btn-primary">
            Add product
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="app-alert-warning">
          Your subscription is inactive, so products are read-only. Renew to add or edit products.
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-label="Search products"
            />
          </div>
          {unitOptions.length > 0 && (
            <>
              <span className="text-xs font-medium text-slate-500">Unit:</span>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                aria-label="Filter by unit"
              >
                <option value="">All units</option>
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50-hover"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {rows.length === 0
            ? "No products match your search or filters."
            : `Showing ${rows.length} product${rows.length !== 1 ? "s" : ""}. Sort by clicking column headers.`}
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
                    >
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort() ? "cursor-pointer select-none" : ""
                        } ${
                          (header.column.columnDef.meta as { align?: string })?.align === "right"
                            ? "justify-end"
                            : ""
                        }`}
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
              {isLoading ? (
                <>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      {Array.from({ length: columns.length }).map((__, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3">
                          <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-slate-50" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : !rows.length ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {allRows.length === 0
                      ? "No products yet. Click Add product to create your first item."
                      : "No products match your search or filters. Try clearing filters."}
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
                        className={`px-4 py-3 ${
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
        {!isLoading && rows.length > 0 && pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {pageCount} · {rows.length} product{rows.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50-hover-hover disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50-hover-hover disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-modal-title"
            >
              <h2 id="product-modal-title" className="mb-4 text-lg font-semibold">
                {editingId ? "Edit product" : "Add product"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      required
                      className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">GST % *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.gstRate}
                      onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))}
                      required
                      className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">HSN Code</label>
                  <input
                    value={form.hsnCode}
                    onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setEditingId(null);
                    }}
                    className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-50-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="app-btn-primary"
                  >
                    {editingId ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
