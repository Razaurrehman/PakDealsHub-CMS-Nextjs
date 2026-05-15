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
import { Eye, Package } from 'lucide-react';
import { formatPKR } from '@/lib/utils';
import { format } from 'date-fns';

const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Payment' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const orderStatusBadge = (s: string) => {
  const map: Record<string, any> = {
    PENDING: 'warning', CONFIRMED: 'info', PROCESSING: 'info',
    SHIPPED: 'purple', DELIVERED: 'success', CANCELLED: 'danger', REFUNDED: 'default',
  };
  return <Badge variant={map[s] ?? 'default'}>{s}</Badge>;
};

const paymentBadge = (s: string) => {
  const map: Record<string, any> = { PAID: 'success', PENDING: 'warning', FAILED: 'danger', REFUNDED: 'default' };
  return <Badge variant={map[s] ?? 'default'}>{s}</Badge>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any>(null);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const load = async (p: number, search: string, status: string, payment: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (payment) q.set('paymentStatus', payment);
    const res = await fetch(`/api/orders?${q}`);
    const data = await res.json();
    setOrders(data.data?.orders ?? []);
    setTotal(data.data?.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(1, '', '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, statusFilter, paymentFilter);
  }, [debouncedSearch]);

  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, statusFilter, paymentFilter); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); load(1, debouncedSearch, v, paymentFilter); };
  const handlePaymentFilter = (v: string) => { setPaymentFilter(v); setPage(1); load(1, debouncedSearch, statusFilter, v); };
  const clearFilters = () => { setRawSearch(''); setStatusFilter(''); setPaymentFilter(''); setPage(1); load(1, '', '', ''); };

  const openStatusEdit = (o: any) => {
    setEditingStatus(o);
    setNewStatus(o.status);
    setNewPaymentStatus(o.paymentStatus);
  };

  const updateStatus = async () => {
    if (!editingStatus) return;
    setUpdatingStatus(true);
    const res = await fetch(`/api/orders/${editingStatus.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, paymentStatus: newPaymentStatus }),
    });
    const json = await res.json();
    setUpdatingStatus(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast('Order updated', 'success');
    setEditingStatus(null);
    load(page, debouncedSearch, statusFilter, paymentFilter);
  };

  const columns = [
    { key: 'orderNumber', header: 'Order #', render: (o: any) => <code className="text-xs font-mono font-semibold">{o.orderNumber}</code> },
    {
      key: 'customer', header: 'Customer',
      render: (o: any) => (
        <div>
          <p className="font-medium text-sm">{o.customerName}</p>
          <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'total', header: 'Total',
      render: (o: any) => <span className="font-semibold">{formatPKR(o.totalAmount)}</span>,
    },
    { key: 'status', header: 'Status', render: (o: any) => orderStatusBadge(o.status) },
    { key: 'paymentStatus', header: 'Payment', render: (o: any) => paymentBadge(o.paymentStatus) },
    { key: 'items', header: 'Items', render: (o: any) => <span className="text-sm text-muted-foreground">{o._count?.items ?? o.items?.length ?? 0}</span> },
    { key: 'createdAt', header: 'Date', render: (o: any) => <span className="text-xs text-muted-foreground">{format(new Date(o.createdAt), 'dd MMM yyyy')}</span> },
    {
      key: 'actions', header: '', className: 'w-24',
      render: (o: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewing(o)}><Eye size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => openStatusEdit(o)}><Package size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Orders" description="View and manage customer orders">
        <ExportButton entity="orders" />
      </PageHeader>

      <div className="space-y-4">
        <FilterBar search={rawSearch} onSearchChange={setRawSearch} placeholder="Search order # or customer…"
          total={total} loading={loading} hasFilters={!!rawSearch || !!statusFilter || !!paymentFilter} onClear={clearFilters}>
          <FilterSelect value={statusFilter} onChange={handleStatusFilter} options={ORDER_STATUS_OPTIONS} placeholder="Order Status" />
          <FilterSelect value={paymentFilter} onChange={handlePaymentFilter} options={PAYMENT_STATUS_OPTIONS} placeholder="Payment" />
        </FilterBar>

        <DataTable columns={columns} data={orders} total={total} page={page} onPageChange={handlePage} loading={loading} />
      </div>

      {/* View Order Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Order ${viewing?.orderNumber ?? ''}`} size="xl">
        {viewing && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer</h3>
                <p className="font-medium">{viewing.customerName}</p>
                <p className="text-sm text-muted-foreground">{viewing.customerEmail}</p>
                <p className="text-sm text-muted-foreground">{viewing.customerPhone}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipping Address</h3>
                <p className="text-sm">{viewing.shippingAddress}</p>
                <p className="text-sm">{viewing.city}, {viewing.state}</p>
                <p className="text-sm">{viewing.postalCode}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Items</h3>
              <div className="rounded-lg border border-border divide-y divide-border">
                {(viewing.items ?? []).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 p-3">
                    {item.product?.images?.[0] && (
                      <img src={item.product.images[0]} className="h-12 w-12 rounded object-contain border border-border p-0.5 bg-white" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{formatPKR(item.price)}</p>
                      <p className="text-muted-foreground">× {item.quantity}</p>
                    </div>
                    <div className="text-right text-sm font-semibold w-24">{formatPKR(item.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPKR(viewing.subtotal)}</span></div>
              {viewing.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatPKR(viewing.discount)}</span></div>}
              {viewing.shippingCost > 0 && <div className="flex justify-between text-sm"><span>Shipping</span><span>{formatPKR(viewing.shippingCost)}</span></div>}
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2"><span>Total</span><span>{formatPKR(viewing.totalAmount)}</span></div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Status:</span>{orderStatusBadge(viewing.status)}</div>
              <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Payment:</span>{paymentBadge(viewing.paymentStatus)}</div>
              {viewing.coupon && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Coupon:</span><code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{viewing.coupon.code}</code></div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal open={!!editingStatus} onClose={() => setEditingStatus(null)} title="Update Order Status" size="sm">
        {editingStatus && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Order Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                {ORDER_STATUS_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Payment Status</label>
              <select value={newPaymentStatus} onChange={e => setNewPaymentStatus(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                {PAYMENT_STATUS_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditingStatus(null)}>Cancel</Button>
              <Button loading={updatingStatus} onClick={updateStatus}>Update</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
