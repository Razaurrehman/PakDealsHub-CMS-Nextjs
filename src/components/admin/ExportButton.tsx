'use client';
import { useRef, useState, useEffect } from 'react';
import { Download, ChevronDown, FileText, Sheet } from 'lucide-react';

type Props = {
  entity: string;
  params?: Record<string, string>;
};

export function ExportButton({ entity, params = {} }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const download = (format: 'csv' | 'xlsx') => {
    setOpen(false);
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const q = new URLSearchParams({ entity, format, ...filtered });
    window.open(`/api/export?${q}`, '_blank');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Download as
          </div>
          <button
            type="button"
            onClick={() => download('csv')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <FileText size={14} className="text-green-600" />
            CSV (.csv)
          </button>
          <button
            type="button"
            onClick={() => download('xlsx')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Sheet size={14} className="text-emerald-600" />
            Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  );
}
