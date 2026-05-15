'use client';
import { Search, X } from 'lucide-react';

const SELECT_CLS =
  'rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30';

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  total?: number;
  loading?: boolean;
  hasFilters?: boolean;
  onClear?: () => void;
  children?: React.ReactNode;
}

export function FilterBar({
  search, onSearchChange, placeholder = 'Search…',
  total, loading, hasFilters, onClear, children,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="relative min-w-[200px] flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={placeholder}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
        />
      </div>
      {children}
      {hasFilters && onClear && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={12} /> Clear
        </button>
      )}
      {!loading && total !== undefined && (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {total.toLocaleString()} result{total !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={SELECT_CLS}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
