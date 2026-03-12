import { randomUUID } from "crypto";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const idColumn = () => varchar("id").primaryKey().$defaultFn(() => randomUUID());

export const company = pgTable("Company", {
  id: idColumn(),
  name: varchar("name").notNull(),
  addressLine1: varchar("address_line1"),
  addressLine2: varchar("address_line2"),
  city: varchar("city"),
  state: varchar("state"),
  pincode: varchar("pincode"),
  country: varchar("country").default("IN"),
  gstin: varchar("gstin"),
  pan: varchar("pan"),
  phone: varchar("phone"),
  email: varchar("email"),
  planStatus: varchar("plan_status").notNull().default("active"),
  validTill: timestamp("valid_till"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const user = pgTable("User", {
  id: idColumn(),
  companyId: varchar("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  name: varchar("name"),
  email: varchar("email").notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: varchar("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customer = pgTable("Customer", {
  id: idColumn(),
  companyId: varchar("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  pincode: varchar("pincode"),
  gstin: varchar("gstin"),
  stateCode: varchar("state_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const product = pgTable("Product", {
  id: idColumn(),
  companyId: varchar("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  sku: varchar("sku"),
  unit: varchar("unit").default("pcs"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  hsnCode: varchar("hsn_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoice = pgTable("Invoice", {
  id: idColumn(),
  companyId: varchar("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  customerId: varchar("customer_id").notNull().references(() => customer.id, { onDelete: "restrict" }),
  invoiceDate: timestamp("invoice_date").notNull(),
  status: varchar("status").notNull().default("unpaid"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoiceItem = pgTable("InvoiceItem", {
  id: idColumn(),
  invoiceId: varchar("invoice_id").notNull().references(() => invoice.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => product.id, { onDelete: "restrict" }),
  description: text("description"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payment = pgTable("Payment", {
  id: idColumn(),
  companyId: varchar("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").notNull().references(() => invoice.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  method: varchar("method").notNull(),
  reference: varchar("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const companyRelations = relations(company, ({ many }) => ({
  users: many(user),
  customers: many(customer),
  products: many(product),
  invoices: many(invoice),
  payments: many(payment),
}));

export const userRelations = relations(user, ({ one }) => ({
  company: one(company),
}));

export const customerRelations = relations(customer, ({ one, many }) => ({
  company: one(company),
  invoices: many(invoice),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  company: one(company),
  invoiceItems: many(invoiceItem),
}));

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  company: one(company),
  customer: one(customer),
  items: many(invoiceItem),
  payments: many(payment),
}));

export const invoiceItemRelations = relations(invoiceItem, ({ one }) => ({
  invoice: one(invoice),
  product: one(product),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  company: one(company),
  invoice: one(invoice),
}));
