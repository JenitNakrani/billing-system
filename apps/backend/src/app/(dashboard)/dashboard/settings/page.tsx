"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

export default function SettingsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useQuery(trpc.company.get.queryOptions());
  const { data: user, isPending: userPending } = useQuery(trpc.auth.me.queryOptions());

  useEffect(() => {
    if (userPending || !user) return;
    if (user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, userPending, router]);
  const [form, setForm] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    pan: "",
    phone: "",
    email: "",
    invoicePrefix: "",
    invoiceNextNumber: 1,
  });
  const updateMutation = useMutation({
    ...trpc.company.update.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({ queryKey: trpc.company.pathKey() }),
    }),
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        addressLine1: company.addressLine1 ?? "",
        addressLine2: company.addressLine2 ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        pincode: company.pincode ?? "",
        gstin: company.gstin ?? "",
        pan: company.pan ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        invoicePrefix: company.invoicePrefix ?? "INV-",
        invoiceNextNumber: company.invoiceNextNumber ?? 1,
      });
    }
  }, [company]);

  const isAdmin = user?.role === "admin";
  const canEdit = isAdmin && (user?.subscriptionActive ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    updateMutation.mutate(form);
  };

  if (!userPending && user && user.role !== "admin") return null;
  if (isLoading || !company) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mb-6 h-4 w-64 animate-pulse rounded bg-slate-100" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="space-y-1">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-9 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Company details
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          These details are used on your invoices and GST documents.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Company name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Address line 1
            </label>
            <input
              value={form.addressLine1}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLine1: e.target.value }))
              }
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Address line 2
            </label>
            <input
              value={form.addressLine2}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLine2: e.target.value }))
              }
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                disabled={!canEdit}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                disabled={!canEdit}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Pincode
            </label>
            <input
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({ ...f, pincode: e.target.value }))
              }
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              GSTIN
            </label>
            <input
              value={form.gstin}
              onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              PAN
            </label>
            <input
              value={form.pan}
              onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
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
              disabled={!canEdit}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Invoice numbering
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Next invoice will use:{" "}
              <span className="font-medium">
                {form.invoicePrefix}
                {String(form.invoiceNextNumber).padStart(5, "0")}
              </span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Invoice prefix
                </label>
                <input
                  value={form.invoicePrefix}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoicePrefix: e.target.value }))
                  }
                  placeholder="INV-"
                  maxLength={20}
                  disabled={!canEdit}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shown before the invoice number, e.g.{" "}
                  <span className="font-mono">INV-00001</span>.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Next number
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.invoiceNextNumber}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      invoiceNextNumber: Math.max(
                        1,
                        Number.parseInt(e.target.value || "1", 10),
                      ),
                    }))
                  }
                  disabled={!canEdit}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  The next created invoice will use this running number.
                </p>
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
          {!canEdit && (
            <p className="text-sm text-amber-700">
              Renew your subscription to edit company settings.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
