'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'BULK_DELETE', label: 'Bulk Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'Product', label: 'Product' },
  { value: 'Category', label: 'Category' },
  { value: 'Brand', label: 'Brand' },
  { value: 'Banner', label: 'Banner' },
  { value: 'Coupon', label: 'Coupon' },
  { value: 'Order', label: 'Order' },
  { value: 'Review', label: 'Review' },
  { value: 'Blog', label: 'Blog' },
  { value: 'BlogCategory', label: 'Blog Category' },
  { value: 'Tag', label: 'Tag' },
  { value: 'StaticPage', label: 'Static Page' },
  { value: 'User', label: 'User' },
];

const actionBadge = (action: string) => {
  const map: Record<string, any> = {
    CREATE: 'success', UPDATE: 'info', DELETE: 'danger', BULK_DELETE: 'danger',
    LOGIN: 'purple', LOGOUT: 'default',
  };
  return <Badge variant={map[action] ?? 'default'}>{action.replace('_', ' ')}</Badge>;
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const load = async (p: number, search: string, action: string, entity: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (action) q.set('action', action);
    if (entity) q.set('entity', entity);
    const res = await fetch(`/api/activity-logs?${q}`);
    const data = await res.json();
    setLogs(data.data?.logs ?? []);
    setTotal(data.data?.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(1, '', '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, actionFilter, entityFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, actionFilter, entityFilter); };
  const handleActionFilter = (v: string) => { setActionFilter(v); setPage(1); load(1, debouncedSearch, v, entityFilter); };
  const handleEntityFilter = (v: string) => { setEntityFilter(v); setPage(1); load(1, debouncedSearch, actionFilter, v); };
  const clearFilters = () => { setRawSearch(''); setActionFilter(''); setEntityFilter(''); setPage(1); load(1, '', '', ''); };

  const columns = [
    { key: 'action', header: 'Action', render: (l: any) => actionBadge(l.action) },
    { key: 'entity', header: 'Entity', render: (l: any) => <span className="text-sm font-medium">{l.entity}</span> },
    { key: 'entityId', header: 'Entity ID', render: (l: any) => l.entityId ? <code className="text-xs text-muted-foreground">{l.entityId.slice(0, 8)}…</code> : '—' },
    {
      key: 'user', header: 'User',
      render: (l: any) => l.user
        ? <div><p className="text-sm font-medium">{l.user.name}</p><p className="text-xs text-muted-foreground">{l.user.email}</p></div>
        : <span className="text-xs text-muted-foreground">System</span>,
    },
    { key: 'ipAddress', header: 'IP', render: (l: any) => <span className="text-xs text-muted-foreground font-mono">{l.ipAddress ?? '—'}</span> },
    {
      key: 'metadata', header: 'Details',
      render: (l: any) => l.metadata
        ? <code className="text-xs text-muted-foreground truncate max-w-xs block">{JSON.stringify(l.metadata).slice(0, 60)}</code>
        : '—',
    },
    { key: 'createdAt', header: 'Time', render: (l: any) => <span className="text-xs text-muted-foreground">{format(new Date(l.createdAt), 'dd MMM yyyy, HH:mm')}</span> },
  ];

  return (
    <>
      <PageHeader title="Activity Logs" description="Track all admin actions and events" />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search logs…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!actionFilter || !!entityFilter} onClear={clearFilters}>
          <FilterSelect value={actionFilter} onChange={handleActionFilter} options={ACTION_OPTIONS} placeholder="Action" />
          <FilterSelect value={entityFilter} onChange={handleEntityFilter} options={ENTITY_OPTIONS} placeholder="Entity" />
        </FilterBar>

        <DataTable columns={columns} data={logs} total={total} page={page} onPageChange={handlePage} loading={loading} />
      </div>
    </>
  );
}
