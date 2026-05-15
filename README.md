# PakDealsHub CMS

A headless Content Management System and REST API backend for the PakDealsHub e-commerce platform, built with **Next.js 15**, **Prisma ORM**, and **PostgreSQL**.

---

## Overview

PakDealsHub CMS provides two things:

1. **Admin Panel** — a full-featured dashboard (`/admin`) for managing every aspect of the store: products, categories, orders, customers, blogs, coupons, banners, and more.
2. **Public REST API** — a set of `/api/public/*` endpoints consumed by the React Native mobile app and web front-end, with JWT authentication, OTP email verification, rate limiting, and CORS support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| ORM | [Prisma](https://prisma.io) |
| Database | PostgreSQL |
| Auth | JWT (jose) + bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Security | Sliding-window rate limiter + bot detection middleware |

---

## Admin Panel Modules

| Module | Path | Description |
|---|---|---|
| Dashboard | `/admin` | KPI cards, revenue chart, recent orders, low-stock alerts |
| Products | `/admin/products` | Full CRUD — images, variants, pricing, SEO |
| Categories | `/admin/categories` | Nested categories with featured flag and sort order |
| Brands | `/admin/brands` | Brand management with logo and featured flag |
| Orders | `/admin/orders` | Order list, status updates, customer details |
| Customers | `/admin/customers` | Customer list, block / unblock accounts |
| Blogs | `/admin/blogs` | Rich-text blog posts with featured image and status |
| Blog Categories | `/admin/blog-categories` | Blog taxonomy management |
| Banners | `/admin/banners` | Promotional hero banners with status and sort order |
| Coupons | `/admin/coupons` | Discount codes — percentage or fixed, usage limits |
| Reviews | `/admin/reviews` | Moderate product reviews |
| Static Pages | `/admin/static-pages` | About Us, Privacy Policy, Terms & Conditions |
| Media | `/admin/media` | File upload and asset library |
| Tags | `/admin/tags` | Product tagging |
| Users | `/admin/users` | Admin user management with role assignment |
| Newsletter | `/admin/newsletter-subscribers` | Subscriber list and export |
| Contact Messages | `/admin/contact-messages` | Inbound contact form submissions |
| Activity Logs | `/admin/activity-logs` | Full audit trail of admin actions |

---

## Public API Endpoints

### Auth
```
POST  /api/public/auth/send-otp     Send OTP to email (registration step 1)
POST  /api/public/auth/register     Create account with OTP verification
POST  /api/public/auth/login        Login → returns JWT token
GET   /api/public/auth/me           Get authenticated customer profile
PUT   /api/public/auth/me           Update profile (name, phone)
```

### Catalogue
```
GET   /api/public/site              Site config (name, logo, theme)
GET   /api/public/categories        Categories  (?featured=true)
GET   /api/public/brands            Brands      (?featured=true)
GET   /api/public/products          Product list (?categoryId, brandId, search, page)
GET   /api/public/products/:id      Product detail
GET   /api/public/reviews           Product reviews (?productId)
```

### Blog
```
GET   /api/public/blog-categories   Blog categories
GET   /api/public/blogs             Blog posts (?categoryId, featured, page)
GET   /api/public/blogs/:slug       Blog post detail
```

### Commerce
```
POST  /api/public/orders            Place an order
GET   /api/public/coupons/validate  Validate a coupon code
```

> All `/api/public/*` routes include CORS headers and handle `OPTIONS` preflight requests.

---

## Security

- **JWT authentication** — tokens signed with `JWT_SECRET`, 7-day expiry
- **OTP email verification** — 6-digit code, 5-minute TTL, 3-attempt limit, 60-second resend cooldown, stored in-memory
- **Rate limiting** — sliding window per IP: strict on auth routes, generous on public catalogue routes, strict on admin routes
- **Bot detection** — blocks known security scanners, harvester UAs, and honeypot path crawlers; bans the IP on detection
- **Blocked accounts** — customers can be blocked from the admin panel; blocked accounts receive `HTTP 403` with code `ACCOUNT_BLOCKED` on login and `/me`

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A Gmail account (or any SMTP provider) for OTP emails

### 1. Clone & Install

```bash
git clone https://github.com/Razaurrehman/PakDealsHub-CMS-Nextjs.git
cd PakDealsHub-CMS-Nextjs
npm install
```

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/pakdealshub_db"
JWT_SECRET="your-secret-key-min-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
PORT=3001

# SMTP (for OTP emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="PakDealsHub <your@gmail.com>"
```

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Seed with site config, admin user, blogs, and crawled product data
npx prisma db seed
```

The seed will:
- Create the site record and super-admin account
- Seed blog categories and 6 sample blog posts
- Crawl **surmawala.pk** for real product categories, brands, and products
- Create sample promotional banners and static pages

> If surmawala.pk is unreachable, the seed exits gracefully — everything except products will still be seeded.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3001/admin/login](http://localhost:3001/admin/login)

```
Email:    admin@pakdealshub.com
Password: admin123
```

---

## Project Structure

```
prisma/
├── schema.prisma          Database schema (all models)
└── seed.ts                Combined seed — site, blogs, crawled products

scripts/
├── crawl-surmawala.js     Standalone product crawler (run independently)
└── seed-blogs.js          Standalone blog seeder (run independently)

src/
├── app/
│   ├── admin/             Admin panel pages (Next.js App Router)
│   │   ├── (dashboard)/   All protected admin sections
│   │   ├── layout.tsx     Admin root layout with sidebar
│   │   └── login/         Login page
│   ├── api/
│   │   ├── auth/          Admin auth endpoints
│   │   ├── public/        Public API (consumed by mobile app)
│   │   └── */             Admin CRUD API routes
│   └── globals.css
├── components/
│   ├── admin/             Admin-specific UI (DataTable, Sidebar, PageHeader…)
│   ├── shared/            ImageUpload, RichTextEditor
│   └── ui/                Base components (Button, Badge, Modal, Toast…)
├── hooks/
│   └── useDebounce.ts
├── lib/
│   ├── auth.ts            JWT sign/verify, session helpers
│   ├── bot-detection.ts   Scanner UA lists, honeypot check, IP ban store
│   ├── mailer.ts          Nodemailer transporter + sendOtpEmail()
│   ├── otp-store.ts       In-memory OTP store with TTL and attempt tracking
│   ├── prisma.ts          Prisma client singleton
│   ├── rate-limit.ts      Sliding window rate limiter (per-IP, per-policy)
│   ├── validations/       Zod schemas for all entities
│   └── …
├── middleware.ts           CORS + rate limiting + bot detection + auth guard
└── types/
    └── index.ts
```

---

## Database Models

| Model | Description |
|---|---|
| Site | Multi-tenant root — all records are scoped to a site |
| User | Admin users with roles (SUPER_ADMIN, ADMIN, EDITOR) |
| Customer | App customers with isActive block flag |
| Category | Product categories with isFeatured and sort order |
| Brand | Product brands with isFeatured flag |
| Product | Full product with variants, images, tags, pricing |
| Order / OrderItem | Customer orders with line items and status |
| Banner | Promotional banners with status and sort order |
| Blog / BlogCategory | Blog posts with rich-text content and publishing |
| Review | Product reviews with approval workflow |
| Coupon | Discount codes with percentage/fixed types |
| StaticPage | CMS-managed pages (About, Privacy, Terms) |
| Media | Uploaded file asset library |
| Tag | Product tags |
| ActivityLog | Admin action audit trail |
| NewsletterSubscriber | Email subscriber list |
| ContactMessage | Inbound contact form messages |

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint

npx prisma studio          # Visual database browser
npx prisma migrate dev     # Create and apply a new migration
npx prisma db seed         # Run the combined seed

node scripts/crawl-surmawala.js   # Run product crawler standalone
node scripts/seed-blogs.js        # Run blog seeder standalone
```

---

## License

Private — All rights reserved © 2026 PakDealsHub
