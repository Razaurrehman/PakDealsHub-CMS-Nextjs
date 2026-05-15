'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { couponSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2, Tag } from 'lucide-react';
import { formatPKR } from '@/lib/utils';
import { format } from 'date-fns';

type CouponForm = z.infer<typeof couponSchema>;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'PERCENT', label: 'Percentage' },
  { value: 'FIXED', label: 'Fixed Amount' },
];

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CouponForm>({ resolver: zodResolver(couponSchema) as any });
  const discountType = watch('discountType');

  const load = async (p: number, search: string, type: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (type) q.set('discountType', type);
    const res = await fetch(`/api/coupons?${q}`);
    const data = await res.json();
    setCoupons(data.data?.coupons ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, typeFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, typeFilter); };
  const handleTypeFilter = (v: string) => { setTypeFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters = () => { setRawSearch(''); setTypeFilter(''); setPage(1); load(1, '', ''); };

  const openCreate = () => {
    reset({ code: '', discountType: 'PERCENT', discountValue: 0, isActive: true, usageLimit: undefined, minOrderValue: undefined });
    setEditing(null); setOpen(true);
  };
  const openEdit = (c: any) => {
    reset({
      ...c,
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : undefined,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : undefined,
    });
    setEditing(c); setOpen(true);
  };

  const onSubmit = async (data: CouponForm) => {
    const url = editing ? `/api/coupons/${editing.id}` : '/api/coupons';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Coupon updated' : 'Coupon created', 'success');
    setOpen(false); load(page, debouncedSearch, typeFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, typeFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} coupon(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} coupon(s)`, 'success');
    load(page, debouncedSearch, typeFilter);
  };

  const columns = [
    {
      key: 'code', header: 'Code',
      render: (c: any) => (
        <div className="flex items-center gap-2">
          <Tag size={13} className="text-blue-500" />
          <code className="font-mono font-semibold text-sm">{c.code}</code>
        </div>
      ),
    },
    {
      key: 'discount', header: 'Discount',
      render: (c: any) => c.discountType === 'PERCENT'
        ? <Badge variant="info">{c.discountValue}% off</Badge>
        : <Badge variant="purple">{formatPKR(c.discountValue)} off</Badge>,
    },
    {
      key: 'minOrder', header: 'Min. Order',
      render: (c: any) => c.minOrderValue ? formatPKR(c.minOrderValue) : '—',
    },
    {
      key: 'usage', header: 'Usage',
      render: (c: any) => (
        <span className="text-sm text-muted-foreground">
          {c.usageCount ?? 0}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'expires', header: 'Expires',
      render: (c: any) => c.expiresAt
        ? <span className="text-xs text-muted-foreground">{format(new Date(c.expiresAt), 'dd MMM yyyy')}</span>
        : '—',
    },
    { key: 'isActive', header: 'Active', render: (c: any) => <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Yes' : 'No'}</Badge> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (c: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(c.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Coupons" description="Manage discount codes and promotions" action={{ label: 'Add Coupon', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search coupons…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!typeFilter} onClear={clearFilters}>
          <FilterSelect value={typeFilter} onChange={handleTypeFilter} options={TYPE_OPTIONS} placeholder="Type" />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={coupons} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Coupon Code *" placeholder="SAVE20" error={errors.code?.message} {...register('code')} />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Discount Type *</label>
              <select {...register('discountType')} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="PERCENT">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (Rs)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={discountType === 'PERCENT' ? 'Discount Value (%) *' : 'Discount Amount (Rs) *'}
              type="number" step="0.01"
              error={errors.discountValue?.message}
              {...register('discountValue', { valueAsNumber: true })}
            />
            <Input label="Min. Order Value (Rs)" type="number" placeholder="Optional" {...register('minOrderValue', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Discount (Rs)" type="number" placeholder="Optional (for % type)" {...register('maxDiscount', { valueAsNumber: true })} />
            <Input label="Usage Limit" type="number" placeholder="Leave blank for unlimited" {...register('usageLimit', { valueAsNumber: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Starts At" type="datetime-local" {...register('startsAt')} />
            <Input label="Expires At" type="datetime-local" {...register('expiresAt')} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('isActive')} className="rounded accent-blue-600" />
            <span>Active</span>
          </label>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
