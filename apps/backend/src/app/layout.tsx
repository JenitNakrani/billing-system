import type { ReactNode } from "react";
import { TRPCReactProvider } from "~/trpc/react";
import "~/app/globals.css";

export const metadata = {
  title: "Billing System",
  description: "MVP billing backend UI (Next.js app router)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

