'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';

type UserForm = z.infer<typeof userSchema>;

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
];

const roleBadge = (role: string) => {
  const map: Record<string, any> = {
    SUPER_ADMIN: 'danger', ADMIN: 'purple', EDITOR: 'info', VIEWER: 'default',
  };
  return <Badge variant={map[role] ?? 'default'}>{role.replace('_', ' ')}</Badge>;
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserForm>({ resolver: zodResolver(userSchema) as any });

  const load = async (p: number, search: string, role: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (role) q.set('role', role);
    const res = await fetch(`/api/users?${q}`);
    const data = await res.json();
    setUsers(data.data?.users ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, roleFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, roleFilter); };
  const handleRoleFilter = (v: string) => { setRoleFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters = () => { setRawSearch(''); setRoleFilter(''); setPage(1); load(1, '', ''); };

  const openCreate = () => { reset({ name: '', email: '', role: 'EDITOR', isActive: true }); setEditing(null); setOpen(true); };
  const openEdit = (u: any) => { reset({ name: u.name, email: u.email, role: u.role, isActive: u.isActive }); setEditing(u); setOpen(true); };

  const onSubmit = async (data: UserForm) => {
    const url = editing ? `/api/users/${editing.id}` : '/api/users';
    const payload = editing ? { ...data, password: data.password || undefined } : data;
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'User updated' : 'User created', 'success');
    setOpen(false); load(page, debouncedSearch, roleFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, roleFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} user(s)?`)) return;
    setDeleting(true);
    await Promise.all(selectedIds.map(id => fetch(`/api/users/${id}`, { method: 'DELETE' })));
    setDeleting(false);
    toast(`Deleted ${selectedIds.length} user(s)`, 'success');
    load(page, debouncedSearch, roleFilter);
  };

  const columns = [
    {
      key: 'avatar', header: '', className: 'w-10',
      render: (u: any) => u.avatar
        ? <img src={u.avatar} className="h-8 w-8 rounded-full object-cover" />
        : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><User size={14} className="text-muted-foreground" /></div>,
    },
    {
      key: 'name', header: 'User',
      render: (u: any) => (
        <div>
          <p className="font-medium text-sm">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u: any) => roleBadge(u.role) },
    { key: 'isActive', header: 'Active', render: (u: any) => <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Yes' : 'No'}</Badge> },
    { key: 'createdAt', header: 'Joined', render: (u: any) => <span className="text-xs text-muted-foreground">{format(new Date(u.createdAt), 'dd MMM yyyy')}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (u: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(u.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Users" description="Manage CMS admin users" action={{ label: 'Add User', onClick: openCreate }} />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search users…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!roleFilter} onClear={clearFilters}>
          <FilterSelect value={roleFilter} onChange={handleRoleFilter} options={ROLE_OPTIONS} placeholder="Role" />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={users} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit User' : 'Add User'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" error={errors.name?.message} {...register('name')} />
            <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <Input
            label={editing ? 'New Password (leave blank to keep)' : 'Password *'}
            type="password" placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <select {...register('role')} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
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
