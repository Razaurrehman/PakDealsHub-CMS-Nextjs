'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/lib/validations';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { FilterBar, FilterSelect } from '@/components/admin/FilterBar';
import { ExportButton } from '@/components/admin/ExportButton';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { MultiImageUpload, ImageUpload } from '@/components/shared/ImageUpload';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2 } from 'lucide-react';
import { formatPKR } from '@/lib/utils';

type ProductForm = z.infer<typeof productSchema>;

const statusVariant: any = {
  ACTIVE: 'success', DRAFT: 'default', OUT_OF_STOCK: 'warning', DISCONTINUED: 'danger',
};

function parseTagInput(val: string): string[] {
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [colorsInput, setColorsInput] = useState('');
  const [storagesInput, setStoragesInput] = useState('');
  const { toast } = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(rawSearch);
  const skipFirst = useRef(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProductForm>({ resolver: zodResolver(productSchema) as any });

  const load = async (p: number, search: string, cat: string, brand: string, status: string) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (search) q.set('search', search);
    if (cat) q.set('categoryId', cat);
    if (brand) q.set('brandId', brand);
    if (status) q.set('status', status);
    const [pRes, cRes, bRes] = await Promise.all([fetch(`/api/products?${q}`), fetch('/api/categories'), fetch('/api/brands')]);
    const [pData, cData, bData] = await Promise.all([pRes.json(), cRes.json(), bRes.json()]);
    setProducts(pData.data?.items ?? []);
    setTotal(pData.data?.total ?? 0);
    setCategories(cData.data ?? []);
    setBrands(bData.data ?? []);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(1, '', '', '', ''); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    setPage(1); load(1, debouncedSearch, categoryFilter, brandFilter, statusFilter);
  }, [debouncedSearch]);

  const handleCat = (v: string) => { setCategoryFilter(v); setPage(1); load(1, debouncedSearch, v, brandFilter, statusFilter); };
  const handleBrand = (v: string) => { setBrandFilter(v); setPage(1); load(1, debouncedSearch, categoryFilter, v, statusFilter); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); load(1, debouncedSearch, categoryFilter, brandFilter, v); };
  const handlePage = (p: number) => { setPage(p); load(p, debouncedSearch, categoryFilter, brandFilter, statusFilter); };
  const clearFilters = () => { setRawSearch(''); setCategoryFilter(''); setBrandFilter(''); setStatusFilter(''); setPage(1); load(1, '', '', '', ''); };

  const openCreate = () => {
    reset({ name: '', price: 0, stock: 0, status: 'DRAFT', isFeatured: false, isNew: false, freeDelivery: false, images: [], colors: [], storages: [], tags: [] });
    setDescription(''); setImages([]); setColorsInput(''); setStoragesInput(''); setEditing(null); setOpen(true);
  };
  const openEdit = (p: any) => {
    reset({ ...p, categoryId: p.categoryId ?? '', brandId: p.brandId ?? '' });
    setDescription(p.description ?? '');
    setImages(p.images ?? []);
    setColorsInput((p.colors ?? []).join(', '));
    setStoragesInput((p.storages ?? []).join(', '));
    setEditing(p); setOpen(true);
  };

  const onSubmit = async (data: ProductForm) => {
    const payload = {
      ...data,
      description,
      images,
      thumbnail: images[0] ?? data.thumbnail ?? null,
      colors: parseTagInput(colorsInput),
      storages: parseTagInput(storagesInput),
    };
    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(editing ? 'Product updated' : 'Product created', 'success');
    setOpen(false); load(page, debouncedSearch, categoryFilter, brandFilter, statusFilter);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    toast('Deleted', 'success'); load(page, debouncedSearch, categoryFilter, brandFilter, statusFilter);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} product(s)?`)) return;
    setDeleting(true);
    const res = await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await res.json();
    setDeleting(false);
    if (!json.ok) { toast(json.error ?? 'Error', 'error'); return; }
    toast(`Deleted ${json.data.deleted} product(s)`, 'success');
    load(page, debouncedSearch, categoryFilter, brandFilter, statusFilter);
  };

  const columns = [
    {
      key: 'thumbnail', header: '', className: 'w-12',
      render: (p: any) => p.thumbnail
        ? <img src={p.thumbnail} className="h-9 w-9 rounded object-cover border border-border" />
        : <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">N/A</div>,
    },
    {
      key: 'name', header: 'Product',
      render: (p: any) => (
        <div>
          <p className="font-medium text-foreground line-clamp-1">{p.name}</p>
          {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
        </div>
      ),
    },
    { key: 'brand', header: 'Brand', render: (p: any) => p.brand?.name ?? '—' },
    { key: 'category', header: 'Category', render: (p: any) => p.category?.name ?? '—' },
    {
      key: 'price', header: 'Price',
      render: (p: any) => (
        <div>
          <p className="font-medium">{formatPKR(p.price)}</p>
          {p.comparePrice && p.comparePrice > p.price && (
            <p className="text-xs text-red-500 line-through">{formatPKR(p.comparePrice)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock', header: 'Stock',
      render: (p: any) => (
        <span className={p.stock === 0 ? 'text-red-500 font-medium' : p.stock <= 5 ? 'text-orange-500 font-medium' : ''}>
          {p.stock}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (p: any) => <Badge variant={statusVariant[p.status]}>{p.status}</Badge> },
    {
      key: 'isFeatured', header: 'Featured',
      render: (p: any) => p.isFeatured ? <Badge variant="info">Featured</Badge> : '—',
    },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (p: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => del(p.id)}><Trash2 size={14} className="text-red-400" /></Button>
        </div>
      ),
    },
  ];

  const hasFilters = !!rawSearch || !!categoryFilter || !!brandFilter || !!statusFilter;

  return (
    <>
      <PageHeader title="Products" description="Manage your product catalogue" action={{ label: 'Add Product', onClick: openCreate }}>
        <ExportButton entity="products" params={{ search: debouncedSearch, categoryId: categoryFilter, brandId: brandFilter, status: statusFilter }} />
      </PageHeader>

      <div className="space-y-4">
        <FilterBar
          search={rawSearch} onSearchChange={setRawSearch} placeholder="Search products…"
          total={total} loading={loading} hasFilters={hasFilters} onClear={clearFilters}
        >
          <FilterSelect value={categoryFilter} onChange={handleCat} placeholder="All Categories"
            options={categories.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={brandFilter} onChange={handleBrand} placeholder="All Brands"
            options={brands.map(b => ({ value: b.id, label: b.name }))} />
          <FilterSelect value={statusFilter} onChange={handleStatus} placeholder="All Statuses"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
              { value: 'DISCONTINUED', label: 'Discontinued' },
            ]} />
        </FilterBar>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-2.5">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{selectedIds.length} selected</span>
            <Button variant="danger" size="sm" loading={deleting} onClick={bulkDelete}>
              <Trash2 size={13} /> Delete selected
            </Button>
            <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Clear</button>
          </div>
        )}

        <DataTable columns={columns} data={products} total={total} page={page} onPageChange={handlePage} loading={loading}
          selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Product' : 'Add Product'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Info</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Product Name *" error={errors.name?.message} {...register('name')} />
              <Input label="Slug (auto-generated)" {...register('slug')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="SKU" {...register('sku')} />
              <Select label="Category" options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="— None —"
                value={watch('categoryId') ?? ''} onChange={e => setValue('categoryId', e.target.value || null)} />
              <Select label="Brand" options={brands.map(b => ({ value: b.id, label: b.name }))} placeholder="— None —"
                value={watch('brandId') ?? ''} onChange={e => setValue('brandId', e.target.value || null)} />
            </div>
            <Textarea label="Short Description" rows={2} {...register('shortDesc')} />
          </div>

          {/* Pricing */}
          <div className="border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing (PKR)</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Price (Rs) *" type="number" step="1" error={errors.price?.message} {...register('price', { valueAsNumber: true })} />
              <Input label="Compare Price (Rs)" type="number" step="1" {...register('comparePrice', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} />
              <Input label="Cost Price (Rs)" type="number" step="1" {...register('costPrice', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} />
            </div>
          </div>

          {/* Inventory */}
          <div className="border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inventory</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Stock" type="number" step="1" {...register('stock', { valueAsNumber: true })} />
              <Input label="Low Stock Alert" type="number" step="1" {...register('lowStockAlert', { valueAsNumber: true })} />
              <Select label="Status" options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
                { value: 'DISCONTINUED', label: 'Discontinued' },
              ]} value={watch('status')} onChange={e => setValue('status', e.target.value as any)} />
            </div>
          </div>

          {/* Details */}
          <div className="border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Warranty" placeholder="e.g. 1 Year Samsung Warranty" {...register('warranty')} />
              <Input label="Delivery Days" type="number" {...register('deliveryDays', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Colors (comma-separated)" placeholder="Black, White, Gold" value={colorsInput} onChange={e => setColorsInput(e.target.value)} />
              <Input label="Storage Options (comma-separated)" placeholder="128GB, 256GB, 512GB" value={storagesInput} onChange={e => setStoragesInput(e.target.value)} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('isFeatured')} className="rounded accent-blue-600" />
                <span>Featured Product</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('isNew')} className="rounded accent-blue-600" />
                <span>New Arrival</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('freeDelivery')} className="rounded accent-blue-600" />
                <span>Free Delivery</span>
              </label>
            </div>
          </div>

          {/* Images */}
          <div className="border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Images</p>
            <MultiImageUpload value={images} onChange={setImages} label="Upload Images (first image = thumbnail)" maxFiles={8} />
          </div>

          {/* Description */}
          <div className="border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Description</p>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Write detailed product description..." />
          </div>

          {/* SEO */}
          <div className="border-t border-border pt-5 space-y-3">
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
