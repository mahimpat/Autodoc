'use client';
import { useDocStore } from '../store/useDocStore';
import ReactMarkdown from 'react-markdown';
import { useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

function insertCites(text: string, cites: number[]): string {
  if (!text || !cites?.length) return text;
  const parts = text.split(/(\.|\?|!)(\s+)/);
  if (parts.length < 3) return text + cites.map((_,i)=>`<sup>[${i+1}]</sup>`).join('');
  let citeIdx = 0;
  for (let i=0; i<parts.length-2 && citeIdx<cites.length; i+=3) {
    parts[i] = parts[i] + parts[i+1] + `<sup>[${citeIdx+1}]</sup>` + parts[i+2];
    parts[i+1] = '';
    parts[i+2] = '';
    citeIdx++;
  }
  return parts.join('');
}

export default function EditorPanel() {
  const outline = useDocStore(s => s.outline);
  const idx = useDocStore(s => s.activeIndex);
  const update = useDocStore(s => s.updateSection);
  const [tab, setTab] = useState<'edit'|'preview'>('edit');
  if (!outline || idx==null) return <div className="text-sm text-gray-500 p-2">Select a section to edit.</div>;
  const section = outline.sections[idx];
  const previewHtml = useMemo(()=>({__html: insertCites(section.content || '', section.citations||[])}), [section.content, section.citations]);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <button className={`btn ${tab==='edit'?'btn-primary':''}`} onClick={()=>setTab('edit')}>Edit</button>
        <button className={`btn ${tab==='preview'?'btn-primary':''}`} onClick={()=>setTab('preview')}>Preview</button>
      </div>
      {tab==='edit' ? (
        <textarea className="w-full h-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5"
          value={section.content || ''}
          onChange={e=>update(idx, { content: e.target.value })}
          placeholder="Model output will stream here. You can edit anytime." />
      ) : (
        <div className="prose dark:prose-invert max-w-none overflow-auto h-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
          <div dangerouslySetInnerHTML={previewHtml} className="prose dark:prose-invert max-w-none" />
        </div>
      )}
    </div>
  );
}
