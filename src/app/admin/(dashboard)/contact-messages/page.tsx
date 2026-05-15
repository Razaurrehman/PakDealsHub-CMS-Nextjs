'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Eye, Trash2, Mail } from 'lucide-react';
import { format } from 'date-fns';

const READ_OPTIONS = [
  { value: '', label: 'All Messages' },
  { value: 'false', label: 'Unread' },
  { value: 'true', label: 'Read' },
];

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [readFilter, setReadFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const load = async (p: number, search: string, isRead: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (isRead !== '') q.set('isRead', isRead);
    const res = await fetch(`/api/contact-messages?${q}`);
    const data = await res.json();
    setMessages(data.data?.messages ?? []);
    setTotal(data.data?.total ?? 0);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, readFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, readFilter); };
  const handleReadFilter = (v: string) => { setReadFilter(v); setPage(1); load(1, debouncedSearch, v); };
  const clearFilters = () => { setRawSearch(''); setReadFilter(''); setPage(1); load(1, '', ''); };

  const openView = async (m: any) => {
    setViewing(m);
    if (!m.isRead) {
      await fetch(`/api/contact-messages/${m.id}`, { method: 'GET' });
      load(page, debouncedSearch, readFilter);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await fetch(`/api/contact-messages/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, readFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} message(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/contact-messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} message(s)`, 'success');
    load(page, debouncedSearch, readFilter);
  };

  const columns = [
    {
      key: 'read', header: '', className: 'w-8',
      render: (m: any) => !m.isRead ? <div className="w-2 h-2 rounded-full bg-blue-500 ml-1" /> : null,
    },
    {
      key: 'sender', header: 'Sender',
      render: (m: any) => (
        <div>
          <p className={`text-sm ${!m.isRead ? 'font-semibold' : 'font-medium'}`}>{m.name}</p>
          <p className="text-xs text-muted-foreground">{m.email}</p>
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', render: (m: any) => <p className={`text-sm truncate max-w-xs ${!m.isRead ? 'font-semibold' : ''}`}>{m.subject ?? '(no subject)'}</p> },
    {
      key: 'message', header: 'Preview',
      render: (m: any) => <p className="text-xs text-muted-foreground truncate max-w-sm">{m.message}</p>,
    },
    { key: 'status', header: 'Status', render: (m: any) => <Badge variant={m.isRead ? 'default' : 'info'}>{m.isRead ? 'Read' : 'Unread'}</Badge> },
    { key: 'createdAt', header: 'Received', render: (m: any) => <span className="text-xs text-muted-foreground">{format(new Date(m.createdAt), 'dd MMM yyyy')}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (m: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openView(m)}><Eye size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(m.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Contact Messages" description="View customer enquiries and messages" />

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search messages…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!readFilter} onClear={clearFilters}>
          <FilterSelect value={readFilter} onChange={handleReadFilter} options={READ_OPTIONS} placeholder="Status" />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}><Trash2 size={13} /> Delete selected</Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={messages} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Message Detail" size="md">
        {viewing && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">{viewing.name}</p>
                <a href={`mailto:${viewing.email}`} className="text-sm text-blue-600 hover:underline">{viewing.email}</a>
                {viewing.phone && <p className="text-sm text-muted-foreground">{viewing.phone}</p>}
              </div>
              <div className="ml-auto text-xs text-muted-foreground">{format(new Date(viewing.createdAt), 'dd MMM yyyy, HH:mm')}</div>
            </div>
            {viewing.subject && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Subject</p>
                <p className="font-medium">{viewing.subject}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Message</p>
              <div className="rounded-lg bg-muted/40 p-4 text-sm whitespace-pre-wrap">{viewing.message}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <a href={`mailto:${viewing.email}?subject=Re: ${viewing.subject ?? ''}`} className="inline-flex">
                <Button variant="secondary"><Mail size={14} /> Reply</Button>
              </a>
              <Button variant="danger" onClick={() => { del(viewing.id); setViewing(null); }}><Trash2 size={14} /> Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
