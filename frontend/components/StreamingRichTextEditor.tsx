'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useCallback, useEffect, useRef } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  ChatBubbleLeftIcon,
  CodeBracketIcon,
  LinkIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PauseIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  isStreaming?: boolean;
  onPauseStream?: () => void;
  onResumeStream?: () => void;
  onStopStream?: () => void;
  streamingEnabled?: boolean;
  placeholder?: string;
  title?: string;
}

const MenuButton = ({ 
  onClick, 
  active = false, 
  disabled = false, 
  children, 
  title 
}: { 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean; 
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-2 rounded-md text-sm font-medium transition-colors
      ${active 
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
      }
      ${disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer'
      }
    `}
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
);

// Convert markdown to HTML for the editor
const markdownToHtml = (markdown: string): string => {
  // Simple markdown to HTML conversion for streaming
  let html = markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^\- (.*$)/gm, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*$)/gm, '<ol><li>$1</li></ol>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if no block elements
  if (!html.includes('<h') && !html.includes('<ul>') && !html.includes('<ol>')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
};

export default function StreamingRichTextEditor({ 
  content, 
  onChange, 
  isStreaming = false,
  onPauseStream,
  onResumeStream,
  onStopStream,
  streamingEnabled = true,
  placeholder = "Document content will appear here as it's generated...",
  title = "Untitled Document"
}: StreamingRichTextEditorProps) {
  const lastContentRef = useRef<string>('');
  const cursorPositionRef = useRef<number>(0);
  const isStreamingUpdateRef = useRef<boolean>(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 dark:text-indigo-400 underline cursor-pointer',
        },
      }),
      Color.configure({ types: [TextStyle.name] }),
      TextStyle,
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Only call onChange if this is a user edit, not a streaming update
      if (!isStreamingUpdateRef.current) {
        const html = editor.getHTML();
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-6 py-4 ${isStreaming ? 'streaming-content' : ''}`,
        'data-placeholder': placeholder,
      },
    },
  });

  // Handle streaming content updates
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      // Convert markdown to HTML for streaming content
      const htmlContent = content.startsWith('<') ? content : markdownToHtml(content);
      
      // Save current cursor position if user is editing
      const { from } = editor.state.selection;
      cursorPositionRef.current = from;
      
      // Mark as streaming update to prevent onChange callback
      isStreamingUpdateRef.current = true;
      
      // Update content
      editor.commands.setContent(htmlContent, { emitUpdate: false });
      
      // Restore cursor position if not streaming or if user was editing
      if (!isStreaming && from > 0) {
        editor.commands.setTextSelection(Math.min(from, editor.state.doc.content.size));
      } else if (isStreaming) {
        // Scroll to bottom during streaming
        const editorElement = editor.view.dom;
        editorElement.scrollTop = editorElement.scrollHeight;
      }
      
      lastContentRef.current = content;
      isStreamingUpdateRef.current = false;
    }
  }, [editor, content, isStreaming]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="animate-pulse p-6">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg">
      {/* Header with Title and Streaming Controls */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Generating</span>
              </div>
            </div>
          )}
        </div>
        
        {streamingEnabled && (onPauseStream || onResumeStream || onStopStream) && (
          <div className="flex items-center gap-1">
            {isStreaming ? (
              <>
                {onPauseStream && (
                  <Button variant="ghost" size="sm" onClick={onPauseStream} className="h-8 w-8 p-0">
                    <PauseIcon className="w-4 h-4" />
                  </Button>
                )}
                {onStopStream && (
                  <Button variant="ghost" size="sm" onClick={onStopStream} className="h-8 w-8 p-0">
                    <StopIcon className="w-4 h-4" />
                  </Button>
                )}
              </>
            ) : (
              onResumeStream && (
                <Button variant="ghost" size="sm" onClick={onResumeStream} className="h-8 w-8 p-0">
                  <PlayIcon className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-wrap">
        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run() || isStreaming}
          title="Undo"
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run() || isStreaming}
          title="Redo"
        >
          <ArrowUturnRightIcon className="w-4 h-4" />
        </MenuButton>
        
        <Divider />

        {/* Text Formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          disabled={isStreaming}
          title="Bold"
        >
          <BoldIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          disabled={isStreaming}
          title="Italic"
        >
          <ItalicIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          disabled={isStreaming}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </MenuButton>

        <Divider />

        {/* Headings */}
        <select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            'paragraph'
          }
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'paragraph') {
              editor.chain().focus().setParagraph().run();
            } else if (value === 'h1') {
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            } else if (value === 'h2') {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (value === 'h3') {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
          disabled={isStreaming}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <Divider />

        {/* Lists and Blocks */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          disabled={isStreaming}
          title="Bullet List"
        >
          <ListBulletIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          disabled={isStreaming}
          title="Numbered List"
        >
          <NumberedListIcon className="w-4 h-4" />
        </MenuButton>
        
        {isStreaming && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              Editing disabled during generation
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className={`min-h-[500px] ${isStreaming ? 'streaming-editor' : ''}`}
        />
        
        {/* Streaming Indicator Overlay */}
        {isStreaming && (
          <div className="absolute top-4 right-4 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              AI Writing...
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>{editor.storage.characterCount?.characters() || 0} characters</span>
          <span>{editor.storage.characterCount?.words() || 0} words</span>
          {isStreaming && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Content streaming in real-time
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Powered by AutoDoc</span>
        </div>
      </div>

      <style jsx>{`
        .streaming-content {
          animation: gentle-glow 2s ease-in-out infinite alternate;
        }
        
        .streaming-editor .ProseMirror {
          scroll-behavior: smooth;
        }
        
        @keyframes gentle-glow {
          from {
            box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
          }
          to {
            box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.4);
          }
        }
      `}</style>
    </div>
  );
}