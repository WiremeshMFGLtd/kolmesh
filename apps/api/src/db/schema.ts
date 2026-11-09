import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  inet,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ─────────────────────────── Catalogue ─────────────────────────── */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    /** Free-form spec lines, e.g. "Size: 2.5mm, 3mm" */
    specs: jsonb("specs").$type<string[]>().notNull().default([]),
    /** Optional structured variants (sizes, colours, gauges) */
    variants: jsonb("variants")
      .$type<{ label: string; options: string[] }[]>()
      .notNull()
      .default([]),
    /** Optional indicative price (GHS). Null = "request a quote" */
    priceFrom: integer("price_from"),
    unit: text("unit").default("per unit"),
    inStock: boolean("in_stock").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_category_idx").on(t.categoryId),
    index("products_active_idx").on(t.isActive, t.sortOrder),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Smaller derivative used for cards/thumbnails (same as url when external) */
    thumbUrl: text("thumb_url").notNull(),
    alt: text("alt").notNull().default(""),
    width: integer("width"),
    height: integer("height"),
    /** Storage object path when hosted in Supabase (null when external URL) */
    storagePath: text("storage_path"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.sortOrder)],
);

/* Hero slides / homepage highlights */
export const highlights = pgTable("highlights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default("Browse products"),
  ctaHref: text("cta_href").notNull().default("/products"),
  imageUrl: text("image_url").notNull(),
  storagePath: text("storage_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────── Leads ─────────────────────────── */

export const enquiryStatus = ["new", "in_progress", "quoted", "won", "lost", "spam"] as const;
export type EnquiryStatus = (typeof enquiryStatus)[number];

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    reference: text("reference").notNull(), // e.g. KOL-2025-00042
    type: text("type", { enum: ["quote", "contact"] }).notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    location: text("location"),
    message: text("message").notNull().default(""),
    status: text("status", { enum: enquiryStatus }).notNull().default("new"),
    adminNotes: text("admin_notes").notNull().default(""),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("enquiries_reference_idx").on(t.reference),
    index("enquiries_status_idx").on(t.status, t.createdAt),
    index("enquiries_created_idx").on(t.createdAt),
  ],
);

export const enquiryItems = pgTable("enquiry_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  enquiryId: uuid("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(), // snapshot
  variant: text("variant"),
  quantity: integer("quantity").notNull().default(1),
  note: text("note"),
});

/* ─────────────────────────── Admin / Auth ─────────────────────────── */

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "admin", "editor"] }).notNull().default("admin"),
    totpSecret: text("totp_secret"), // encrypted at rest
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: inet("last_login_ip"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admins_email_idx").on(t.email)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    family: uuid("family").notNull(), // rotation family for reuse detection
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("refresh_tokens_hash_idx").on(t.tokenHash), index("refresh_tokens_family_idx").on(t.family)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
    adminEmail: text("admin_email"),
    action: text("action").notNull(), // e.g. product.create
    entity: text("entity"),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Lightweight first-party analytics (no cookies, no third parties) */
export const pageViews = pgTable(
  "page_views",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    path: text("path").notNull(),
    referrer: text("referrer"),
    country: text("country"),
    /** salted daily hash of ip+ua — never the raw IP */
    visitorHash: text("visitor_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("page_views_created_idx").on(t.createdAt), index("page_views_path_idx").on(t.path)],
);

/* ─────────────────────────── Relations ─────────────────────────── */

export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const enquiriesRelations = relations(enquiries, ({ many }) => ({ items: many(enquiryItems) }));
export const enquiryItemsRelations = relations(enquiryItems, ({ one }) => ({
  enquiry: one(enquiries, { fields: [enquiryItems.enquiryId], references: [enquiries.id] }),
  product: one(products, { fields: [enquiryItems.productId], references: [products.id] }),
}));
