import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import slugifyLib from 'slugify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return slugifyLib(text, { lower: true, strict: true, trim: true });
}

export function calcReadingTime(content: string): number {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    return dirty;
  }
  const DOMPurify = require('isomorphic-dompurify');
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}

export function paginate(page: number, limit = 20) {
  const p = Math.max(1, page);
  return { skip: (p - 1) * limit, take: limit };
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString()}`;
}

export function isExpired(date?: Date | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}
