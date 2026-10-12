import { useRef } from 'react';
import { FileCode2, Clipboard, Copy, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

function highlight(line: string) {
  const regex = /(\/\/.*$|\/\*.*$|^\s*\*.*$|'[^']*'|"[^"]*"|\b(?:function|var|const|let|return|if|false|true|define)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\())/g;
  const parts = []; let cursor = 0;
  for (const match of line.matchAll(regex)) {
    const index = match.index ?? 0;
    parts.push(line.slice(cursor, index));
    const token = match[0];
    const kind = /^(\s*\*|\/\/|\/\*)/.test(token) ? 'comment' : /^['"]/.test(token) ? 'string' : /^(function|var|const|let|return|if|false|true|define)$/.test(token) ? 'keyword' : /^\d/.test(token) ? 'number' : 'function';
    parts.push(<span key={index} className={`token-${kind}`}>{token}</span>);
    cursor = index + token.length;
  }
  parts.push(line.slice(cursor));
  return parts;
}
interface Props { value: string; onChange?: (value: string) => void; title: string; version: string; filename: string; onPaste?: () => void; onUpload?: () => void; onCopy: () => void; onDownload?: () => void; demo?: boolean; }
export function CodeEditor({ value, onChange, title, version, filename, onPaste, onUpload, onCopy, onDownload, demo }: Props) {
  const highlighted = useRef<HTMLDivElement>(null);
  const lines = value.split('\n');
  return <section className="code-panel" aria-label={title}>
    <div className="code-panel-header">
      <div className="flex items-center gap-2 text-xs font-medium"><FileCode2 size={14} className="text-primary" />{title}<span className="ml-1 text-[9px] text-editor-muted">{version}</span></div>
      <div className="flex items-center gap-1">
        {onPaste && <Button variant="ghost" onClick={onPaste} title="Paste from clipboard" aria-label="Paste source"><Clipboard /><span>Paste</span></Button>}
        {onUpload && <Button variant="ghost" onClick={onUpload} title="Upload JavaScript file" aria-label="Upload source"><Upload /><span>Upload</span></Button>}
        <Button variant="ghost" onClick={onCopy} title="Copy code" aria-label={`Copy ${title.toLowerCase()}`} disabled={!value || (Boolean(onDownload) && !demo)}><Copy /></Button>
        {onDownload && <Button variant="ghost" onClick={onDownload} title="Download demo script" aria-label="Download converted code" disabled={!value || !demo}><Download /></Button>}
      </div>
    </div>
    <div className={`editor-shell ${onChange ? '' : 'editor-readonly'}`}>
      <div className="code-scroll" ref={highlighted} aria-hidden={Boolean(onChange)}>{lines.map((line, i) => <div className="code-row" key={i}><span className="line-number">{i + 1}</span><span className="code-line">{highlight(line) || ' '}</span></div>)}</div>
      {onChange && <textarea className="code-input" aria-label="Source code" spellCheck={false} value={value} wrap="off" onChange={e => onChange(e.target.value)} onScroll={e => { if (highlighted.current) { highlighted.current.scrollTop = e.currentTarget.scrollTop; highlighted.current.scrollLeft = e.currentTarget.scrollLeft; } }} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const target = e.currentTarget; const start = target.selectionStart; const end = target.selectionEnd; onChange(value.slice(0, start) + '  ' + value.slice(end)); requestAnimationFrame(() => { target.selectionStart = start + 2; target.selectionEnd = start + 2; }); } }} />}
    </div>
    <div className="code-panel-footer"><span>{filename}{demo ? ' · Demo template' : ''}</span><span>{lines.length} lines <span className="mx-2">|</span> JavaScript <span className="mx-2">|</span> UTF-8</span></div>
  </section>;
}
