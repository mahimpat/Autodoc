'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDocStore } from '../store/useDocStore';
import { API_BASE } from '../lib/api';
type Snip = { id:number; text:string; score:number; path?:string; pinned?:boolean };
export default function EvidencePanel() {
  const params = useParams();
  const docId = Number(params?.id);
  const outline = useDocStore(s => s.outline);
  const idx = useDocStore(s => s.activeIndex);
  const [snips, setSnips] = useState<Snip[]>([]);
  useEffect(()=>{
    const fetchSnips = async () => {
      if (!outline || idx==null) return;
      const section = outline.sections[idx];
      const q = encodeURIComponent(`${outline.title}\nSection: ${section.heading}\n${section.content||section.summary||''}`);
      const url = `${API_BASE}/snippets?doc_id=${docId}&section_query=${q}&topk=6`;
      try {
        const r = await fetch(url, { credentials:'include' });
        const data = await r.json();
        setSnips(data);
      } catch {}
    };
    fetchSnips();
  }, [docId, outline?.title, idx, outline?.sections[idx||0]?.heading, outline?.sections[idx||0]?.content]);
  const pin = async (sid:number) => {
    await fetch(`${API_BASE}/snippets/pin?doc_id=${docId}&section_index=${idx}&snippet_id=${sid}`, { method:'POST', credentials:'include' });
    setSnips(s=>s.map(x=>x.id===sid?{...x,pinned:true}:x));
  };
  const unpin = async (sid:number) => {
    await fetch(`${API_BASE}/snippets/pin?doc_id=${docId}&section_index=${idx}&snippet_id=${sid}`, { method:'DELETE', credentials:'include' });
    setSnips(s=>s.map(x=>x.id===sid?{...x,pinned:false}:x));
  };
  if (!outline || idx==null) return <div className="text-sm text-gray-500">Focus a section to see evidence.</div>;
  return (
    <div className="space-y-3">
      {snips.map(s => (
        <div key={s.id} className="p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
          <div className="text-xs text-gray-500 mb-1">score {s.score.toFixed(3)} {s.path ? `• ${s.path.split('/').pop()}` : ''}</div>
          <div className="text-sm whitespace-pre-wrap">{s.text.slice(0, 600)}{s.text.length>600?'…':''}</div>
          <div className="mt-1 text-right">
            {s.pinned ? (
              <button className="btn btn-ghost" onClick={()=>unpin(s.id)}>Unpin</button>
            ) : (
              <button className="btn btn-ghost" onClick={()=>pin(s.id)}>Pin</button>
            )}
          </div>
        </div>
      ))}
      {snips.length===0 && <div className="text-sm text-gray-500">No snippets yet — upload sources or adjust your query.</div>}
    </div>
  );
}
