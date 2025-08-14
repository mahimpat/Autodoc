'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header';
import OutlineList from '../../../components/OutlineList';
import EditorPanel from '../../../components/EditorPanel';
import EvidencePanel from '../../../components/EvidencePanel';
import StatusBar from '../../../components/StatusBar';
import ResizableShell from '../../../components/ResizableShell';
import SourcesPanel from '../../../components/SourcesPanel';
import PaywallModal from '../../../components/PaywallModal';
import { useDocStore } from '../../../store/useDocStore';
import { API_BASE, api } from '../../../lib/api';
import { SSEStream } from '../../../lib/sse';

export default function DocStudio() {
  const params = useParams();
  const id = Number(params?.id);
  const { outline, setOutline, setActiveIndex } = useDocStore();
  const [model, setModel] = useState('mistral:7b');
  const [system, setSystem] = useState('');
  const [live, setLive] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const streamRef = useRef<SSEStream | null>(null);

  useEffect(()=>{
    (async ()=>{
      try {
        const d = await api<any>(`/documents/${id}`);
        if (d?.content) setOutline(d.content);
        else setOutline({ title: d.title, mode: d.template, sections: [{heading:'Introduction', content:''},{heading:'Method', content:''},{heading:'Conclusion', content:''}] });
      } catch {
        setOutline({ title: 'Untitled', mode: 'Document', sections: [{heading:'Introduction', content:''},{heading:'Method', content:''},{heading:'Conclusion', content:''}] });
      }
    })();
  }, [id, setOutline]);

  const startRegen = (index: number) => {
    if (!id) return;
    setActiveIndex(index);
    const url = new URL(`${API_BASE}/documents/${id}/stream_regen`);
    url.searchParams.set('index', String(index));
    url.searchParams.set('model', model);
    if (system) url.searchParams.set('system', system);
    const stream = new SSEStream(url.toString(), (ev) => {
      if (ev.event === 'section_begin') setLive(true);
      if (ev.event === 'cite') {
        useDocStore.getState().addCitation(index, ev.snippet_id);
      } else if (ev.event === 'payment_required') {
        setPaywall(true);
        stream.stop();
        setLive(false);
      } else if (ev.event === 'token') {
        useDocStore.getState().updateSection(index, { content: ((useDocStore.getState().outline?.sections[index].content)||'') + ev.text });
      }
      if (ev.event === 'section_end' || ev.event === 'done') {
        setLive(false);
      }
    });
    streamRef.current = stream;
    stream.start();
  };

  const cancel = () => {
    streamRef.current?.stop();
    setLive(false);
  };

  return (
    <div className="min-h-screen relative">
      <div className="aurora" />
      <Header />
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <ResizableShell
          left={
            <div>
              <div className="mb-4"><StatusBar live={live} /></div>
              <SourcesPanel />
              <div className="card p-3">
                <h2 className="font-semibold mb-2">Outline</h2>
                <OutlineList />
                <div className="mt-3 flex items-center gap-2">
                  <select className="input" value={model} onChange={e=>setModel(e.target.value)}>
                    <option>mistral:7b</option>
                    <option>llama3:instruct</option>
                  </select>
                </div>
                <div className="mt-2"><input className="input w-full" placeholder="System prompt (optional)" value={system} onChange={e=>setSystem(e.target.value)} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn btn-primary" onClick={()=>startRegen(0)}>Regen current</button>
                  <button className="btn" onClick={cancel}>Cancel</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a className="btn" href={`${API_BASE}/documents/${id}.md`} target="_blank">Export MD</a>
                  <a className="btn" href={`${API_BASE}/documents/${id}.pdf`} target="_blank">Export PDF</a>
                </div>
              </div>
            </div>
          }
          center={<div className="card p-4 h-full"><EditorPanel /></div>}
          right={<div className="card p-4 h-full overflow-auto"><h2 className="font-semibold mb-2">Evidence</h2><EvidencePanel /></div>}
        />
      </main>
      <PaywallModal open={paywall} onClose={()=>setPaywall(false)} />
    </div>
  );
}
