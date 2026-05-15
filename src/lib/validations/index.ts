import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  emoji: z.string().optional().nullable(),
  boxColor: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
});

export const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  shortDesc: z.string().optional().nullable(),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional().default([]),
  thumbnail: z.string().optional().nullable(),
  stock: z.number().int().min(0).optional().default(0),
  lowStockAlert: z.number().int().min(0).optional().default(5),
  status: z.enum(['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'DISCONTINUED']).default('DRAFT'),
  isFeatured: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  freeDelivery: z.boolean().optional().default(false),
  warranty: z.string().optional().nullable(),
  deliveryDays: z.number().int().optional().nullable(),
  colors: z.array(z.string()).optional().default([]),
  storages: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
});

export const bannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  buttonText: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  sortOrder: z.number().int().optional().default(0),
});

export const couponSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  discountType: z.string().default('PERCENT'),
  discountValue: z.number().min(0),
  minOrderValue: z.number().min(0).optional().nullable(),
  maxDiscount: z.number().min(0).optional().nullable(),
  usageLimit: z.number().int().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const orderUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  reviewer: z.string().min(1),
  email: z.string().email().optional().nullable(),
  isApproved: z.boolean().optional().default(false),
  productId: z.string().min(1),
});

export const blogCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
});

export const blogSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).default('DRAFT'),
  isFeatured: z.boolean().optional().default(false),
  publishedAt: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  readingTime: z.number().int().optional().nullable(),
  blogCategoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
});

export const tagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});

export const staticPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  content: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  isPublished: z.boolean().optional().default(true),
});

export const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER']).default('EDITOR'),
  isActive: z.boolean().optional().default(true),
});

export const contactMessageSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().optional().nullable(),
  message: z.string().min(1),
});

export const newsletterSchema = z.object({
  email: z.string().email(),
});
