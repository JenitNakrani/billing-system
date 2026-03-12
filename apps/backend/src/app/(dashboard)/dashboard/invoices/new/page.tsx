"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { AnimatePresence, motion } from "framer-motion";

type LineItem = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  gstRate?: number;
  description?: string;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { data: customers } = useQuery(trpc.customers.list.queryOptions({ limit: 200 }));
  const { data: products } = useQuery(trpc.products.list.queryOptions({ limit: 200 }));
  const [newCustomerModal, setNewCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
  });
  const createMutation = useMutation({
    ...trpc.invoices.create.mutationOptions({
      onSuccess: (inv) => {
        router.push(`/dashboard/invoices/${inv.id}`);
      },
    }),
  });
  const createCustomerMutation = useMutation({
    ...trpc.customers.create.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: trpc.customers.pathKey() });
        setCustomerId(data.id);
        setNewCustomerModal(false);
        setNewCustomerForm({
          name: "",
          phone: "",
          email: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          gstin: "",
        });
      },
    }),
  });

  const [customerId, setCustomerId] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 30);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue.toISOString().slice(0, 10));
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const productMap = useMemo(() => {
    const m = new Map(products?.items?.map((p) => [p.id, p]) ?? []);
    return m;
  }, [products?.items]);

  const addLine = () => {
    const first = products?.items?.[0];
    if (first)
      setItems((prev) => [
        ...prev,
        {
          productId: first.id,
          quantity: 1,
          unitPrice: Number(first.price),
          gstRate: Number(first.gstRate),
        },
      ]);
  };
  const updateLine = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };
  const removeLine = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, line) => {
    const p = productMap.get(line.productId);
    const price = line.unitPrice ?? (p ? Number(p.price) : 0);
    const gstRate = line.gstRate ?? (p ? Number(p.gstRate) : 0);
    const lineTotalBeforeTax = price * line.quantity;
    const tax = (lineTotalBeforeTax * gstRate) / 100;
    return sum + lineTotalBeforeTax + tax;
  }, 0);
  const total = Math.max(0, subtotal - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return;
    createMutation.mutate({
      customerId,
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      items: items.map((line) => {
        const p = productMap.get(line.productId);
        return {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice ?? (p ? Number(p.price) : undefined),
          gstRate: line.gstRate ?? (p ? Number(p.gstRate) : undefined),
          description: line.description,
        };
      }),
      discountAmount,
      notes: notes || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/invoices"
          className="text-sm text-gray-600 hover:underline"
        >
          ← Invoices
        </Link>
        <h2 className="text-lg font-semibold">New invoice</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Customer *
            </label>
            <div className="flex gap-2">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select customer</option>
                {customers?.items?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNewCustomerModal(true)}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + New
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Invoice date *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => {
                setInvoiceDate(e.target.value);
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 30);
                setDueDate(d.toISOString().slice(0, 10));
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={invoiceDate}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Items</span>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add item
            </button>
          </div>
          {items.length === 0 ? (
            <p className="rounded border border-dashed border-gray-300 py-6 text-center text-sm text-gray-500">
              Add at least one item
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((line, index) => {
                const p = productMap.get(line.productId);
                const price = line.unitPrice ?? (p ? Number(p.price) : 0);
                const gstRate = line.gstRate ?? (p ? Number(p.gstRate) : 0);
                const lineTotalBeforeTax = price * line.quantity;
                const tax = (lineTotalBeforeTax * gstRate) / 100;
                const lineTotal = lineTotalBeforeTax + tax;
                return (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="min-w-[180px] flex-1">
                      <label className="mb-1 block text-xs text-gray-500">
                        Product
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const prod = productMap.get(id);
                          updateLine(index, {
                            productId: id,
                            unitPrice: prod ? Number(prod.price) : undefined,
                            gstRate: prod ? Number(prod.gstRate) : undefined,
                          });
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {products?.items?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="mb-1 block text-xs text-gray-500">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs text-gray-500">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={price}
                        onChange={(e) =>
                          updateLine(index, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="w-16">
                      <label className="mb-1 block text-xs text-gray-500">
                        GST%
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={gstRate}
                        onChange={(e) =>
                          updateLine(index, {
                            gstRate: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      ₹{lineTotal.toLocaleString("en-IN")}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-4 border-t border-gray-200 pt-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Discount amount
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              className="w-full max-w-[120px] rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-semibold">
              ₹{total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/dashboard/invoices"
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={
              createMutation.isPending ||
              !customerId ||
              items.length === 0
            }
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create invoice"}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {newCustomerModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNewCustomerModal(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Add customer
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCustomerForm.name.trim()) return;
                  createCustomerMutation.mutate({
                    name: newCustomerForm.name.trim(),
                    phone: newCustomerForm.phone || undefined,
                    email: newCustomerForm.email || undefined,
                    address: newCustomerForm.address || undefined,
                    city: newCustomerForm.city || undefined,
                    state: newCustomerForm.state || undefined,
                    pincode: newCustomerForm.pincode || undefined,
                    gstin: newCustomerForm.gstin || undefined,
                  });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                  <input
                    value={newCustomerForm.address}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                    <input
                      value={newCustomerForm.city}
                      onChange={(e) => setNewCustomerForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                    <input
                      value={newCustomerForm.state}
                      onChange={(e) => setNewCustomerForm((f) => ({ ...f, state: e.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Pincode</label>
                    <input
                      value={newCustomerForm.pincode}
                      onChange={(e) => setNewCustomerForm((f) => ({ ...f, pincode: e.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">GSTIN</label>
                    <input
                      value={newCustomerForm.gstin}
                      onChange={(e) => setNewCustomerForm((f) => ({ ...f, gstin: e.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomerModal(false)}
                    className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCustomerMutation.isPending || !newCustomerForm.name.trim()}
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {createCustomerMutation.isPending ? "Adding…" : "Add customer"}
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
