import { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import { FileText, Download, Save, Layout, Code, Upload, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { latexToJson } from './lib/latex-parser';
import { v4 as uuidv4 } from 'uuid';

interface Document {
  id: string;
  title: string;
  content_json: any;
  latex_code: string;
  updated_at: number;
}

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [showLatex, setShowLatex] = useState(true);
  const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Try to load from localStorage first
      const storedDocs = localStorage.getItem('latex_editor_documents');
      let data: Document[] = [];
      
      if (storedDocs) {
        data = JSON.parse(storedDocs);
      } else {
        // Fallback to API if available (for dev environment), or empty
        try {
            const res = await fetch('/api/documents');
            if (res.ok) {
                data = await res.json();
                // Sync to local storage
                localStorage.setItem('latex_editor_documents', JSON.stringify(data));
            }
        } catch (e) {
            console.log('API not available, using local storage only');
        }
      }

      setDocuments(data);
      if (data.length > 0 && !currentDoc) {
        loadDocument(data[0].id, data);
      } else if (data.length === 0) {
        createNewDocument();
      }
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  };

  const createNewDocument = async () => {
    try {
      const newDoc: Document = {
        id: uuidv4(),
        title: 'Untitled Document',
        content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
        latex_code: '',
        updated_at: Date.now()
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      saveDocsToStorage(updatedDocs);
      
      loadDocument(newDoc.id, updatedDocs);
    } catch (error) {
      console.error('Failed to create document', error);
    }
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const newDocs = documents.filter(doc => doc.id !== id);
      setDocuments(newDocs);
      saveDocsToStorage(newDocs);
      
      if (currentDoc?.id === id) {
        if (newDocs.length > 0) {
          loadDocument(newDocs[0].id, newDocs);
        } else {
          createNewDocument();
        }
      }
    } catch (error) {
      console.error('Failed to delete document', error);
      alert('Failed to delete document');
    }
  };

  const loadDocument = async (id: string, docsList = documents) => {
    try {
      const doc = docsList.find(d => d.id === id);
      if (doc) {
        setCurrentDoc(doc);
      }
    } catch (error) {
      console.error('Failed to load document', error);
    }
  };

  const handleEditorChange = (json: any, latex: string) => {
    if (!currentDoc) return;
    
    const updatedDoc = { ...currentDoc, content_json: json, latex_code: latex, updated_at: Date.now() };
    setCurrentDoc(updatedDoc);
    setStatus('unsaved');
    
    // Debounced save
    const timeoutId = setTimeout(() => {
      saveDocument(updatedDoc);
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  };

  const saveDocument = async (docToSave: Document) => {
    setStatus('saving');
    try {
      const updatedDocs = documents.map(d => d.id === docToSave.id ? docToSave : d);
      setDocuments(updatedDocs);
      saveDocsToStorage(updatedDocs);
      setStatus('saved');
    } catch (error) {
      console.error('Failed to save', error);
      setStatus('unsaved');
    }
  };

  const saveDocsToStorage = (docs: Document[]) => {
      localStorage.setItem('latex_editor_documents', JSON.stringify(docs));
  };

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentDoc) return;
    const newTitle = e.target.value;
    const updatedDoc = { ...currentDoc, title: newTitle, updated_at: Date.now() };
    setCurrentDoc(updatedDoc);
    
    // Save title immediately
    try {
        const updatedDocs = documents.map(d => d.id === updatedDoc.id ? updatedDoc : d);
        setDocuments(updatedDocs);
        saveDocsToStorage(updatedDocs);
    } catch (error) {
      console.error('Failed to save title', error);
    }
  };

  const exportTex = () => {
    if (!currentDoc) return;
    
    const preamble = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{amsmath}
\\usepackage{ulem}

\\title{${currentDoc.title}}
\\author{Generated by LaTeX WYSIWYG Editor}
\\date{\\today}

\\begin{document}

\\maketitle

`;
    
    const fullContent = preamble + currentDoc.latex_code + '\n\n\\end{document}';
    
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.title.replace(/\s+/g, '_')}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const jsonContent = latexToJson(text);
          
          // Create a new document with this content
          const title = file.name.replace('.tex', '');
          
          const newDoc: Document = {
            id: uuidv4(),
            title: title,
            content_json: jsonContent,
            latex_code: text,
            updated_at: Date.now()
          };
          
          const updatedDocs = [newDoc, ...documents];
          setDocuments(updatedDocs);
          saveDocsToStorage(updatedDocs);
          
          loadDocument(newDoc.id, updatedDocs);
          
        } catch (error) {
          console.error("Error parsing LaTeX", error);
          alert("Failed to parse LaTeX file. Please ensure it is a valid .tex file.");
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!currentDoc) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".tex" 
        onChange={handleFileImport} 
      />

      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-blue-400" />
            LaTeX Editor
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Documents</div>
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => loadDocument(doc.id)}
              className={cn(
                "group flex items-center justify-between w-full px-3 py-2 rounded-md text-sm mb-1 transition-colors cursor-pointer",
                currentDoc.id === doc.id ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <span className="truncate flex-1">{doc.title}</span>
              <button
                onClick={(e) => deleteDocument(doc.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded transition-all focus:opacity-100 focus:outline-none"
                title="Delete document"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button 
            onClick={createNewDocument}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
          >
            + New Document
          </button>
          <button 
            onClick={handleImportClick}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={14} /> Import .tex
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              value={currentDoc.title}
              onChange={handleTitleChange}
              className="text-xl font-semibold bg-transparent border-none focus:ring-0 p-0 w-full max-w-md"
            />
            <span className="text-xs text-gray-400 flex items-center gap-1">
              {status === 'saved' && <><Save size={12} /> Saved</>}
              {status === 'saving' && 'Saving...'}
              {status === 'unsaved' && 'Unsaved changes'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLatex(!showLatex)}
              className={cn(
                "p-2 rounded-md transition-colors",
                showLatex ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-600"
              )}
              title="Toggle Split View"
            >
              <Layout size={20} />
            </button>
            <button
              onClick={exportTex}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export .tex
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Visual Editor */}
          <div className={cn(
            "flex-1 bg-gray-100 p-6 overflow-hidden flex flex-col transition-all duration-300",
            showLatex ? "w-1/2" : "w-full"
          )}>
            <Editor 
              key={currentDoc.id} // Force re-mount on doc switch
              documentId={currentDoc.id}
              content={currentDoc.content_json} 
              onChange={handleEditorChange} 
            />
          </div>

          {/* LaTeX Preview */}
          {showLatex && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-900 text-gray-300 border-l border-gray-800 flex flex-col"
            >
              <div className="h-10 bg-gray-800 flex items-center px-4 text-xs font-mono text-gray-400 border-b border-gray-700">
                <Code size={14} className="mr-2" />
                LaTeX Source (Read-only Preview)
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-sm">
                <pre className="whitespace-pre-wrap">{currentDoc.latex_code}</pre>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
