"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

export default function LoginPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    ...trpc.auth.login.mutationOptions({
      onSuccess: (data) => {
        document.cookie = `billing_session=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        router.push("/dashboard");
        router.refresh();
      },
      onError: (err) => {
        setError(err.message ?? "Login failed");
      },
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
            Billing System
          </p>
          <h1 className="text-xl font-semibold">Sign in to your account</h1>
          <p className="mt-1 text-xs text-slate-300">
            Manage invoices, customers, and payments from one place.
          </p>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
