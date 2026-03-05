import { JSONContent } from '@tiptap/core';

export function latexToJson(latex: string): JSONContent {
  // 1. Extract content inside \begin{document}...\end{document} if present
  const documentMatch = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  let content = documentMatch ? documentMatch[1] : latex;

  // Remove comments
  content = content.replace(/%.*$/gm, '');

  const nodes: JSONContent[] = [];
  
  let cursor = 0;
  const length = content.length;

  while (cursor < length) {
    const remaining = content.slice(cursor);

    // Skip whitespace at start of block
    if (/^\s+/.test(remaining)) {
      const match = remaining.match(/^\s+/);
      cursor += match![0].length;
      continue;
    }

    // Check for Chapter (treat as H1)
    let match = remaining.match(/^\\chapter\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: match[1] }]
      });
      cursor += match[0].length;
      continue;
    }

    // Check for Section (treat as H1 or H2 depending on doc class, let's map to H1 for simplicity in this editor)
    match = remaining.match(/^\\section\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: match[1] }]
      });
      cursor += match[0].length;
      continue;
    }

    // Check for Subsection
    match = remaining.match(/^\\subsection\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: match[1] }]
      });
      cursor += match[0].length;
      continue;
    }

    // Check for Subsubsection
    match = remaining.match(/^\\subsubsection\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: match[1] }]
      });
      cursor += match[0].length;
      continue;
    }

    // Check for Itemize (Bullet List)
    match = remaining.match(/^\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/);
    if (match) {
      const listContent = match[1];
      const items = parseListItems(listContent);
      nodes.push({
        type: 'bulletList',
        content: items
      });
      cursor += match[0].length;
      continue;
    }

    // Check for Enumerate (Ordered List)
    match = remaining.match(/^\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/);
    if (match) {
      const listContent = match[1];
      const items = parseListItems(listContent);
      nodes.push({
        type: 'orderedList',
        content: items
      });
      cursor += match[0].length;
      continue;
    }

    // Check for Figure/Image
    match = remaining.match(/^\\begin\{figure\}(?:\[.*?\])?([\s\S]*?)\\end\{figure\}/);
    if (match) {
      const figContent = match[1];
      // Extract \includegraphics{...}
      const imgMatch = figContent.match(/\\includegraphics(?:\[.*?\])?\{([^}]+)\}/);
      const captionMatch = figContent.match(/\\caption\{([^}]+)\}/);
      
      if (imgMatch) {
        nodes.push({
          type: 'image',
          attrs: {
            src: imgMatch[1],
            alt: captionMatch ? captionMatch[1] : '',
            title: captionMatch ? captionMatch[1] : ''
          }
        });
      }
      cursor += match[0].length;
      continue;
    }

    // Check for Table
    match = remaining.match(/^\\begin\{table\}(?:\[.*?\])?([\s\S]*?)\\end\{table\}/);
    if (match) {
        const tableEnvContent = match[1];
        const tabularMatch = tableEnvContent.match(/\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/);
        
        if (tabularMatch) {
            nodes.push(parseTable(tabularMatch[2]));
        }
        cursor += match[0].length;
        continue;
    }
    
    // Direct tabular check
    match = remaining.match(/^\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/);
    if (match) {
        nodes.push(parseTable(match[2]));
        cursor += match[0].length;
        continue;
    }

    // Check for Blockquote
    match = remaining.match(/^\\begin\{quote\}([\s\S]*?)\\end\{quote\}/);
    if (match) {
      nodes.push({
        type: 'blockquote',
        content: parseInline(match[1]) 
      });
      cursor += match[0].length;
      continue;
    }

    // Default: Paragraph
    const nextBlockIndex = findNextBlockStart(remaining.substring(1)); 
    
    let textChunk = '';
    if (nextBlockIndex === -1) {
      textChunk = remaining;
      cursor += remaining.length;
    } else {
      textChunk = remaining.substring(0, nextBlockIndex + 1);
      cursor += nextBlockIndex + 1;
    }

    if (textChunk.trim()) {
        const paragraphs = textChunk.split(/\n\s*\n/);
        paragraphs.forEach(p => {
            if (p.trim()) {
                nodes.push({
                    type: 'paragraph',
                    content: parseInline(p.trim())
                });
            }
        });
    }
  }

  return {
    type: 'doc',
    content: nodes
  };
}

function findNextBlockStart(text: string): number {
    const commands = [
        '\\chapter{', '\\section{', '\\subsection{', '\\subsubsection{',
        '\\begin{itemize}', '\\begin{enumerate}', '\\begin{figure}', '\\begin{table}', '\\begin{quote}', '\\begin{tabular}'
    ];
    
    let minIndex = -1;
    
    for (const cmd of commands) {
        const idx = text.indexOf(cmd);
        if (idx !== -1) {
            if (minIndex === -1 || idx < minIndex) {
                minIndex = idx;
            }
        }
    }
    
    return minIndex;
}

function parseListItems(content: string): JSONContent[] {
  const items = content.split('\\item');
  const nodes: JSONContent[] = [];

  items.forEach(item => {
    if (!item.trim()) return;
    
    nodes.push({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: parseInline(item.trim())
      }]
    });
  });

  return nodes;
}

function parseTable(content: string): JSONContent {
    const rows = content.split('\\\\').filter(r => r.trim().length > 0 && !r.trim().startsWith('\\hline'));
    
    const tableRows: JSONContent[] = rows.map((row, rowIndex) => {
        const cells = row.split('&').map(c => c.trim());
        const cellNodes: JSONContent[] = cells.map(cell => ({
            type: rowIndex === 0 ? 'tableHeader' : 'tableCell', 
            content: [{
                type: 'paragraph',
                content: parseInline(cell)
            }]
        }));
        
        return {
            type: 'tableRow',
            content: cellNodes
        };
    });

    return {
        type: 'table',
        content: tableRows
    };
}

function parseInline(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  let cursor = 0;
  
  while (cursor < text.length) {
    const remaining = text.slice(cursor);
    
    // 1. Check for specific supported commands
    
    // Bold
    let match = remaining.match(/^\\textbf\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'bold' }] });
      cursor += match[0].length;
      continue;
    }

    // Italic (\textit or \emph)
    match = remaining.match(/^\\textit\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'italic' }] });
      cursor += match[0].length;
      continue;
    }
    match = remaining.match(/^\\emph\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'italic' }] });
      cursor += match[0].length;
      continue;
    }
    
    // Underline
    match = remaining.match(/^\\underline\s*\{([^}]+)\}/);
    if (match) {
        nodes.push({ type: 'text', text: match[1] }); 
        cursor += match[0].length;
        continue;
    }

    // Strike
    match = remaining.match(/^\\sout\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'strike' }] });
      cursor += match[0].length;
      continue;
    }

    // Code
    match = remaining.match(/^\\texttt\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'code' }] });
      cursor += match[0].length;
      continue;
    }

    // Link
    match = remaining.match(/^\\href\s*\{([^}]+)\}\s*\{([^}]+)\}/);
    if (match) {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'link', attrs: { href: match[1] } }] });
      cursor += match[0].length;
      continue;
    }

    // Math (Inline) $...$
    match = remaining.match(/^\$([^$]+)\$/);
    if (match) {
        nodes.push({
            type: 'math',
            attrs: { latex: match[1] }
        });
        cursor += match[0].length;
        continue;
    }

    // 2. Handle Escaped Characters (must be before generic command)
    if (remaining.startsWith('\\')) {
        const escaped = remaining.match(/^\\([%&_#${}])/); 
        if (escaped) {
             nodes.push({ type: 'text', text: escaped[1] });
             cursor += 2;
             continue;
        }
    }

    // 3. Generic Command Handler (Catch-all for unhandled tags)
    const commandMatch = remaining.match(/^\\([a-zA-Z@]+)(\*?)(\s*)(\{?)/);
    if (commandMatch) {
        const cmdName = commandMatch[1];
        const hasBrace = commandMatch[4] === '{';
        
        const ignoreCommands = ['label', 'index', 'bibliography', 'bibliographystyle', 'centering', 'newpage', 'clearpage', 'maketitle', 'tableofcontents'];
        
        if (ignoreCommands.includes(cmdName)) {
            let advance = commandMatch[0].length;
            if (hasBrace) {
                const closeIdx = findClosingBrace(remaining, advance - 1);
                if (closeIdx !== -1) {
                    cursor += closeIdx + 1;
                    continue;
                }
            }
            cursor += advance;
            continue;
        }

        if (hasBrace) {
             const advance = commandMatch[0].length; 
             const closeIdx = findClosingBrace(remaining, advance - 1);
             if (closeIdx !== -1) {
                 const innerContent = remaining.substring(advance, closeIdx);
                 nodes.push(...parseInline(innerContent));
                 cursor += closeIdx + 1;
                 continue;
             }
        }
        
        // Command without braces (e.g. \today) - just consume command
        cursor += commandMatch[0].length;
        continue;
    }

    // 4. Plain text
    const nextSpecial = findNextInlineSpecial(remaining.substring(1));
    let textChunk = '';
    if (nextSpecial === -1) {
        textChunk = remaining;
        cursor += remaining.length;
    } else {
        textChunk = remaining.substring(0, nextSpecial + 1);
        cursor += nextSpecial + 1;
    }
    
    textChunk = unescapeLatex(textChunk);
    
    if (textChunk) {
        nodes.push({ type: 'text', text: textChunk });
    }
  }
  
  return nodes;
}

function findClosingBrace(text: string, openIdx: number): number {
    let depth = 1;
    for (let i = openIdx + 1; i < text.length; i++) {
        if (text[i] === '{') depth++;
        if (text[i] === '}') depth--;
        if (depth === 0) return i;
    }
    return -1;
}

function findNextInlineSpecial(text: string): number {
    const idx1 = text.indexOf('\\');
    const idx2 = text.indexOf('$');
    
    if (idx1 === -1) return idx2;
    if (idx2 === -1) return idx1;
    return Math.min(idx1, idx2);
}

function unescapeLatex(text: string): string {
    return text
        .replace(/\\textbackslash\{\}/g, '\\')
        .replace(/\\\{/g, '{')
        .replace(/\\\}/g, '}')
        .replace(/\\\$/g, '$')
        .replace(/\\&/g, '&')
        .replace(/\\#/g, '#')
        .replace(/\\textasciicircum\{\}/g, '^')
        .replace(/\\_/g, '_')
        .replace(/\\textasciitilde\{\}/g, '~')
        .replace(/\\%/g, '%')
        .replace(/\\$/g, '$')
        .replace(/\\&/g, '&');
}
