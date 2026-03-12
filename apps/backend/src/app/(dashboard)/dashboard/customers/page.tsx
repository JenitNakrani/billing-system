"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTRPC } from "~/trpc/react";

export default function CustomersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const { data, isLoading } = useQuery(
    trpc.customers.list.queryOptions({ search: search || undefined, limit: 50 }),
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
      },
    }),
  });
  const deleteMutation = useMutation({
    ...trpc.customers.delete.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({ queryKey: trpc.customers.pathKey() }),
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
  const openEdit = (c: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    gstin: string | null;
  }) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">
            Manage your customer list for billing and GST.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search customers..."
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
              Add customer
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
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  GSTIN
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
                      {Array.from({ length: 5 }).map((__, cellIdx) => (
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
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No customers yet
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {data.items.map((c) => (
                    <motion.tr
                      key={c.id}
                      className="border-b border-gray-100 hover:bg-slate-50"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.city ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.gstin ?? "—"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this customer?"))
                                deleteMutation.mutate({ id: c.id });
                            }}
                            className="ml-3 text-red-600 hover:underline"
                          >
                            Delete
                          </button>
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
              {editingId ? "Edit customer" : "Add customer"}
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
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Pincode
                  </label>
                  <input
                    value={form.pincode}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    GSTIN
                  </label>
                  <input
                    value={form.gstin}
                    onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
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
