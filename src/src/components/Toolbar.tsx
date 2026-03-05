import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Image as ImageIcon,
  Table as TableIcon,
  Link as LinkIcon,
  Sigma,
  Upload
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useRef } from 'react';

interface ToolbarProps {
  editor: Editor | null;
  documentId: string;
}

export function Toolbar({ editor, documentId }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    // We need a document ID to associate the asset, but here we might not have it easily in the toolbar context
    // For now, we'll just upload it and get the URL. The backend requires document_id but we can pass a dummy one or handle it.
    // Actually, let's just pass 'temp' or handle it in the backend. 
    // Wait, the backend requires document_id. 
    // I'll update the backend to make document_id optional or handle it.
    // Or I can just pass a placeholder.
    formData.append('document_id', documentId); 

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.file_url) {
        editor.chain().focus().setImage({ src: data.file_url }).run();
      }
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addMath = () => {
    const latex = window.prompt('Enter LaTeX equation (e.g. E=mc^2):', 'E=mc^2');
    if (latex) {
      editor.chain().focus().insertContent({
        type: 'math',
        attrs: { latex },
      }).run();
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white p-2 flex flex-wrap gap-1 sticky top-0 z-10">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*" 
        onChange={handleFileUpload} 
      />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={<Bold size={18} />}
        title="Bold"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={<Italic size={18} />}
        title="Italic"
      />
      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={<Heading1 size={18} />}
        title="Heading 1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={<Heading2 size={18} />}
        title="Heading 2"
      />
      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={<List size={18} />}
        title="Bullet List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={<ListOrdered size={18} />}
        title="Ordered List"
      />
      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={<Quote size={18} />}
        title="Blockquote"
      />
      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        icon={<LinkIcon size={18} />}
        title="Link"
      />
      <ToolbarButton
        onClick={triggerUpload}
        isActive={false}
        icon={<Upload size={18} />}
        title="Upload Image"
      />
      <ToolbarButton
        onClick={addTable}
        isActive={editor.isActive('table')}
        icon={<TableIcon size={18} />}
        title="Table"
      />
      <ToolbarButton
        onClick={addMath}
        isActive={editor.isActive('math')}
        icon={<Sigma size={18} />}
        title="Math (LaTeX)"
      />
      <div className="flex-grow" />
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        icon={<Undo size={18} />}
        title="Undo"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        icon={<Redo size={18} />}
        title="Redo"
      />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
  title: string;
}

function ToolbarButton({ onClick, isActive, icon, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded hover:bg-gray-100 transition-colors",
        isActive ? "bg-gray-200 text-black" : "text-gray-600"
      )}
    >
      {icon}
    </button>
  );
}
