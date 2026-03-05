import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { Node, mergeAttributes } from '@tiptap/core';
import { Toolbar } from './Toolbar';
import { useEffect } from 'react';
import { jsonToLatex } from '../lib/utils';

const MathNode = Node.create({
  name: 'math',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: 'E=mc^2',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math', class: 'bg-gray-100 px-1 rounded font-mono text-blue-600 border border-gray-300 cursor-pointer select-all' }), `$${node.attrs.latex}$`]
  },
});

interface EditorProps {
  documentId: string;
  content: any;
  onChange: (json: any, latex: string) => void;
}

export default function Editor({ documentId, content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
      MathNode,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[calc(100vh-200px)] p-8 bg-white shadow-sm',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const latex = jsonToLatex(json);
      onChange(json, latex);
    },
  });

  // Update content if it changes externally (e.g. loading)
  useEffect(() => {
    if (editor && content && editor.isEmpty) {
       editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <Toolbar editor={editor} documentId={documentId} />
      <div className="flex-1 overflow-y-auto p-4 flex justify-center">
        <div className="w-full max-w-[210mm] bg-white shadow-md min-h-[297mm]">
           <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
