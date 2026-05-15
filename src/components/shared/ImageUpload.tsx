'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      onChange(data.url);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxSize: 8 * 1024 * 1024, maxFiles: 1,
  });

  const applyUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed) { onChange(trimmed); setUrlInput(''); }
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}

      {value ? (
        <div className="relative w-full max-w-xs">
          <img src={value} alt="preview" className="h-32 w-full rounded-lg object-cover border border-border" />
          <button type="button" onClick={() => onChange('')}
            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600">
            <X size={12} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex rounded-lg border border-border overflow-hidden w-fit mb-1">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Upload size={12} /> Upload
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Link size={12} /> URL
            </button>
          </div>

          {mode === 'upload' ? (
            <div {...getRootProps()} className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
              isDragActive ? 'border-blue-500 bg-blue-50/50' : 'border-border hover:border-blue-500 hover:bg-muted/50',
            )}>
              <input {...getInputProps()} />
              {uploading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              ) : (
                <>
                  <Upload size={20} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{isDragActive ? 'Drop here' : 'Drag & drop or click to upload'}</p>
                  <p className="text-xs text-muted-foreground/60">PNG, JPG, WebP up to 8MB</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyUrl())}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={applyUrl}
                  disabled={!urlInput.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
              {urlInput.trim() && (
                <img src={urlInput.trim()} alt="preview" className="h-24 w-full max-w-xs rounded-lg object-cover border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxFiles?: number;
}

export function MultiImageUpload({ value, onChange, label, maxFiles = 10 }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.ok) uploaded.push(data.url);
    }
    onChange([...value, ...uploaded]);
    setUploading(false);
  }, [value, onChange]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxSize: 8 * 1024 * 1024,
  });

  const applyUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && value.length < maxFiles) {
      onChange([...value, trimmed]);
      setUrlInput('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}

      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-border" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white">
              <X size={10} />
            </button>
          </div>
        ))}

        {mode === 'upload' && value.length < maxFiles && (
          <div {...getRootProps()} className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-blue-500 transition-colors">
            <input {...getInputProps()} />
            {uploading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              : <ImageIcon size={20} className="text-muted-foreground" />
            }
          </div>
        )}
      </div>

      {value.length < maxFiles && (
        <>
          <div className="flex rounded-lg border border-border overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Upload size={12} /> Upload
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Link size={12} /> URL
            </button>
          </div>

          {mode === 'url' && (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyUrl())}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={applyUrl}
                disabled={!urlInput.trim()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
