'use client';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T extends { id: string }>({
  columns, data, total = 0, page = 1, onPageChange,
  pageSize = 20, loading, emptyMessage = 'No records found',
  selectable, selectedIds = [], onSelectionChange,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const allSelected = data.length > 0 && data.every(r => selectedIds.includes(r.id));
  const someSelected = data.some(r => selectedIds.includes(r.id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedIds.filter(id => !data.some(r => r.id === id)));
    } else {
      const newIds = data.map(r => r.id).filter(id => !selectedIds.includes(id));
      onSelectionChange([...selectedIds, ...newIds]);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border accent-blue-600 cursor-pointer"
                  />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} className={cn('px-4 py-3 text-left font-medium text-muted-foreground', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
            ) : (
              data.map(row => (
                <tr
                  key={row.id}
                  className={cn('border-b border-border/50 hover:bg-muted/30 transition-colors', selectable && selectedIds.includes(row.id) && 'bg-blue-50/50 dark:bg-blue-900/10')}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="h-4 w-4 rounded border-border accent-blue-600 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-foreground/80', col.className)}>
                      {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <Button key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => onPageChange(p)}>{p}</Button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}><ChevronRight size={14} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
