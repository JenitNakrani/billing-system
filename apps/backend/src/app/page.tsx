"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

export default function HomePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: user, isPending } = useQuery(trpc.auth.me.queryOptions());

  useEffect(() => {
    if (isPending) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, isPending, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
