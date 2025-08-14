'use client';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { API_BASE } from '../lib/api';

type Uploaded = { name: string, size: number, status: 'queued'|'uploading'|'done'|'error' };

export default function SourcesPanel() {
  const [items, setItems] = useState<Uploaded[]>([]);
  const onDrop = useCallback(async (files: File[]) => {
    const next = files.map(f => ({ name: f.name, size: f.size, status: 'queued' as const }));
    setItems(prev => [...next, ...prev]);
    for (const f of files) {
      const form = new FormData();
      form.append('file', f);
      const rec = { name: f.name, size: f.size, status: 'uploading' as const };
      setItems(prev => [rec, ...prev.filter(x => !(x.name===f.name && x.size===f.size))]);
      try {
        const r = await fetch(`${API_BASE}/ingest/upload`, { method:'POST', body: form, credentials:'include' });
        if (!r.ok) throw new Error(String(r.status));
        setItems(prev => [{ name:f.name, size:f.size, status:'done' }, ...prev.filter(x => !(x.name===f.name && x.size===f.size))]);
      } catch (e) {
        setItems(prev => [{ name:f.name, size:f.size, status:'error' }, ...prev.filter(x => !(x.name===f.name && x.size===f.size))]);
      }
    }
  }, []);
  const {getRootProps, getInputProps, isDragActive} = useDropzone({ onDrop });

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-semibold mb-2">Sources</h3>
      <div {...getRootProps()} className={`p-4 rounded-xl border border-dashed ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5'}`}>
        <input id="file-input" {...getInputProps()} />
        <p className="text-sm text-gray-600 dark:text-gray-400">Drag & drop files here, or click to select</p>
      </div>
      <ul className="mt-3 space-y-2 max-h-40 overflow-auto">
        {items.map((it,i)=>(
          <li key={`${it.name}-${i}`} className="text-sm flex items-center justify-between gap-2">
            <span className="truncate">{it.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${it.status==='done'?'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200': it.status==='uploading'?'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200': it.status==='error'?'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200':'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}`}>{it.status}</span>
          </li>
        ))}
        {items.length===0 && <li className="text-xs text-gray-500">No files uploaded yet.</li>}
      </ul>
    </div>
  );
}
