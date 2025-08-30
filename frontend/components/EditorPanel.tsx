'use client';
import { useDocStore } from '../store/useDocStore';
import ReactMarkdown from 'react-markdown';
import { useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import RichTextEditor from './RichTextEditor';
import { 
  PencilSquareIcon, 
  EyeIcon, 
  DocumentTextIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

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
  const [tab, setTab] = useState<'markdown'|'visual'|'preview'>('visual');
  
  if (!outline || idx==null) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="max-w-md">
          <DocumentTextIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
            Select a Section to Edit
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Choose a section from the outline to start editing with our powerful visual editor or markdown mode.
          </p>
        </div>
      </div>
    );
  }
  
  const section = outline.sections[idx];
  const previewHtml = useMemo(()=>({__html: insertCites(section.content || '', section.citations||[])}), [section.content, section.citations]);
  
  const handleRichTextChange = (htmlContent: string) => {
    // Convert HTML back to markdown for storage
    // For now, we'll store HTML and convert when needed
    update(idx, { content: htmlContent });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Tab Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2">
        <div className="flex items-center gap-1">
          <button 
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === 'visual' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
              }
            `}
            onClick={() => setTab('visual')}
          >
            <SparklesIcon className="w-4 h-4" />
            Visual Editor
          </button>
          <button 
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === 'markdown' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
              }
            `}
            onClick={() => setTab('markdown')}
          >
            <PencilSquareIcon className="w-4 h-4" />
            Markdown
          </button>
          <button 
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === 'preview' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
              }
            `}
            onClick={() => setTab('preview')}
          >
            <EyeIcon className="w-4 h-4" />
            Preview
          </button>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Section: {section.heading || 'Untitled'}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {tab === 'visual' ? (
          <div className="h-full p-4">
            <RichTextEditor
              content={section.content || ''}
              onChange={handleRichTextChange}
              placeholder={`Start writing the "${section.heading}" section...`}
            />
          </div>
        ) : tab === 'markdown' ? (
          <textarea 
            className="w-full h-full p-4 border-0 bg-transparent resize-none focus:outline-none font-mono text-sm leading-relaxed"
            value={section.content || ''}
            onChange={e => update(idx, { content: e.target.value })}
            placeholder={`# ${section.heading}\n\nStart writing in Markdown format...\n\n**Bold text**, *italic text*, and more formatting available.`}
          />
        ) : (
          <div className="h-full overflow-auto p-4">
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={previewHtml} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
