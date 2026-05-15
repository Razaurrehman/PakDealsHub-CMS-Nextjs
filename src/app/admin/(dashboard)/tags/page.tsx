'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tagSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2 } from 'lucide-react';

type TagForm = z.infer<typeof tagSchema>;

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TagForm>({ resolver: zodResolver(tagSchema) as any });

  const load = async (p: number, search: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    const res = await fetch(`/api/tags?${q}`);
    const data = await res.json();
    setTags(data.data?.tags ?? []);
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

  const openCreate = () => { reset({ name: '' }); setEditing(null); setOpen(true); };
  const openEdit = (t: any) => { reset({ name: t.name, slug: t.slug }); setEditing(t); setOpen(true); };

  const onSubmit = async (data: TagForm) => {
    const url = editing ? `/api/tags/${editing.id}` : '/api/tags';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Tag updated' : 'Tag created', 'success');
    setOpen(false); load(page, debouncedSearch);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} tag(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} tag(s)`, 'success');
    load(page, debouncedSearch);
  };

  const columns = [
    { key: 'name', header: 'Name', render: (t: any) => <span className="font-medium">{t.name}</span> },
    { key: 'slug', header: 'Slug', render: (t: any) => <code className="text-xs text-muted-foreground">{t.slug}</code> },
    { key: 'blogs', header: 'Posts', render: (t: any) => <span className="font-medium">{t._count?.blogs ?? 0}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (t: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(t.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Tags" description="Manage blog post tags" action={{ label: 'Add Tag', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search tags…"
          total={total} loading={loading} hasFilters={!!rawSearch} onClear={clearFilters} />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={tags} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Tag' : 'Add Tag'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input label="Tag Name *" error={errors.name?.message} {...register('name')} />
          <Input label="Slug (auto-generated)" {...register('slug')} />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
