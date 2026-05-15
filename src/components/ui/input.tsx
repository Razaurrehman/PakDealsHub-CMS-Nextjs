'use client';
import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, type, showPasswordToggle, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputType = showPasswordToggle && type === 'password' ? (visible ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>}
        <div className="relative">
          <input
            ref={ref} id={id} type={inputType}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none',
              'border-border bg-background text-foreground placeholder-muted-foreground',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
              showPasswordToggle && type === 'password' && 'pr-10',
              className
            )}
            {...props}
          />
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>}
      <textarea
        ref={ref} id={id}
        className={cn(
          'rounded-lg border px-3 py-2 text-sm transition-colors outline-none resize-y min-h-[100px]',
          'border-border bg-background text-foreground placeholder-muted-foreground',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          error && 'border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
