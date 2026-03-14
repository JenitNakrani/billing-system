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
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-900-hover"
        >
          Print / Save as PDF
        </button>
        <Link
          href={`/dashboard/invoices/${id}`}
          className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Back to invoice
        </Link>
      </div>

      <div className="mx-auto max-w-3xl bg-white p-8 pt-16 text-[13px] leading-relaxed print:pt-8 border border-slate-400">
        {/* Letterhead */}
        <div className="mb-2 flex items-center justify-between">
          <div>
            {company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logoUrl}
                alt={company.name ?? "Logo"}
                className="h-20 w-auto object-contain"
              />
            ) : (
              <h1 className="text-3xl font-bold">{company?.name ?? "Company"}</h1>
            )}
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-sm">{company?.name ?? "Company"}</p>
            {(company?.addressLine1 || company?.city || company?.state) && (
              <p>
                {[company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {(company?.phone || company?.email) && (
              <p>
                {company?.phone && <>Phone: {company.phone}</>}
                {company?.phone && company?.email && "  "}
                {company?.email && <>Email: {company.email}</>}
              </p>
            )}
          </div>
        </div>

        <hr className="my-2 border-t border-slate-400" />

        {/* Title */}
        <p className="mb-2 text-center text-sm font-semibold underline">
          {company?.invoiceTitle || "Invoice"}
        </p>

        {/* Bill to + Invoice meta block, table-style */}
        <table className="mb-4 w-full text-xs">
          <tbody>
            <tr>
              <td className="align-top">
                <div className="space-y-0.5">
                  <p>
                    <span className="font-semibold">Bill To:&nbsp;</span>
                    {invoice.customer?.name ?? "—"}
                  </p>
                  {invoice.customer?.address && (
                    <p>
                      <span className="font-semibold">Address:&nbsp;</span>
                      {invoice.customer.address}
                    </p>
                  )}
                  {invoice.customer?.city && (
                    <p>
                      {[invoice.customer.city, invoice.customer.state, invoice.customer.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {(invoice.customer?.phone || invoice.customer?.email) && (
                    <p>
                      {invoice.customer?.phone && <>Phone: {invoice.customer.phone}</>}
                      {invoice.customer?.phone && invoice.customer?.email && "  "}
                      {invoice.customer?.email && <>Email: {invoice.customer.email}</>}
                    </p>
                  )}
                </div>
              </td>
              <td className="align-top">
                <div className="space-y-0.5 text-right">
                  <p>
                    <span className="font-semibold">Invoice No:&nbsp;</span>
                    {invoice.invoiceNumber}
                  </p>
                  <p>
                    <span className="font-semibold">Invoice Date:&nbsp;</span>
                    {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                  </p>
                  <p>
                    <span className="font-semibold">Terms:&nbsp;</span>
                    30 days
                  </p>
                  {invoice.dueDate && (
                    <p>
                      <span className="font-semibold">Due Date:&nbsp;</span>
                      {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Courier:&nbsp;</span>
                    Pickup
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border border-slate-400 border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left text-xs font-semibold uppercase text-slate-600">
                Sr. No
              </th>
              <th className="border border-slate-400 px-2 py-1 text-left text-xs font-semibold uppercase text-slate-600">
                Goods Description
              </th>
              <th className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold uppercase text-slate-600">
                Qty
              </th>
              <th className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold uppercase text-slate-600">
                Rate
              </th>
              <th className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold uppercase text-slate-600">
                GST %
              </th>
              <th className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold uppercase text-slate-600">
                Taxable
              </th>
              <th className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold uppercase text-slate-600">
                GST Amt
              </th>
              <th className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold uppercase text-slate-600">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map((line, idx) => (
              <tr key={idx}>
                <td className="border border-slate-400 px-2 py-1 text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-slate-900">
                  {line.name}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right text-slate-600">
                  {line.qty.toLocaleString("en-IN")}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right text-slate-600">
                  ₹{line.rate.toLocaleString("en-IN")}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right text-slate-600">
                  {line.gstRate}%
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right text-slate-600">
                  ₹{line.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right text-slate-600">
                  ₹{line.gstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right font-medium">
                  ₹{line.gross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100">
              <td
                className="border border-slate-400 px-2 py-1 text-right text-xs font-semibold text-slate-600"
                colSpan={5}
              >
                TOTAL
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right text-sm font-semibold text-slate-900">
                ₹{taxableTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right text-sm font-semibold text-slate-900">
                ₹{gstTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right text-sm font-semibold text-slate-900">
                ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-2 text-xs font-medium text-slate-600">
          Amount in words: {amountInWords} only
        </p>

        <div className="mt-4 flex justify-between border-t border-slate-400 pt-4">
          <div className="max-w-sm text-sm text-slate-600" />
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
              <p className="font-medium text-slate-600">
                Balance: ₹{balance.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-6 border-t border-slate-400 pt-4 text-xs">
          {invoice.notes && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase text-slate-600">Notes</p>
              <p className="mt-1 whitespace-pre-line text-slate-600">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {(company?.footerDisclaimer || company?.footerDeclaration) && (
          <div className="mt-6 space-y-3 border-t border-slate-400 pt-4 text-xs">
            {company.footerDisclaimer && (
              <div>
                <p className="font-semibold uppercase text-slate-600">Disclaimer</p>
                <p className="mt-1 text-slate-600">{company.footerDisclaimer}</p>
              </div>
            )}
            {company.footerDeclaration && (
              <div>
                <p className="font-semibold uppercase text-slate-600">Declaration</p>
                <p className="mt-1 text-slate-600">{company.footerDeclaration}</p>
              </div>
            )}
          </div>
        )}

        {company?.bankName && (
          <div className="mt-6 border-t border-slate-400 pt-4 text-xs">
            <p className="mb-2 font-semibold uppercase text-slate-600">Bank Details</p>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="font-semibold w-32">Name of the Bank :</td>
                  <td className="w-1/2">{company.bankName}</td>
                  <td className="font-semibold w-32">Account No :</td>
                  <td>{company.bankAccountNumber ?? ""}</td>
                </tr>
                <tr>
                  <td className="font-semibold">Bank Add. :</td>
                  <td>{company.bankBranch ?? ""}</td>
                  <td className="font-semibold">IFSC :</td>
                  <td>{company.bankIfsc ?? ""}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 flex justify-between text-xs">
          <div>
            <p>For {company?.name ?? "Company"}</p>
          </div>
          <div className="text-right">
            <p className="border-t border-slate-400 px-6 pt-1 uppercase tracking-wide">
              Authorised Signatory
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-500">
          1 / 1
        </div>
      </div>
    </div>
  );
}
