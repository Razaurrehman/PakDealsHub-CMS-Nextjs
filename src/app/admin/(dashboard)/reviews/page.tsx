'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { ExportButton } from '@/components/admin/ExportButton';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Eye, Trash2, CheckCircle, XCircle, Star } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={13} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'} />
    ))}
  </div>
);

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const load = async (p: number, search: string, status: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    const res = await fetch(`/api/reviews?${q}`);
    const data = await res.json();
    setReviews(data.data?.reviews ?? []);
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

  const approve = async (id: string) => {
    await fetch(`/api/reviews/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APPROVED' }) });
    toast('Review approved', 'success'); load(page, debouncedSearch, statusFilter);
  };

  const reject = async (id: string) => {
    await fetch(`/api/reviews/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REJECTED' }) });
    toast('Review rejected', 'success'); load(page, debouncedSearch, statusFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, statusFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} review(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/reviews', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} review(s)`, 'success');
    load(page, debouncedSearch, statusFilter);
  };

  const statusBadge = (s: string) => {
    if (s === 'APPROVED') return <Badge variant="success">Approved</Badge>;
    if (s === 'REJECTED') return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const columns = [
    {
      key: 'product', header: 'Product',
      render: (r: any) => <span className="text-sm font-medium">{r.product?.name ?? '—'}</span>,
    },
    {
      key: 'author', header: 'Author',
      render: (r: any) => (
        <div>
          <p className="text-sm font-medium">{r.authorName}</p>
          {r.authorEmail && <p className="text-xs text-muted-foreground">{r.authorEmail}</p>}
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', render: (r: any) => <StarRating rating={r.rating} /> },
    {
      key: 'comment', header: 'Comment',
      render: (r: any) => <p className="text-sm text-muted-foreground max-w-xs truncate">{r.comment ?? '—'}</p>,
    },
    { key: 'status', header: 'Status', render: (r: any) => statusBadge(r.status) },
    { key: 'createdAt', header: 'Date', render: (r: any) => <span className="text-xs text-muted-foreground">{format(new Date(r.createdAt), 'dd MMM yyyy')}</span> },
    {
      key: 'actions', header: '', className: 'w-32',
      render: (r: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewing(r)}><Eye size={14} /></Button>
          {r.status !== 'APPROVED' && <Button variant="ghost" size="sm" onClick={() => approve(r.id)}><CheckCircle size={14} className="text-green-500" /></Button>}
          {r.status !== 'REJECTED' && <Button variant="ghost" size="sm" onClick={() => reject(r.id)}><XCircle size={14} className="text-orange-400" /></Button>}
          <Button variant="ghost" size="sm" onClick={() => del(r.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Reviews" description="Moderate customer product reviews">
        <ExportButton entity="reviews" />
      </PageHeader>

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search reviews…"
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

        <DataTable columns={columns} data={reviews} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Review Detail" size="md">
        {viewing && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{viewing.authorName}</p>
                {viewing.authorEmail && <p className="text-sm text-muted-foreground">{viewing.authorEmail}</p>}
              </div>
              <StarRating rating={viewing.rating} />
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              {viewing.title && <p className="font-medium mb-2">{viewing.title}</p>}
              <p className="text-sm text-muted-foreground">{viewing.comment ?? 'No comment provided.'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Product:</span>
              <span className="text-sm font-medium">{viewing.product?.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              {statusBadge(viewing.status)}
            </div>
            <div className="flex gap-2 border-t border-border pt-4">
              {viewing.status !== 'APPROVED' && (
                <Button onClick={() => { approve(viewing.id); setViewing(null); }}>
                  <CheckCircle size={14} /> Approve
                </Button>
              )}
              {viewing.status !== 'REJECTED' && (
                <Button variant="secondary" onClick={() => { reject(viewing.id); setViewing(null); }}>
                  <XCircle size={14} /> Reject
                </Button>
              )}
              <Button variant="danger" onClick={() => { del(viewing.id); setViewing(null); }}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
