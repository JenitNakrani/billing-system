"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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

const STORAGE_KEY_SEARCH = "billing-customers-search";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
};

export default function CustomersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_SEARCH);
      if (s != null) setSearch(s);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SEARCH, search);
    } catch {
      // ignore
    }
  }, [search]);

  const { data, isLoading } = useQuery(
    trpc.customers.list.queryOptions({ search: search.trim() || undefined, limit: 500 }),
  );
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const createMutation = useMutation({
    ...trpc.customers.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.customers.pathKey() });
        setModalOpen(false);
        resetForm();
      },
    }),
  });
  const updateMutation = useMutation({
    ...trpc.customers.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.customers.pathKey() });
        setModalOpen(false);
        setEditingId(null);
        resetForm();
        setOpenMenuId(null);
      },
    }),
  });
  const deleteMutation = useMutation({
    ...trpc.customers.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.customers.pathKey() });
        setOpenMenuId(null);
      },
    }),
  });

  const resetForm = () =>
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gstin: "",
    });

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (c: CustomerRow) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      pincode: c.pincode ?? "",
      gstin: c.gstin ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...form,
        email: form.email || undefined,
      });
    } else {
      createMutation.mutate({
        ...form,
        email: form.email || undefined,
      });
    }
  };

  const canEdit = user?.subscriptionActive ?? false;
  const isAdmin = user?.role === "admin";
  const rows = useMemo(() => data?.items ?? [], [data?.items]);
  const hasActiveFilters = search.trim() !== "";
  const clearFilters = () => setSearch("");

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <span className="font-medium text-slate-900">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{(getValue() as string | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{(getValue() as string | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{(getValue() as string | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "gstin",
        header: "GSTIN",
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
              cell: ({ row }: { row: { original: CustomerRow } }) => (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      if (openMenuId === row.original.id) {
                        setOpenMenuId(null);
                        setMenuPosition(null);
                      } else {
                        setOpenMenuId(row.original.id);
                        setMenuPosition({
                          top: rect.bottom + 4,
                          right: window.innerWidth - rect.right,
                        });
                      }
                    }}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-600"
                    aria-label="Actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === row.original.id &&
                    menuPosition &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <AnimatePresence>
                        <div
                          key="actions-overlay"
                          className="fixed inset-0 z-10"
                          aria-hidden
                          onClick={() => {
                            setOpenMenuId(null);
                            setMenuPosition(null);
                          }}
                        />
                        <motion.div
                          key="actions-menu"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="fixed z-20 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                          style={{
                            top: menuPosition.top,
                            right: menuPosition.right,
                            left: "auto",
                          }}
                        >
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => {
                              openEdit(row.original);
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            }}
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (
                                  confirm("Delete this customer? This cannot be undone.")
                                ) {
                                  deleteMutation.mutate({ id: row.original.id });
                                }
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </button>
                          )}
                        </motion.div>
                      </AnimatePresence>,
                      document.body,
                    )}
                </div>
              ),
            } as ColumnDef<CustomerRow>,
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
          <h2 className="text-lg font-semibold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">
            Manage your customer list for billing and GST.
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={openCreate} className="app-btn-primary">
            Add customer
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="app-alert-warning">
          Your subscription is inactive, so customers are read-only. Renew to add or edit customers.
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              aria-label="Search customers"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {rows.length === 0
            ? "No customers match your search."
            : `Showing ${rows.length} customer${rows.length !== 1 ? "s" : ""}. Sort by clicking column headers.`}
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
                    No customers yet. Click{" "}
                    <span className="font-medium">Add customer</span> to create your first one.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
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
              Page {currentPage} of {pageCount} · {rows.length} customer{rows.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
              aria-labelledby="customer-modal-title"
            >
              <h2 id="customer-modal-title" className="mb-4 text-lg font-semibold text-slate-900">
                {editingId ? "Edit customer" : "Add customer"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">City</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">State</label>
                    <input
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Pincode</label>
                    <input
                      value={form.pincode}
                      onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">GSTIN</label>
                    <input
                      value={form.gstin}
                      onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setEditingId(null);
                    }}
                    className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
