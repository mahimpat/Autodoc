'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useCallback, useEffect } from 'react';
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
  ArrowUturnRightIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
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

export default function RichTextEditor({ 
  content, 
  onChange, 
  editable = true,
  placeholder = "Start writing your document..." 
}: RichTextEditorProps) {
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
    content: content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
        'data-placeholder': placeholder,
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="animate-pulse">
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

  if (!editable) {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <EditorContent 
          editor={editor} 
          className="prose prose-slate dark:prose-invert max-w-none p-4"
        />
      </div>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-wrap">
        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <ArrowUturnRightIcon className="w-4 h-4" />
        </MenuButton>
        
        <Divider />

        {/* Text Formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <BoldIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <ItalicIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
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
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <Divider />

        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <ListBulletIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <NumberedListIcon className="w-4 h-4" />
        </MenuButton>

        <Divider />

        {/* Block Elements */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <ChatBubbleLeftIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <CodeBracketIcon className="w-4 h-4" />
        </MenuButton>

        <Divider />

        {/* Link */}
        <MenuButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </MenuButton>

        <Divider />

        {/* Text Alignment */}
        <select
          value={
            editor.isActive({ textAlign: 'left' }) ? 'left' :
            editor.isActive({ textAlign: 'center' }) ? 'center' :
            editor.isActive({ textAlign: 'right' }) ? 'right' :
            editor.isActive({ textAlign: 'justify' }) ? 'justify' :
            'left'
          }
          onChange={(e) => {
            editor.chain().focus().setTextAlign(e.target.value).run();
          }}
          className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[400px]" />
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
        <div>
          {editor.storage.characterCount?.characters() || 0} characters, {editor.storage.characterCount?.words() || 0} words
        </div>
        <div className="flex items-center gap-2">
          <span>Powered by AutoDoc</span>
        </div>
      </div>
    </div>
  );
}