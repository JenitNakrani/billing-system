"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "~/trpc/react";

export default function ProductsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    unit: "pcs",
    price: "",
    gstRate: "18",
    hsnCode: "",
  });

  const { data, isLoading } = useQuery(
    trpc.products.list.queryOptions({ search: search || undefined, limit: 50 }),
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
      },
    }),
  });
  const deleteMutation = useMutation({
    ...trpc.products.delete.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({ queryKey: trpc.products.pathKey() }),
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
  const openEdit = (p: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    price: string;
    gstRate: string;
    hsnCode: string | null;
  }) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">
            Manage items and pricing used in your invoices.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Add product
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  GST %
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  HSN
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      {Array.from({ length: 6 }).map((__, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3">
                          <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex h-4 w-16 animate-pulse rounded bg-slate-100" />
                        </td>
                      )}
                    </tr>
                  ))}
                </>
              ) : !data?.items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No products yet
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {data.items.map((p) => (
                    <motion.tr
                      key={p.id}
                      className="border-b border-gray-100 hover:bg-slate-50"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.unit ?? "pcs"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₹{Number(p.price).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {p.gstRate}%
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.hsnCode ?? "—"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Delete this product? This cannot be undone."))
                                  deleteMutation.mutate({ id: p.id });
                              }}
                              className="ml-3 text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
            >
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "Edit product" : "Add product"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  SKU
                </label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    GST % *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.gstRate}
                    onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))}
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  HSN Code
                </label>
                <input
                  value={form.hsnCode}
                  onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingId(null);
                  }}
                  className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
