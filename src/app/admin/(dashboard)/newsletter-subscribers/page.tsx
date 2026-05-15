'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function NewsletterSubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const load = async (p: number, search: string, active: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (active !== '') q.set('isActive', active);
    const res = await fetch(`/api/newsletter-subscribers?${q}`);
    const data = await res.json();
    setSubscribers(data.data?.subscribers ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, activeFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, activeFilter); };
  const handleActiveFilter = (v: string) => { setActiveFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters = () => { setRawSearch(''); setActiveFilter(''); setPage(1); load(1, '', ''); };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/newsletter-subscribers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    toast(isActive ? 'Subscriber deactivated' : 'Subscriber activated', 'success');
    load(page, debouncedSearch, activeFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this subscriber?')) return;
    await fetch(`/api/newsletter-subscribers/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, activeFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} subscriber(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/newsletter-subscribers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} subscriber(s)`, 'success');
    load(page, debouncedSearch, activeFilter);
  };

  const columns = [
    { key: 'email', header: 'Email', render: (s: any) => <span className="font-medium">{s.email}</span> },
    { key: 'name', header: 'Name', render: (s: any) => <span className="text-sm text-muted-foreground">{s.name ?? '—'}</span> },
    { key: 'isActive', header: 'Status', render: (s: any) => <Badge variant={s.isActive ? 'success' : 'default'}>{s.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'subscribedAt', header: 'Subscribed', render: (s: any) => <span className="text-xs text-muted-foreground">{format(new Date(s.subscribedAt ?? s.createdAt), 'dd MMM yyyy')}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (s: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => toggleActive(s.id, s.isActive)}>
            {s.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} className="text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => del(s.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Newsletter Subscribers" description="Manage email newsletter subscribers" />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search subscribers…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!activeFilter} onClear={clearFilters}>
          <FilterSelect value={activeFilter} onChange={handleActiveFilter} options={STATUS_OPTIONS} placeholder="Status" />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={subscribers} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>
    </>
  );
}
