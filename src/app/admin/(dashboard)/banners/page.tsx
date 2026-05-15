'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bannerSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2 } from 'lucide-react';

type BannerForm = z.infer<typeof bannerSchema>;

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SCHEDULED', label: 'Scheduled' },
];

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<BannerForm>({ resolver: zodResolver(bannerSchema) as any });

  const load = async (p: number, search: string, status: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    const res = await fetch(`/api/banners?${q}`);
    const data = await res.json();
    setBanners(data.data?.banners ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, statusFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, statusFilter); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters = () => { setRawSearch(''); setStatusFilter(''); setPage(1); load(1, '', ''); };

  const openCreate = () => { reset({ title: '', status: 'ACTIVE', sortOrder: 0 }); setEditing(null); setOpen(true); };
  const openEdit = (b: any) => { reset({ ...b }); setEditing(b); setOpen(true); };

  const onSubmit = async (data: BannerForm) => {
    const url = editing ? `/api/banners/${editing.id}` : '/api/banners';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Banner updated' : 'Banner created', 'success');
    setOpen(false); load(page, debouncedSearch, statusFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, statusFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} banner(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/banners', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} banner(s)`, 'success');
    load(page, debouncedSearch, statusFilter);
  };

  const statusBadge = (s: string) => {
    if (s === 'ACTIVE') return <Badge variant="success">Active</Badge>;
    if (s === 'SCHEDULED') return <Badge variant="info">Scheduled</Badge>;
    return <Badge variant="default">Inactive</Badge>;
  };

  const columns = [
    {
      key: 'image', header: '', className: 'w-20',
      render: (b: any) => b.image
        ? <img src={b.image} className="h-10 w-16 rounded object-cover border border-border" />
        : <div className="h-10 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">No img</div>,
    },
    { key: 'title', header: 'Title', render: (b: any) => <span className="font-medium">{b.title}</span> },
    { key: 'tag', header: 'Tag', render: (b: any) => b.tag ? <span className="text-xs text-muted-foreground">{b.tag}</span> : '—' },
    { key: 'badge', header: 'Badge', render: (b: any) => b.badge ? <Badge variant="warning">{b.badge}</Badge> : '—' },
    { key: 'status', header: 'Status', render: (b: any) => statusBadge(b.status) },
    { key: 'sortOrder', header: 'Order', render: (b: any) => <span className="text-sm text-muted-foreground">{b.sortOrder}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (b: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(b.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Banners" description="Manage homepage and promotional banners" action={{ label: 'Add Banner', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search banners…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!statusFilter} onClear={clearFilters}>
          <FilterSelect value={statusFilter} onChange={handleStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={banners} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Banner' : 'Add Banner'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title *" error={errors.title?.message} {...register('title')} />
            <Input label="Tag (e.g. NEW ARRIVAL)" {...register('tag')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Badge Text (e.g. 20% OFF)" {...register('badge')} />
            <Input label="Sort Order" type="number" {...register('sortOrder', { valueAsNumber: true })} />
          </div>
          <Textarea label="Subtitle" rows={2} {...register('subtitle')} />
          <ImageUpload label="Banner Image" value={watch('image') ?? ''} onChange={v => setValue('image', v)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Link URL" placeholder="/products/category/phones" {...register('link')} />
            <Input label="Button Text" placeholder="Shop Now" {...register('buttonText')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
            <select {...register('status')} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
