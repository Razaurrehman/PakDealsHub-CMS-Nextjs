export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'DISCONTINUED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
export type BannerStatus = 'ACTIVE' | 'INACTIVE';

export interface Site {
  id: string;
  name: string;
  domain: string;
  logo?: string | null;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatar?: string | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  emoji?: string | null;
  boxColor?: string | null;
  parentId?: string | null;
  isActive: boolean;
  sortOrder: number;
  parent?: Pick<Category, 'id' | 'name'> | null;
  children?: Category[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  isFeatured: boolean;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  price: number;
  comparePrice?: number | null;
  stock: number;
  status: ProductStatus;
  isFeatured: boolean;
  thumbnail?: string | null;
  images: string[];
  category?: Pick<Category, 'id' | 'name'> | null;
  brand?: Pick<Brand, 'id' | 'name'> | null;
  createdAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  city?: string | null;
  totalAmount: number;
  finalAmount: number;
  status: OrderStatus;
  paymentMethod?: string | null;
  paymentStatus: string;
  createdAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  variant?: string | null;
  subtotal: number;
}

export interface DashboardStats {
  totalProducts: number;
  newProductsThisWeek: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalBrands: number;
  totalCategories: number;
  activeCoupons: number;
  pendingReviews: number;
  totalBlogs: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
}
