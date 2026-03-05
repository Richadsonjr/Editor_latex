import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

const router = express.Router();

// Configure storage for assets
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Documents API

// List all documents
router.get('/documents', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC');
    const documents = stmt.all();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Create new document
router.post('/documents', (req, res) => {
  try {
    const { title } = req.body;
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO documents (id, title, content_json, latex_code) VALUES (?, ?, ?, ?)');
    
    // Initial empty content
    const initialContent = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const initialLatex = '';
    
    stmt.run(id, title || 'Untitled Document', initialContent, initialLatex);
    res.json({ id, title: title || 'Untitled Document' });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get single document
router.get('/documents/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    const document = stmt.get(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Update document
router.put('/documents/:id', (req, res) => {
  try {
    const { title, content_json, latex_code } = req.body;
    const { id } = req.params;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    
    if (content_json !== undefined) {
      updates.push('content_json = ?');
      values.push(typeof content_json === 'string' ? content_json : JSON.stringify(content_json));
    }
    
    if (latex_code !== undefined) {
      updates.push('latex_code = ?');
      values.push(latex_code);
    }
    
    updates.push('updated_at = unixepoch()');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/documents/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Assets API
router.post('/assets', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { document_id, caption } = req.body;
    const id = uuidv4();
    const file_url = `/uploads/${req.file.filename}`;
    const file_type = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    const stmt = db.prepare('INSERT INTO assets (id, document_id, file_url, file_type, caption) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, document_id, file_url, file_type, caption || '');
    
    res.json({ id, file_url, file_type });
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

export default router;
