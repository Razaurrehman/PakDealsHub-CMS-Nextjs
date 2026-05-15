'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { blogCategorySchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2 } from 'lucide-react';

type BlogCategoryForm = z.infer<typeof blogCategorySchema>;

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BlogCategoryForm>({ resolver: zodResolver(blogCategorySchema) as any });

  const load = async (p: number, search: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    const res = await fetch(`/api/blog-categories?${q}`);
    const data = await res.json();
    setCategories(data.data?.categories ?? []);
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

  const openCreate = () => { reset({ name: '', isActive: true }); setEditing(null); setOpen(true); };
  const openEdit = (c: any) => { reset({ ...c }); setEditing(c); setOpen(true); };

  const onSubmit = async (data: BlogCategoryForm) => {
    const url = editing ? `/api/blog-categories/${editing.id}` : '/api/blog-categories';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Category updated' : 'Category created', 'success');
    setOpen(false); load(page, debouncedSearch);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this blog category?')) return;
    await fetch(`/api/blog-categories/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} category(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/blog-categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} category(s)`, 'success');
    load(page, debouncedSearch);
  };

  const columns = [
    { key: 'name', header: 'Name', render: (c: any) => <span className="font-medium">{c.name}</span> },
    { key: 'slug', header: 'Slug', render: (c: any) => <code className="text-xs text-muted-foreground">{c.slug}</code> },
    { key: 'description', header: 'Description', render: (c: any) => <p className="text-sm text-muted-foreground truncate max-w-xs">{c.description ?? '—'}</p> },
    { key: 'blogs', header: 'Posts', render: (c: any) => <span className="font-medium">{c._count?.blogs ?? 0}</span> },
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
      <PageHeader title="Blog Categories" description="Manage blog post categories" action={{ label: 'Add Category', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search categories…"
          total={total} loading={loading} hasFilters={!!rawSearch} onClear={clearFilters} />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={categories} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Blog Category' : 'Add Blog Category'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Category Name *" error={errors.name?.message} {...register('name')} />
            <Input label="Slug (auto-generated)" {...register('slug')} />
          </div>
          <Textarea label="Description" rows={3} {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Meta Title" {...register('metaTitle')} />
            <Input label="Meta Description" {...register('metaDesc')} />
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
