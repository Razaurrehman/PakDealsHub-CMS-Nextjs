'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Trash2, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const LIMIT = 24;

export default function MediaPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState<any>(null);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const totalPages = Math.ceil(total / LIMIT);

  const load = async (p: number, search: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    const res = await fetch(`/api/media?${q}`);
    const data = await res.json();
    setMedia(data.data?.media ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch);
  }, [debouncedSearch]);

  const clearFilters = () => { setRawSearch(''); setPage(1); load(1, ''); };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    await fetch(`/api/media/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} file(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/media', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} file(s)`, 'success');
    load(page, debouncedSearch);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      await fetch('/api/upload', { method: 'POST', body: fd });
    }
    setUploading(false);
    toast(`Uploaded ${files.length} file(s)`, 'success');
    load(1, debouncedSearch);
    if (fileRef.current) fileRef.current.value = '';
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast('Copied to clipboard', 'success');
  };

  const isImage = (mime: string) => mime?.startsWith('image/');

  return (
    <>
      <PageHeader title="Media Library" description="Manage uploaded files and images">
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>Upload Files</Button>
      </PageHeader>

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search files…"
          total={total} loading={loading} hasFilters={!!rawSearch} onClear={clearFilters} />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <ImageIcon size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No media files found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {media.map(item => (
              <div
                key={item.id}
                className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                  selectedIds.includes(item.id) ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleSelect(item.id)}
              >
                {isImage(item.mimeType) ? (
                  <img src={item.url} alt={item.originalName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon size={24} className="text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPreviewing(item); }}
                    className="text-white text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
                  >View</button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); copy(item.url); }}
                    className="text-white text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
                  >Copy URL</button>
                </div>
                {selectedIds.includes(item.id) && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1, debouncedSearch); }}>Previous</Button>
            <span className="text-sm text-muted-foreground self-center">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load(page + 1, debouncedSearch); }}>Next</Button>
          </div>
        )}
      </div>

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title={previewing?.originalName ?? ''} size="lg">
        {previewing && (
          <div className="p-6 space-y-4">
            {isImage(previewing.mimeType) && (
              <div className="rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center max-h-80">
                <img src={previewing.url} alt={previewing.originalName} className="max-h-80 object-contain" />
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{previewing.mimeType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{(previewing.size / 1024).toFixed(1)} KB</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Uploaded</span><span>{format(new Date(previewing.createdAt), 'dd MMM yyyy')}</span></div>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <code className="text-xs flex-1 truncate">{previewing.url}</code>
              <button onClick={() => copy(previewing.url)} className="text-muted-foreground hover:text-foreground"><Copy size={13} /></button>
              <a href={previewing.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink size={13} /></a>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="danger" onClick={() => { del(previewing.id); setPreviewing(null); }}><Trash2 size={13} /> Delete</Button>
              <Button variant="secondary" onClick={() => setPreviewing(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
