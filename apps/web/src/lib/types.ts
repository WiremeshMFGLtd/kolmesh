export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  thumbUrl: string;
  alt: string;
  width: number | null;
  height: number | null;
  storagePath: string | null;
  sortOrder: number;
};

export type Variant = { label: string; options: string[] };

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  specs: string[];
  variants: Variant[];
  priceFrom: number | null;
  unit: string | null;
  inStock: boolean;
  isFeatured: boolean;
  isActive?: boolean;
  viewCount?: number;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sortOrder: number;
  images: ProductImage[];
  related?: Product[];
  updatedAt?: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive?: boolean;
  productCount: number;
};

export type Highlight = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  storagePath: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Settings = {
  contact?: { email: string; phone: string; whatsapp: string; address: string; hours: string };
  company?: { name: string; founded: number; tagline: string };
};

export type EnquiryStatus = "new" | "in_progress" | "quoted" | "won" | "lost" | "spam";

export type EnquiryItem = {
  id: string;
  productId: string | null;
  productName: string;
  variant: string | null;
  quantity: number;
  note: string | null;
  product?: { slug: string } | null;
};

export type Enquiry = {
  id: string;
  reference: string;
  type: "quote" | "contact";
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  location: string | null;
  message: string;
  status: EnquiryStatus;
  adminNotes: string;
  isRead: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  items: EnquiryItem[];
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "editor";
  totpEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

export type Dashboard = {
  counts: { products: number; categories: number; outOfStock: number; admins: number };
  enquiries: { total: number; unread: number; last7: number; prev7: number; quotes30: number };
  traffic: { last30: number; prev30: number; visitors30: number };
  topProducts: { id: string; name: string; slug: string; viewCount: number }[];
  recentEnquiries: Enquiry[];
  byStatus: Partial<Record<EnquiryStatus, number>>;
  series: { day: string; views: number; enquiries: number }[];
};

export type AuditLog = {
  id: string;
  adminEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};
