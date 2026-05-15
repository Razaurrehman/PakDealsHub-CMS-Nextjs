'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staticPageSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type StaticPageForm = z.infer<typeof staticPageSchema>;

export default function StaticPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<StaticPageForm>({ resolver: zodResolver(staticPageSchema) as any });

  const load = async (p: number, search: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    const res = await fetch(`/api/static-pages?${q}`);
    const data = await res.json();
    setPages(data.data?.pages ?? []);
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

  const openCreate = () => { reset({ title: '', isPublished: true }); setEditing(null); setOpen(true); };
  const openEdit = (p: any) => { reset({ ...p }); setEditing(p); setOpen(true); };

  const onSubmit = async (data: StaticPageForm) => {
    const url = editing ? `/api/static-pages/${editing.id}` : '/api/static-pages';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Page updated' : 'Page created', 'success');
    setOpen(false); load(page, debouncedSearch);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    await fetch(`/api/static-pages/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} page(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/static-pages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} page(s)`, 'success');
    load(page, debouncedSearch);
  };

  const columns = [
    { key: 'title', header: 'Title', render: (p: any) => <span className="font-medium">{p.title}</span> },
    { key: 'slug', header: 'Slug', render: (p: any) => <code className="text-xs text-muted-foreground">{p.slug}</code> },
    { key: 'isPublished', header: 'Published', render: (p: any) => <Badge variant={p.isPublished ? 'success' : 'default'}>{p.isPublished ? 'Yes' : 'No'}</Badge> },
    { key: 'updatedAt', header: 'Updated', render: (p: any) => <span className="text-xs text-muted-foreground">{format(new Date(p.updatedAt), 'dd MMM yyyy')}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (p: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(p.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Static Pages" description="Manage static content pages" action={{ label: 'Add Page', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search pages…"
          total={total} loading={loading} hasFilters={!!rawSearch} onClear={clearFilters} />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={pages} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Page' : 'Add Page'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Page Title *" error={errors.title?.message} {...register('title')} />
            <Input label="Slug (auto-generated)" {...register('slug')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Content</label>
            <RichTextEditor value={watch('content') ?? ''} onChange={v => setValue('content', v)} />
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Meta Title" {...register('metaTitle')} />
              <Input label="Meta Description" {...register('metaDesc')} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('isPublished')} className="rounded accent-blue-600" />
            <span>Published</span>
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
