'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2, UserCheck, UserX, Users, ShieldOff, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'All Customers' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Blocked' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [editOpen, setEditOpen]   = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [editName, setEditName]   = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving]       = useState(false);
  const [blockTarget, setBlockTarget] = useState<any>(null);

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);
  const { toast } = useToast();

  const load = async (p: number, search: string, status: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (status !== '') q.set('isActive', status);
    const res  = await fetch(`/api/customers?${q}`);
    const data = await res.json();
    setCustomers(data.data?.customers ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, statusFilter);
  }, [debouncedSearch]);

  const handlePage         = (p: number) => { setPage(p); load(p, debouncedSearch, statusFilter); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters       = () => { setRawSearch(''); setStatusFilter(''); setPage(1); load(1, '', ''); };

  const openEdit = (c: any) => {
    setEditing(c); setEditName(c.name); setEditPhone(c.phone ?? ''); setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const res  = await fetch(`/api/customers/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.ok) { toast(json.error ?? 'Error saving', 'error'); return; }
    toast('Customer updated', 'success');
    setEditOpen(false);
    load(page, debouncedSearch, statusFilter);
  };

  const confirmBlock = (c: any) => setBlockTarget(c);

  const executeToggleBlock = async () => {
    if (!blockTarget) return;
    const willBlock = blockTarget.isActive;
    const res = await fetch(`/api/customers/${blockTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !blockTarget.isActive }),
    });
    const json = await res.json();
    setBlockTarget(null);
    if (!json.ok) { toast('Failed to update', 'error'); return; }
    toast(`Customer ${willBlock ? 'blocked' : 'unblocked'} successfully`, willBlock ? 'error' : 'success');
    load(page, debouncedSearch, statusFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    const res  = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.ok) { toast('Failed to delete', 'error'); return; }
    toast('Customer deleted', 'success');
    load(page, debouncedSearch, statusFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.length} customer(s)?`)) return;
    setDeleting(true);
    await Promise.all(selectedIds.map(id => fetch(`/api/customers/${id}`, { method: 'DELETE' })));
    setDeleting(false);
    toast(`Deleted ${selectedIds.length} customer(s)`, 'success');
    load(page, debouncedSearch, statusFilter);
  };

  const columns = [
    {
      key: 'avatar', header: '', className: 'w-10',
      render: (c: any) => (
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
          {c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      ),
    },
    {
      key: 'name', header: 'Customer',
      render: (c: any) => (
        <div>
          <p className="font-medium text-sm">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Phone',
      render: (c: any) => (
        <span className="text-sm text-muted-foreground">{c.phone || '—'}</span>
      ),
    },
    {
      key: 'isActive', header: 'Status',
      render: (c: any) => (
        <Badge variant={c.isActive ? 'success' : 'danger'}>
          {c.isActive ? 'Active' : 'Blocked'}
        </Badge>
      ),
    },
    {
      key: 'createdAt', header: 'Joined',
      render: (c: any) => (
        <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions', header: '', className: 'w-28',
      render: (c: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => confirmBlock(c)}
            title={c.isActive ? 'Block customer' : 'Unblock customer'}>
            {c.isActive
              ? <ShieldOff size={14} className="text-red-500" />
              : <ShieldCheck size={14} className="text-green-500" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => del(c.id)} title="Delete">
            <Trash2 size={14} className="text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} registered customer${total !== 1 ? 's' : ''}`}
      />

      <div className="space-y-4">
        <FilterBar
          search={rawSearch}
          onSearchChange={setRawSearch}
          placeholder="Search by name, email or phone…"
          total={total}
          loading={loading}
          hasFilters={!!rawSearch || statusFilter !== ''}
          onClear={clearFilters}
        >
          <FilterSelect
            value={statusFilter}
            onChange={handleStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {selectedIds.length} selected
            </span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}>
              <Trash2 size={13} /> Delete selected
            </Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">
              Clear
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Active', value: customers.filter(c => c.isActive).length, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Blocked', value: customers.filter(c => !c.isActive).length, icon: ShieldOff, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label} customers</p>
              </div>
            </div>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={customers}
          total={total}
          page={page}
          onPageChange={handlePage}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Block / Unblock confirmation modal */}
      <Modal
        open={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        title={blockTarget?.isActive ? 'Block Customer' : 'Unblock Customer'}
        size="sm"
      >
        <div className="p-6 space-y-4">
          {blockTarget?.isActive ? (
            <div className="flex gap-3">
              <div className="mt-0.5 flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldOff size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{blockTarget?.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Blocking this customer will immediately prevent them from signing in or using the app.
                  Their account and data will be preserved.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="mt-0.5 flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ShieldCheck size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{blockTarget?.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Unblocking this customer will restore their full access to the app.
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setBlockTarget(null)}>Cancel</Button>
            <Button
              variant={blockTarget?.isActive ? 'danger' : 'primary'}
              onClick={executeToggleBlock}
            >
              {blockTarget?.isActive ? (
                <><ShieldOff size={14} /> Block Customer</>
              ) : (
                <><ShieldCheck size={14} /> Unblock Customer</>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer" size="md">
        <div className="p-6 space-y-4">
          <Input
            label="Full Name *"
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />
          <Input
            label="Phone"
            value={editPhone}
            onChange={e => setEditPhone(e.target.value)}
            placeholder="+92 300 0000000"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. To change email the customer must re-register.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} loading={saving}>Save changes</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
