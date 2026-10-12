import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { ArrowRight, Braces, ChevronDown, Code2, FileCode2, FolderOpen, Info, Loader2, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, X, Check, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/converter/code-editor';
import { Insights } from '@/components/converter/insights';
import { convertDemo, samples, type ConversionOptions, type ConversionResult, type ScriptType } from '@/lib/converter/demo';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'SuiteShift — SuiteScript AI Converter' }, { name: 'description', content: 'A focused SuiteScript migration workspace with code editors, demo 2.1 templates, API changes, and governance review.' }, { property: 'og:title', content: 'SuiteShift — SuiteScript AI Converter' }, { property: 'og:description', content: 'Inspect SuiteScript 2.1 demo templates in a modern developer workspace.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
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
    try { const response = await convertDemo({ source, sourceVersion: version, scriptType, options }); if (requestRevision === revision.current) setResult(response); }
    catch (e) { if (requestRevision === revision.current) setError(e instanceof Error ? e.message : 'Demo conversion unavailable.'); }
    finally { setBusy(false); }
  }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setNotice('Code copied to clipboard.'); } catch { setNotice('Clipboard access unavailable. Select the code and copy it manually.'); } }
  async function paste() { try { updateSource(await navigator.clipboard.readText()); setFilename('untitled.js'); } catch { setNotice('Clipboard access unavailable. Paste directly into the source editor.'); } }
  function download() { if (!result) return; const url = URL.createObjectURL(new Blob([result.code], { type: 'text/javascript' })); const a = document.createElement('a'); a.href = url; a.download = filename.replace(/\.[^.]+$/, '') + '.demo.2.1.js'; a.click(); URL.revokeObjectURL(url); setNotice('Demo template downloaded. Review before deployment.'); }
  function loadSample(index: number) { const sample = samples[index]; if (!sample) return; invalidate(); setSource(sample.source); setVersion(sample.version); setScriptType(sample.type); setFilename(index === 0 ? 'sales_order_ue.js' : index === 1 ? 'customer_client.js' : 'execution_log_ue.js'); setModal(null); }
  return <div>
    <header className="app-header">
      <div className="flex items-center gap-3"><div className="brand-symbol"><Braces size={24} strokeWidth={2.5} /></div><div><div className="text-[19px] font-bold leading-6">Suite<span className="text-primary">Shift</span></div><div className="header-subtitle text-[10px] text-muted-foreground">SUITESCRIPT AI CONVERTER</div></div></div>
      <nav className="header-nav" aria-label="Main navigation"><div className="nav-current gap-2 text-xs"><Code2 size={15} />Converter</div><Button variant="ghost" className="header-resource text-xs text-muted-foreground" onClick={() => setModal('samples')}><FolderOpen />Sample scripts</Button><Button variant="ghost" className="header-resource text-xs text-muted-foreground" onClick={() => setModal('about')}><BookOpen />Resources<ExternalLink size={12} /></Button></nav>
      <div className="flex items-center gap-4"><span className="badge badge-demo"><span className="h-1.5 w-1.5 rounded-full bg-warning" />Demo workspace</span><div className="header-avatar flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold">SS</div></div>
    </header>
    <div className="workspace-layout">
      <aside className="settings-sidebar"><div className="mb-6 flex items-center justify-between"><span className="section-label">Configuration</span><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" aria-label="Reset workspace" title="Reset workspace" onClick={() => { loadSample(0); setOptions({ comments: true, modernize: true, governance: true }); }}><RotateCcw size={12} /></Button></div>
        <div className="settings-fields"><div><label className="form-label">Source version</label><div className="version-segment">{(['1.0', '2.0'] as const).map(v => <Button key={v} variant={version === v ? 'version' : 'ghost'} onClick={() => { invalidate(); setVersion(v); }} aria-pressed={version === v}>SuiteScript {v}</Button>)}</div></div>
          <div className="mt-6"><label className="form-label" htmlFor="target-version">Target version</label><div className="select-wrap"><select className="select-control" id="target-version" value="2.1" disabled><option value="2.1">SuiteScript 2.1</option></select><LockKeyhole size={13} /></div><p className="mt-2 flex items-center gap-1.5 text-[10px] text-success"><Check size={11} />Latest SuiteScript standard</p></div>
          <div className="mt-6"><label className="form-label" htmlFor="script-type">Script type</label><div className="select-wrap"><select className="select-control" id="script-type" value={scriptType} onChange={e => { invalidate(); setScriptType(e.target.value as ScriptType); }}>{(['User Event', 'Client', 'Suitelet', 'Map/Reduce', 'Scheduled', 'RESTlet', 'Portlet', 'Mass Update'] as ScriptType[]).map(type => <option key={type} value={type}>{type === 'Client' ? 'Client Script' : type}</option>)}</select><ChevronDown size={13} /></div></div></div>
        <div className="settings-divider" /><span className="section-label">Conversion options</span><div className="options-list">{([{ key: 'comments', label: 'Preserve comments', sub: 'Keep inline documentation' }, { key: 'modernize', label: 'Modernize syntax', sub: 'Use const and arrow functions' }, { key: 'governance', label: 'Governance checks', sub: 'Include execution risk notes' }] as const).map(option => <label className="option-row" key={option.key}><input type="checkbox" checked={options[option.key]} onChange={e => { invalidate(); setOptions({ ...options, [option.key]: e.target.checked }); }} /><span>{option.label}<small>{option.sub}</small></span></label>)}</div>
        <div className="settings-divider" /><Button variant="outline" className="w-full justify-start text-xs" onClick={() => setModal('samples')}><FolderOpen />Load sample script<ChevronDown className="ml-auto" /></Button>
        <div className="sidebar-bottom mt-auto pt-24"><ShieldCheck size={21} className="mb-2 text-muted-foreground" /><h3 className="text-xs font-semibold">Your code stays yours.</h3><p className="mt-2 text-[10px] leading-[18px] text-muted-foreground">Demo scripts are processed locally.<br />Nothing is sent to an AI service.</p><div className="mt-4 flex items-center gap-1.5 text-[9px] text-muted-foreground"><LockKeyhole size={10} />Private by default</div></div>
      </aside>
      <main className="workspace-main"><div className="workspace-title"><div><h1>SuiteScript converter</h1><p className="text-xs text-muted-foreground">Your next version starts here.</p></div><span className="badge badge-blue">1.0 / 2.0 <ArrowRight size={11} />2.1</span></div>
        <CodeEditor value={source} onChange={updateSource} title="Source code" version={`SuiteScript ${version}`} filename={filename} onPaste={paste} onUpload={() => fileInput.current?.click()} onCopy={() => copy(source)} />
        <input ref={fileInput} type="file" accept=".js,.txt,.ts" hidden onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 500_000) { setNotice('Please upload a script smaller than 500 KB.'); } else { try { const text = await file.text(); updateSource(text); setFilename(file.name); } catch { setNotice('This file could not be read. Please try another file.'); } } e.target.value = ''; }} />
        <div className="convert-toolbar"><div className="convert-meta"><div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole size={11} />Local demo · no AI connection</div><p className="mt-1 text-[9px] text-muted-foreground">Unmodified samples only</p></div><Button size="lg" className="px-5 text-xs" onClick={convert} disabled={busy || !source.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? 'Matching template…' : 'Convert to 2.1'}<ArrowRight /></Button></div>
        <CodeEditor value={result?.code ?? '/**\n * Your SuiteScript 2.1 demo template will appear here.\n * Load an unmodified sample, then select Convert to 2.1.\n * A real AI conversion engine is not connected.\n */'} title="Converted code" version="SuiteScript 2.1" filename={result ? filename.replace(/\.[^.]+$/, '') + '.2.1.js' : 'output.2.1.js'} demo={Boolean(result)} onCopy={() => result && copy(result.code)} onDownload={download} />
        {error && <div role="alert" className="result-notice border-destructive/30 text-destructive"><Info size={15} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <p className="mt-3 text-xs text-primary" role="status">{notice}</p>}
        <div className="result-notice"><Info size={14} className="mt-0.5 shrink-0" /><span><strong className="font-medium text-foreground">Demo, not production-ready.</strong> Outputs are pre-written sample templates. Always review and test in your NetSuite sandbox.</span></div>
      </main>
      <Insights result={result} error={error} governance={options.governance} />
    </div>
    <footer className="app-footer"><div className="flex items-center gap-2"><span className="status-dot" />Workspace ready<span className="mx-2 text-border">|</span>Demo mode</div><span className="footer-right">SuiteScript 2.1<span className="mx-3 text-border">|</span>Built for NetSuite developers</span><span>SuiteShift <span className="ml-1 text-muted-foreground">v0.1</span></span></footer>
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}><div className="mb-2 flex items-center justify-between"><h2 id="modal-title" className="text-lg font-semibold">{modal === 'samples' ? 'Sample scripts' : 'About this workspace'}</h2><Button variant="ghost" size="icon" aria-label="Close dialog" onClick={() => setModal(null)} autoFocus><X /></Button></div>{modal === 'samples' ? <><p className="mb-5 text-xs text-muted-foreground">Choose a source script with a matching 2.1 demo template.</p><div className="space-y-3">{samples.map((sample, i) => <Button variant="ghost" className="sample-item" key={sample.name} onClick={() => loadSample(i)}><div className="flex items-center gap-3 text-left"><FileCode2 className="text-primary" /><div><div className="text-xs font-semibold">{sample.name}</div><p className="mt-1 text-[10px] font-normal text-muted-foreground">{sample.description}</p></div></div><ArrowRight /></Button>)}</div></> : <div className="space-y-4 text-xs leading-6 text-muted-foreground"><p>SuiteShift is a local demo workspace. Only the bundled, unmodified samples can be matched to pre-written SuiteScript 2.1 templates. Other scripts are not converted.</p><p>No AI service is connected. Checkpoints describe the template structure, not runtime validation. No files or code are sent to a server.</p><p className="font-medium text-foreground">NetSuite resources</p><a className="flex items-center gap-2 text-primary" href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_4387172221.html" target="_blank" rel="noreferrer">Oracle SuiteScript 2.x documentation<ExternalLink size={12} /></a><p>Always verify deployment settings, permissions, API behavior, and governance usage in a NetSuite sandbox.</p></div>}</section></div>}
  </div>;
}
