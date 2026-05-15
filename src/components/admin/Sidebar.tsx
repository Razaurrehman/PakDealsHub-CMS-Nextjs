'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, FolderOpen, Award, Image as ImageIcon,
  Tag, ShoppingCart, Star, FileText, Hash, FileStack,
  HardDrive, Mail, Bell, Users, Activity, ChevronRight, LogOut,
  Layers, BookOpen, ShoppingBag, UserCircle,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

type NavItem = { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; exact?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
      { label: 'Brands', href: '/admin/brands', icon: Award },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Customers', href: '/admin/customers', icon: UserCircle },
      { label: 'Coupons', href: '/admin/coupons', icon: Tag },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Banners', href: '/admin/banners', icon: ImageIcon },
      { label: 'Blog Categories', href: '/admin/blog-categories', icon: Layers },
      { label: 'Blogs', href: '/admin/blogs', icon: FileText },
      { label: 'Tags', href: '/admin/tags', icon: Hash },
      { label: 'Static Pages', href: '/admin/static-pages', icon: FileStack },
      { label: 'Media', href: '/admin/media', icon: HardDrive },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Contact Messages', href: '/admin/contact-messages', icon: Mail },
      { label: 'Newsletter', href: '/admin/newsletter-subscribers', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Activity Logs', href: '/admin/activity-logs', icon: Activity },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <ShoppingBag size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">PakDealsHub</p>
            <p className="text-[10px] text-muted-foreground">CMS Admin</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, exact }) => (
                <Link key={href} href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors group',
                    isActive(href, exact)
                      ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}>
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  {isActive(href, exact) && <ChevronRight size={14} className="text-blue-400" />}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
