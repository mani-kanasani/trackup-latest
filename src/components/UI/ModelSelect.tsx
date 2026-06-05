import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

// A styled, scrollable combobox: shows every option, filters as you type, and
// still allows a free-text model id. Replaces the native <datalist> (which only
// surfaces a handful of options).
export const ModelSelect: React.FC<ModelSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const isExact = options.includes(value);
  const filtered =
    isExact || !value ? options : options.filter((o) => o.toLowerCase().includes(value.toLowerCase()));
  const list = filtered.length ? filtered : options;

  return (
    <div className="relative" ref={ref}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="input-modern pr-10 font-mono text-sm"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label="Toggle model list"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
          <div className="flex items-center px-3 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
            <Search className="w-3.5 h-3.5 mr-2" />
            {list.length} model{list.length === 1 ? '' : 's'} — type to filter
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {list.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                  o === value
                    ? 'bg-upwork-50 dark:bg-upwork-900/20 text-upwork-700 dark:text-upwork-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
              >
                <span className="truncate">{o}</span>
                {o === value && <Check className="w-4 h-4 flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
