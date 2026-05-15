'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { brandSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';

type BrandForm = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<BrandForm>({ resolver: zodResolver(brandSchema) as any });

  const load = async (p: number, search: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    const res = await fetch(`/api/brands?${q}`);
    const data = await res.json();
    setBrands(data.data?.brands ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch); };
  const clearFilters = () => { setRawSearch(''); setPage(1); load(1, ''); };

  const openCreate = () => { reset({ name: '', isFeatured: false, isActive: true }); setEditing(null); setOpen(true); };
  const openEdit = (b: any) => { reset({ ...b }); setEditing(b); setOpen(true); };

  const onSubmit = async (data: BrandForm) => {
    const url = editing ? `/api/brands/${editing.id}` : '/api/brands';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Brand updated' : 'Brand created', 'success');
    setOpen(false); load(page, debouncedSearch);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this brand?')) return;
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} brand(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/brands', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} brand(s)`, 'success');
    load(page, debouncedSearch);
  };

  const columns = [
    { key: 'logo', header: '', className: 'w-14', render: (b: any) => b.logo ? <img src={b.logo} className="h-9 w-9 rounded object-contain border border-border p-0.5 bg-white" /> : <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground font-bold">{b.name[0]}</div> },
    { key: 'name', header: 'Brand', render: (b: any) => <span className="font-medium">{b.name}</span> },
    { key: 'slug', header: 'Slug', render: (b: any) => <code className="text-xs text-muted-foreground">{b.slug}</code> },
    {
      key: 'website', header: 'Website',
      render: (b: any) => b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">{b.website.replace(/^https?:\/\//, '')} <ExternalLink size={10} /></a> : '—',
    },
    { key: 'isFeatured', header: 'Featured', render: (b: any) => b.isFeatured ? <Badge variant="info">Featured</Badge> : '—' },
    { key: 'isActive', header: 'Active', render: (b: any) => <Badge variant={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Yes' : 'No'}</Badge> },
    { key: '_count', header: 'Products', render: (b: any) => <span className="font-medium">{b._count?.products ?? 0}</span> },
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
      <PageHeader title="Brands" description="Manage product brands" action={{ label: 'Add Brand', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search brands…"
          total={total} loading={loading} hasFilters={!!rawSearch} onClear={clearFilters} />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={brands} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Brand' : 'Add Brand'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Brand Name *" error={errors.name?.message} {...register('name')} />
            <Input label="Slug (auto-generated)" {...register('slug')} />
          </div>
          <ImageUpload label="Brand Logo" value={watch('logo') ?? ''} onChange={v => setValue('logo', v)} />
          <Textarea label="Description" {...register('description')} />
          <Input label="Website URL" type="url" placeholder="https://brand.com" {...register('website')} />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('isFeatured')} className="rounded accent-blue-600" />
              <span>Featured</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="rounded accent-blue-600" />
              <span>Active</span>
            </label>
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Meta Title" {...register('metaTitle')} />
              <Input label="Meta Description" {...register('metaDesc')} />
            </div>
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
