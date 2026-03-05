import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LaTeX Converter Logic
export function jsonToLatex(json: any): string {
  if (!json || !json.content) return '';

  let latex = '';

  json.content.forEach((node: any) => {
    latex += processNode(node);
  });

  return latex.trim();
}

function processNode(node: any): string {
  switch (node.type) {
    case 'doc':
      return node.content.map(processNode).join('');
    
    case 'paragraph':
      if (!node.content) return '\n\n';
      return processMarks(node.content) + '\n\n';
    
    case 'heading':
      const level = node.attrs?.level || 1;
      const command = level === 1 ? 'section' : level === 2 ? 'subsection' : 'subsubsection';
      return `\\${command}{${processMarks(node.content)}}\n\n`;
    
    case 'bulletList':
      return `\\begin{itemize}\n${node.content.map(processNode).join('')}\\end{itemize}\n\n`;
    
    case 'orderedList':
      return `\\begin{enumerate}\n${node.content.map(processNode).join('')}\\end{enumerate}\n\n`;
    
    case 'listItem':
      return `  \\item ${node.content.map((c: any) => {
        if (c.type === 'paragraph') return processMarks(c.content);
        return processNode(c);
      }).join('')}\n`;
    
    case 'image':
      // Basic image handling
      // Assuming src is the URL. In a real app we might need to handle local paths vs URLs.
      // For LaTeX, we usually just put the filename if it's in the same dir, or a path.
      return `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{${node.attrs.src}}\n  \\caption{${node.attrs.alt || 'Image'}}\n\\end{figure}\n\n`;
    
    case 'math':
      return `$${node.attrs.latex}$`;

    case 'table':
      return processTable(node);

    case 'blockquote':
        return `\\begin{quote}\n${node.content.map(processNode).join('')}\\end{quote}\n\n`;

    case 'horizontalRule':
        return `\\hrule\n\n`;

    default:
      console.warn('Unknown node type:', node.type);
      return '';
  }
}

function processMarks(content: any[]): string {
  if (!content) return '';
  
  return content.map(node => {
    let text = escapeLatex(node.text || '');
    
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        switch (mark.type) {
          case 'bold':
            text = `\\textbf{${text}}`;
            break;
          case 'italic':
            text = `\\textit{${text}}`;
            break;
          case 'strike':
            text = `\\sout{${text}}`; // Requires ulem package
            break;
          case 'code':
            text = `\\texttt{${text}}`;
            break;
          case 'link':
            text = `\\href{${mark.attrs.href}}{${text}}`;
            break;
        }
      });
    }
    return text;
  }).join('');
}

function processTable(node: any): string {
  // Simple table processor
  // We need to count columns to generate the format string like {|c|c|c|}
  
  if (!node.content || node.content.length === 0) return '';
  
  // Find the first row to count cells
  const firstRow = node.content[0];
  const colCount = firstRow.content.length;
  const format = '|' + 'c|'.repeat(colCount);
  
  let latex = `\\begin{table}[h]\n\\centering\n\\begin{tabular}{${format}}\n\\hline\n`;
  
  node.content.forEach((row: any) => {
    if (row.type === 'tableRow') {
      const cells = row.content.map((cell: any) => {
        // Process cell content (usually paragraphs)
        // We strip the trailing newlines from paragraphs inside cells
        return cell.content.map((c: any) => processNode(c).trim()).join(' ');
      });
      latex += cells.join(' & ') + ' \\\\\n\\hline\n';
    }
  });
  
  latex += `\\end{tabular}\n\\end{table}\n\n`;
  return latex;
}

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/%/g, '\\%');
}
