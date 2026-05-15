'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { blogSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { ExportButton } from '@/components/admin/ExportButton';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type BlogForm = z.infer<typeof blogSchema>;

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [blogCategories, setBlogCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<BlogForm>({ resolver: zodResolver(blogSchema) as any });

  const load = async (p: number, search: string, status: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    const res = await fetch(`/api/blogs?${q}`);
    const data = await res.json();
    setBlogs(data.data?.blogs ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  const loadMeta = async () => {
    const [catRes, tagRes] = await Promise.all([
      fetch('/api/blog-categories'),
      fetch('/api/tags'),
    ]);
    const catData = await catRes.json();
    const tagData = await tagRes.json();
    setBlogCategories(catData.data ?? []);
    setTags(tagData.data ?? []);
  };

  useEffect(() => { load(1, '', ''); loadMeta(); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, statusFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, statusFilter); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters = () => { setRawSearch(''); setStatusFilter(''); setPage(1); load(1, '', ''); };

  const openCreate = () => {
    reset({ title: '', status: 'DRAFT', isFeatured: false });
    setSelectedTags([]);
    setEditing(null); setOpen(true);
  };
  const openEdit = (b: any) => {
    reset({ ...b });
    setSelectedTags(b.tags?.map((t: any) => t.tagId ?? t.id) ?? []);
    setEditing(b); setOpen(true);
  };

  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const onSubmit = async (data: BlogForm) => {
    const payload = { ...data, tagIds: selectedTags };
    const url = editing ? `/api/blogs/${editing.id}` : '/api/blogs';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Blog updated' : 'Blog created', 'success');
    setOpen(false); load(page, debouncedSearch, statusFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, statusFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} blog(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/blogs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} blog(s)`, 'success');
    load(page, debouncedSearch, statusFilter);
  };

  const statusBadge = (s: string) => {
    if (s === 'PUBLISHED') return <Badge variant="success">Published</Badge>;
    if (s === 'ARCHIVED') return <Badge variant="default">Archived</Badge>;
    return <Badge variant="warning">Draft</Badge>;
  };

  const columns = [
    {
      key: 'thumbnail', header: '', className: 'w-14',
      render: (b: any) => b.thumbnail
        ? <img src={b.thumbnail} className="h-10 w-14 rounded object-cover border border-border" />
        : <div className="h-10 w-14 rounded bg-muted" />,
    },
    {
      key: 'title', header: 'Title',
      render: (b: any) => (
        <div>
          <p className="font-medium text-sm">{b.title}</p>
          {b.blogCategory && <p className="text-xs text-muted-foreground">{b.blogCategory.name}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (b: any) => statusBadge(b.status) },
    { key: 'isFeatured', header: 'Featured', render: (b: any) => b.isFeatured ? <Badge variant="info">Featured</Badge> : '—' },
    { key: 'readingTime', header: 'Read Time', render: (b: any) => b.readingTime ? <span className="text-xs text-muted-foreground">{b.readingTime} min</span> : '—' },
    { key: 'publishedAt', header: 'Published', render: (b: any) => b.publishedAt ? <span className="text-xs text-muted-foreground">{format(new Date(b.publishedAt), 'dd MMM yyyy')}</span> : '—' },
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
      <PageHeader title="Blog Posts" description="Manage blog content and articles">
        <ExportButton entity="blogs" />
        <Button onClick={openCreate}>Add Post</Button>
      </PageHeader>

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search posts…"
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

        <DataTable columns={columns} data={blogs} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Blog Post' : 'Add Blog Post'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title *" error={errors.title?.message} {...register('title')} />
            <Input label="Slug (auto-generated)" {...register('slug')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Blog Category</label>
              <select {...register('blogCategoryId')} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">No Category</option>
                {blogCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select {...register('status')} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <Textarea label="Excerpt" rows={2} {...register('excerpt')} />
          <ImageUpload label="Thumbnail" value={watch('thumbnail') ?? ''} onChange={v => setValue('thumbnail', v)} />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Content</label>
            <RichTextEditor value={watch('content') ?? ''} onChange={v => setValue('content', v)} />
          </div>
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t: any) => (
                  <button
                    key={t.id} type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedTags.includes(t.id)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary'
                    }`}
                  >{t.name}</button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Author Name" {...register('authorName')} />
            <Input label="Published At" type="datetime-local" {...register('publishedAt')} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('isFeatured')} className="rounded accent-blue-600" />
            <span>Featured Post</span>
          </label>
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
