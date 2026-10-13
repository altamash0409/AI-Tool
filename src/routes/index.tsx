import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { ArrowRight, Braces, ChevronDown, Code2, FileCode2, FolderOpen, Info, Loader2, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, X, Check, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/converter/code-editor';
import { Insights } from '@/components/converter/insights';
import { convertDemo, samples, type ConversionOptions, type ConversionResult, type ScriptType } from '@/lib/converter/demo';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Consider Pie — SuiteScript AI Converter' },
      { name: 'description', content: 'A focused SuiteScript migration workspace by Consider Pie with code editors, 2.1 syntax conversion, API changes, and governance review.' },
      { property: 'og:title', content: 'Consider Pie — SuiteScript AI Converter' },
      { property: 'og:description', content: 'Modern SuiteScript 2.1 converter build by Consider Pie.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Index,
});
function Index() {
  const initial = samples[0];
  const [source, setSource] = useState(initial?.source ?? '');
  const [version, setVersion] = useState<'1.0' | '2.0'>('1.0');
  const [scriptType, setScriptType] = useState<ScriptType>('User Event');
  const [options, setOptions] = useState<ConversionOptions>({ comments: true, modernize: true, governance: true });
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'samples' | 'about' | null>(null);
  const [notice, setNotice] = useState('');
  const [filename, setFilename] = useState('sales_order_ue.js');
  const fileInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  function invalidate() { revision.current += 1; setResult(null); setError(''); setNotice(''); }
  function updateSource(text: string) { invalidate(); setSource(text); }
  async function convert() {
    setBusy(true); setError(''); setNotice(''); setResult(null);
    const requestRevision = revision.current;
    try {
      const response = await convertDemo({ source, sourceVersion: version, scriptType, options });
      if (requestRevision === revision.current) {
        setResult(response);
        if (response.detectedVersion && response.detectedVersion !== version) {
          setVersion(response.detectedVersion);
        }
        if (response.detectedType && response.detectedType !== scriptType) {
          setScriptType(response.detectedType);
        }
        setNotice(response.demo ? 'Bundled sample template matched.' : 'Script successfully converted to SuiteScript 2.1 by Consider Pie.');
      }
    }
    catch (e) { if (requestRevision === revision.current) setError(e instanceof Error ? e.message : 'Conversion unavailable.'); }
    finally { setBusy(false); }
  }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setNotice('Code copied to clipboard.'); } catch { setNotice('Clipboard access unavailable. Select the code and copy it manually.'); } }
  async function paste() { try { updateSource(await navigator.clipboard.readText()); setFilename('untitled.js'); } catch { setNotice('Clipboard access unavailable. Paste directly into the source editor.'); } }
  function download() { if (!result) return; const url = URL.createObjectURL(new Blob([result.code], { type: 'text/javascript' })); const a = document.createElement('a'); a.href = url; a.download = filename.replace(/\.[^.]+$/, '') + (result.demo ? '.demo.2.1.js' : '.2.1.js'); a.click(); URL.revokeObjectURL(url); setNotice('Converted SuiteScript 2.1 script downloaded. Review before deployment.'); }
  function loadSample(index: number) { const sample = samples[index]; if (!sample) return; invalidate(); setSource(sample.source); setVersion(sample.version); setScriptType(sample.type); setFilename(index === 0 ? 'sales_order_ue.js' : index === 1 ? 'customer_client.js' : 'execution_log_ue.js'); setModal(null); }
  return <div>
    <header className="app-header">
      <div className="flex items-center justify-start">
        <img src="/logo.png" alt="Consider Pie Logo" className="h-14 w-auto object-contain" />
      </div>

      <nav className="header-nav" aria-label="Main navigation">
        <div className="nav-current gap-2 text-xs"><Code2 size={15} />Converter</div>
        <Button variant="ghost" className="header-resource text-xs text-muted-foreground" onClick={() => setModal('samples')}><FolderOpen />Sample scripts</Button>
        <Button variant="ghost" className="header-resource text-xs text-muted-foreground" onClick={() => setModal('about')}><BookOpen />About Consider Pie<ExternalLink size={12} /></Button>
      </nav>
    </header>
    <div className="workspace-layout">
      <aside className="settings-sidebar"><div className="mb-6 flex items-center justify-between"><span className="section-label">Configuration</span><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" aria-label="Reset workspace" title="Reset workspace" onClick={() => { loadSample(0); setOptions({ comments: true, modernize: true, governance: true }); }}><RotateCcw size={12} /></Button></div>
        <div className="settings-fields"><div><label className="form-label">Source version</label><div className="version-segment">{(['1.0', '2.0'] as const).map(v => <Button key={v} size="sm" variant={version === v ? 'version' : 'ghost'} onClick={() => { invalidate(); setVersion(v); }} aria-pressed={version === v}>SuiteScript {v}</Button>)}</div></div>
          <div className="mt-6"><label className="form-label" htmlFor="target-version">Target version</label><div className="select-wrap"><select className="select-control" id="target-version" value="2.1" disabled><option value="2.1">SuiteScript 2.1</option></select><LockKeyhole size={13} /></div><p className="mt-2 flex items-center gap-1.5 text-[10px] text-success"><Check size={11} />Latest SuiteScript standard</p></div>
          <div className="mt-6"><label className="form-label" htmlFor="script-type">Script type</label><div className="select-wrap"><select className="select-control" id="script-type" value={scriptType} onChange={e => { invalidate(); setScriptType(e.target.value as ScriptType); }}>{(['User Event', 'Client', 'Suitelet', 'Map/Reduce', 'Scheduled', 'RESTlet', 'Portlet', 'Mass Update'] as ScriptType[]).map(type => <option key={type} value={type}>{type === 'Client' ? 'Client Script' : type}</option>)}</select><ChevronDown size={13} /></div></div></div>
        <div className="settings-divider" /><span className="section-label">Conversion options</span><div className="options-list">{([{ key: 'comments', label: 'Preserve comments', sub: 'Keep inline documentation' }, { key: 'modernize', label: 'Modernize syntax', sub: 'Use const and arrow functions' }, { key: 'governance', label: 'Governance checks', sub: 'Include execution risk notes' }] as const).map(option => <label className="option-row" key={option.key}><input type="checkbox" checked={options[option.key]} onChange={e => { invalidate(); setOptions({ ...options, [option.key]: e.target.checked }); }} /><span>{option.label}<small>{option.sub}</small></span></label>)}</div>
        <div className="settings-divider" /><Button variant="outline" className="w-full justify-start text-xs" onClick={() => setModal('samples')}><FolderOpen />Load sample script<ChevronDown className="ml-auto" /></Button>
        <div className="sidebar-bottom mt-auto pt-24"><ShieldCheck size={21} className="mb-2 text-muted-foreground" /><h3 className="text-xs font-semibold">Your code stays yours.</h3><p className="mt-2 text-[10px] leading-[18px] text-muted-foreground">Scripts are converted locally in your browser.<br />Nothing is sent to external servers.</p><div className="mt-4 flex items-center gap-1.5 text-[9px] text-muted-foreground"><LockKeyhole size={10} />Private by default</div></div>
      </aside>
      <main className="workspace-main"><div className="workspace-title"><div><h1>Consider Pie Converter</h1><p className="text-xs text-muted-foreground">Your next version starts here. Built with precision for NetSuite developers.</p></div><span className="badge badge-blue">1.0 / 2.0 <ArrowRight size={11} />2.1</span></div>
        <CodeEditor value={source} onChange={updateSource} title="Source code" version={`SuiteScript ${version}`} filename={filename} onPaste={paste} onUpload={() => fileInput.current?.click()} onCopy={() => copy(source)} />
        <input ref={fileInput} type="file" accept=".js,.txt,.ts" hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 500_000) { setNotice('Please upload a script smaller than 500 KB.'); } else { try { const text = await file.text(); updateSource(text); setFilename(file.name); } catch { setNotice('This file could not be read. Please try another file.'); } } e.target.value = ''; }} />
        <div className="convert-toolbar"><div className="convert-meta"><div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole size={11} />Local engine · private processing</div><p className="mt-1 text-[9px] text-muted-foreground">SuiteScript {version} → 2.1 ({scriptType})</p></div><Button size="lg" className="px-5 text-xs" onClick={convert} disabled={busy || !source.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? 'Converting to 2.1…' : 'Convert to 2.1'}<ArrowRight /></Button></div>
        <CodeEditor value={result?.code ?? '/**\n * Your SuiteScript 2.1 converted code will appear here.\n * Paste or upload any SuiteScript 1.0 or 2.0 code and click Convert to 2.1.\n */'} title="Converted code" version="SuiteScript 2.1" filename={result ? filename.replace(/\.[^.]+$/, '') + (result.demo ? '.demo.2.1.js' : '.2.1.js') : 'output.2.1.js'} demo={Boolean(result)} onCopy={() => result && copy(result.code)} onDownload={download} />
        {error && <div role="alert" className="result-notice border-destructive/30 text-destructive"><Info size={15} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <p className="mt-3 text-xs text-primary" role="status">{notice}</p>}
        <div className="result-notice"><Info size={14} className="mt-0.5 shrink-0" /><span><strong className="font-medium text-foreground">{result?.demo ? 'Demo sample output.' : 'Converted SuiteScript 2.1.'}</strong> Consider Pie engine verified syntax. Always test in your NetSuite sandbox before production deployment.</span></div>
      </main>
      <Insights result={result} error={error} governance={options.governance} />
    </div>
    <footer className="app-footer"><div className="flex items-center gap-2"><span className="status-dot" />Workspace ready</div><span className="footer-right">Powered by Consider Pie<span className="mx-3 text-border">|</span>Built for NetSuite developers</span></footer>
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}><div className="mb-2 flex items-center justify-between"><h2 id="modal-title" className="text-lg font-semibold">{modal === 'samples' ? 'Sample scripts' : 'About Consider Pie'}</h2><Button variant="ghost" size="icon" aria-label="Close dialog" onClick={() => setModal(null)} autoFocus><X /></Button></div>{modal === 'samples' ? <><p className="mb-5 text-xs text-muted-foreground">Choose a source script with a matching 2.1 demo template.</p><div className="space-y-3">{samples.map((sample, i) => <Button variant="ghost" className="sample-item" key={sample.name} onClick={() => loadSample(i)}><div className="flex items-center gap-3 text-left"><FileCode2 className="text-primary" /><div><div className="text-xs font-semibold">{sample.name}</div><p className="mt-1 text-[10px] font-normal text-muted-foreground">{sample.description}</p></div></div><ArrowRight /></Button>)}</div></> : <div className="space-y-4 text-xs leading-6 text-muted-foreground"><div className="flex items-center gap-3 mb-2"><img src="/logo.png" alt="Consider Pie" className="h-10 w-10 object-contain rounded-md border p-1 bg-white" /><div><div className="text-sm font-bold text-foreground">Consider Pie</div><div className="text-[11px] text-muted-foreground">SuiteScript AI Migration Workspace</div></div></div><p>Consider Pie is a dedicated SuiteScript migration platform built for NetSuite engineers and administrators. It converts legacy SuiteScript 1.0 and 2.0 code directly to modern SuiteScript 2.1 with comprehensive syntax modernizing and automated validation.</p><p>Scripts are processed locally and securely in your browser. All API mappings, module dependencies, and entry points are validated against NetSuite standards.</p><p className="font-medium text-foreground">NetSuite resources</p><a className="flex items-center gap-2 text-primary" href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_4387172221.html" target="_blank" rel="noreferrer">Oracle SuiteScript 2.x documentation<ExternalLink size={12} /></a><p>Always verify deployment settings, permissions, API behavior, and governance usage in a NetSuite sandbox.</p></div>}</section></div>}
  </div>;
}
