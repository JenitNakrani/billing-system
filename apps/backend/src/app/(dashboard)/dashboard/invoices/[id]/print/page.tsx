"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { format } from "date-fns";

function numberToIndianWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function toWords(num: number): string {
    if (num === 0) return "Zero";
    let words = "";

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    const rest = num % 100;

    const twoDigit = (n: number) =>
      n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;

    if (crore) words += `${twoDigit(crore)} Crore `;
    if (lakh) words += `${twoDigit(lakh)} Lakh `;
    if (thousand) words += `${twoDigit(thousand)} Thousand `;
    if (hundred) words += `${ones[hundred]} Hundred `;
    if (rest) words += `${rest < 100 && words ? "and " : ""}${twoDigit(rest)} `;

    return words.trim();
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = "";
  if (rupees > 0) {
    result += `${toWords(rupees)} Rupees`;
  }
  if (paise > 0) {
    result += `${result ? " and " : ""}${toWords(paise)} Paise`;
  }
  return result || "Zero Rupees";
}

export default function InvoicePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const trpc = useTRPC();
  const { data: invoice, isLoading, error } = useQuery({
    ...trpc.invoices.getById.queryOptions({ id }),
    enabled: !!id,
  });
  const { data: company } = useQuery({
    ...trpc.company.get.queryOptions(),
    enabled: !!id,
  });

  useEffect(() => {
    document.body.classList.add("invoice-print");
    return () => document.body.classList.remove("invoice-print");
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-slate-500">Loading invoice…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-red-600">{error.message}</p>
        <Link href={`/dashboard/invoices/${id}`} className="ml-2 text-blue-600 underline">
          Back
        </Link>
      </div>
    );
  }

  const totalAmount = Number(invoice.totalAmount);
  const paidAmount = invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const balance = totalAmount - paidAmount;

  const computedItems =
    invoice.items?.map(
      (line: {
        product?: { name: string };
        quantity: string;
        unitPrice: string;
        gstRate: string;
        lineTotal: string;
      }) => {
        const qty = Number(line.quantity) || 0;
        const rate = Number(line.unitPrice) || 0;
        const gstRate = Number(line.gstRate) || 0;
        const gross = Number(line.lineTotal) || qty * rate;
        const taxable =
          gstRate > 0 ? (gross * 100) / (100 + gstRate) : gross;
        const gstAmount = gross - taxable;
        return {
          name: line.product?.name ?? "—",
          qty,
          rate,
          gstRate,
          taxable,
          gstAmount,
          gross,
        };
      },
    ) ?? [];

  const taxableTotal = computedItems.reduce((s, i) => s + i.taxable, 0);
  const gstTotal = computedItems.reduce((s, i) => s + i.gstAmount, 0);
  const amountInWords = numberToIndianWords(totalAmount);

  return (
    <div className="invoice-print-content">
      <div className="no-print fixed right-4 top-4 z-50 flex gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800"
        >
          Print / Save as PDF
        </button>
        <Link
          href={`/dashboard/invoices/${id}`}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to invoice
        </Link>
      </div>

      <div className="mx-auto max-w-3xl bg-white p-8 pt-16 print:pt-8">
        {/* Letterhead */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {company?.name ?? "Company"}
          </h1>
          {(company?.addressLine1 || company?.city || company?.state) && (
            <p className="mt-1 text-sm text-slate-600">
              {[company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {(company?.gstin || company?.phone || company?.email) && (
            <p className="mt-1 text-xs text-slate-500">
              {[company?.gstin && `GSTIN: ${company.gstin}`, company?.phone, company?.email]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}
        </div>

        <div className="mb-6 flex justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">TAX INVOICE</h2>
            <p className="mt-1 text-sm text-slate-600">
              Invoice no. <span className="font-medium">{invoice.invoiceNumber}</span>
            </p>
            <p className="text-sm text-slate-600">
              Date: {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
            </p>
            {invoice.dueDate && (
              <p className="text-sm text-slate-600">
                Due: {format(new Date(invoice.dueDate), "dd MMM yyyy")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-slate-500">Bill to</p>
            <p className="font-medium text-slate-900">{invoice.customer?.name ?? "—"}</p>
            {invoice.customer?.address && (
              <p className="mt-1 text-sm text-slate-600">{invoice.customer.address}</p>
            )}
            {invoice.customer?.city && (
              <p className="text-sm text-slate-600">
                {[invoice.customer.city, invoice.customer.state, invoice.customer.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {invoice.customer?.gstin && (
              <p className="mt-1 text-xs text-slate-500">GSTIN: {invoice.customer.gstin}</p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="py-2 text-left font-semibold text-slate-700">#</th>
              <th className="py-2 text-left font-semibold text-slate-700">Description</th>
              <th className="py-2 text-right font-semibold text-slate-700">Qty</th>
              <th className="py-2 text-right font-semibold text-slate-700">Rate</th>
              <th className="py-2 text-right font-semibold text-slate-700">GST %</th>
              <th className="py-2 text-right font-semibold text-slate-700">Taxable</th>
              <th className="py-2 text-right font-semibold text-slate-700">GST Amt</th>
              <th className="py-2 text-right font-semibold text-slate-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map((line, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2 text-slate-600">{idx + 1}</td>
                <td className="py-2 text-slate-900">{line.name}</td>
                <td className="py-2 text-right text-slate-600">
                  {line.qty.toLocaleString("en-IN")}
                </td>
                <td className="py-2 text-right text-slate-600">
                  ₹{line.rate.toLocaleString("en-IN")}
                </td>
                <td className="py-2 text-right text-slate-600">{line.gstRate}%</td>
                <td className="py-2 text-right text-slate-600">
                  ₹{line.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td className="py-2 text-right text-slate-600">
                  ₹{line.gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td className="py-2 text-right font-medium">
                  ₹{line.gross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="py-2 text-right text-xs font-semibold text-slate-600" colSpan={5}>
                Total
              </td>
              <td className="py-2 text-right text-sm font-semibold text-slate-900">
                ₹{taxableTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
              <td className="py-2 text-right text-sm font-semibold text-slate-900">
                ₹{gstTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
              <td className="py-2 text-right text-sm font-semibold text-slate-900">
                ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
          <div className="max-w-sm text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Amount in words
            </p>
            <p className="mt-1">
              {amountInWords} only
            </p>
          </div>
          <div className="w-56 space-y-1 text-right text-sm">
            {Number(invoice.discountAmount) > 0 && (
              <p className="text-slate-600">
                Discount: ₹{Number(invoice.discountAmount).toLocaleString("en-IN")}
              </p>
            )}
            <p className="text-base font-semibold text-slate-900">
              Total: ₹{totalAmount.toLocaleString("en-IN")}
            </p>
            {paidAmount > 0 && (
              <p className="text-slate-600">
                Paid: ₹{paidAmount.toLocaleString("en-IN")}
              </p>
            )}
            {balance > 0 && (
              <p className="font-medium text-slate-700">
                Balance: ₹{balance.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <div>
            {invoice.notes && (
              <>
                <p className="text-xs font-medium uppercase text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                  {invoice.notes}
                </p>
              </>
            )}
          </div>
          <div className="text-right text-sm text-slate-700">
            <p className="mb-10">For {company?.name ?? "Company"}</p>
            <p className="mt-10 inline-block border-t border-slate-400 px-8 pt-1 text-xs uppercase tracking-wide">
              Authorised Signatory
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
