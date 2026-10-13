import { Sparkles, ArrowRight, CheckCircle2, Circle, TriangleAlert, ShieldCheck, FlaskConical, CircleAlert, ChevronDown } from 'lucide-react';
import type { ConversionResult } from '@/lib/converter/demo';

export function Insights({ result, error, governance }: { result: ConversionResult | null; error: string; governance: boolean }) {
  const isDemo = result?.demo ?? true;
  const checkpoints = result?.checkpoints ?? [
    { label: '2.1 version annotation', passed: Boolean(result) },
    { label: 'Entry point exported', passed: Boolean(result) },
    { label: 'Module dependencies declared', passed: Boolean(result) },
    { label: 'NetSuite execution', passed: false },
  ];

  return (
    <aside className="insights-sidebar">
      <div className="insights-intro">
        <div className="insight-heading">
          <Sparkles size={17} className="text-primary" />
          Conversion insights
          <span className="ml-auto text-muted-foreground"><ChevronDown size={14} /></span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {result ? (isDemo ? 'Sample template inspection' : 'Automated 2.1 script analysis') : 'Ready to inspect your script'}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <span className={`badge ${isDemo ? 'badge-demo' : 'badge-success'}`}>
            {result ? (isDemo ? 'Demo sample' : 'Converted') : 'Ready'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {result ? (isDemo ? 'Sample template' : 'Consider Pie 2.1 engine') : 'Consider Pie engine'}
          </span>
        </div>
      </div>

      <section className="insight-section">
        <h3><Sparkles size={14} className="text-primary" />Conversion summary</h3>
        <p className="text-[11px] leading-[19px] text-muted-foreground">
          {result
            ? (result.summary || (isDemo ? 'A pre-written SuiteScript 2.1 template was matched to your sample.' : 'Your script has been converted to modern SuiteScript 2.1.'))
            : 'Enter or upload a script and select Convert to 2.1 to generate modernized code.'}
        </p>
        {result && (
          <div className="mt-3 flex gap-2">
            <span className="badge badge-blue">SuiteScript 2.1</span>
            <span className={`badge ${isDemo ? 'badge-demo' : 'badge-success'}`}>
              {isDemo ? 'Template matched' : 'Syntax Modernized'}
            </span>
          </div>
        )}
      </section>

      {result?.validation && (
        <section className="insight-section">
          <h3>
            <ShieldCheck size={14} className="text-primary" />Validation report
            <span
              className={`ml-auto badge ${
                result.validation.overallStatus === 'Passed'
                  ? 'badge-success'
                  : result.validation.overallStatus === 'Warning'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}
            >
              {result.validation.overallStatus}
            </span>
          </h3>
          <p className="text-[11px] leading-[18px] text-muted-foreground">
            {result.validation.summary}
          </p>

          <div className="mt-3 space-y-2">
            {result.validation.checks.map(chk => (
              <div
                key={chk.id}
                className="rounded border border-border bg-background p-2 text-[10px]"
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    {chk.status === 'Passed' && <CheckCircle2 size={12} className="shrink-0 text-success" />}
                    {chk.status === 'Warning' && <TriangleAlert size={12} className="shrink-0 text-warning" />}
                    {chk.status === 'Failed' && <CircleAlert size={12} className="shrink-0 text-destructive" />}
                    <span>{chk.name}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      chk.status === 'Passed'
                        ? 'text-success'
                        : chk.status === 'Warning'
                        ? 'text-warning'
                        : 'text-destructive'
                    }`}
                  >
                    {chk.status}
                  </span>
                </div>
                <p className="mt-1 leading-normal text-muted-foreground">{chk.explanation}</p>
                {chk.suggestedFix && chk.status !== 'Passed' && (
                  <div className="mt-1.5 rounded bg-muted/60 p-1.5 text-[9px] text-foreground">
                    <span className="font-semibold text-primary">Fix: </span>
                    {chk.suggestedFix}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="insight-section">
        <h3>
          <ArrowRight size={14} className="text-primary" />API changes
          <span className="ml-auto text-[10px] text-muted-foreground">{result?.apiChanges.length ?? '—'}</span>
        </h3>
        {result && result.apiChanges.length > 0 ? (
          result.apiChanges.map((change, i) => (
            <div className="api-change" key={`${change.from}-${i}`}>
              <code className="text-muted-foreground">{change.from}</code>
              <div className="my-1 text-primary"><ArrowRight size={12} /></div>
              <code className="text-foreground">{change.to}</code>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {result ? 'No API transforms required.' : 'No script inspected yet.'}
          </p>
        )}
      </section>

      <section className="insight-section">
        <h3><ShieldCheck size={14} className="text-primary" />Script checkpoints</h3>
        {checkpoints.map(cp => (
          <div className="checkpoint" key={cp.label}>
            {cp.passed ? <CheckCircle2 size={13} className="text-success" /> : <Circle size={13} className="text-muted-foreground" />}
            <span>{cp.label} {!cp.passed && cp.label.includes('execution') ? <span className="text-muted-foreground">· not tested</span> : ''}</span>
          </div>
        ))}
      </section>

      <section className="insight-section">
        <h3>
          <TriangleAlert size={14} className="text-warning" />Warnings & risks
          <span className="ml-auto badge badge-demo">
            {governance && result?.governanceNotes ? result.governanceNotes.length : 1}
          </span>
        </h3>
        <div className="warning-note">
          <div className="text-[11px] font-semibold text-warning">Sandbox verification required</div>
          <p className="mt-1 text-[10px] leading-[17px] text-warning">
            Confirm custom field IDs, sublist names, and deployment settings before sandbox deployment.
          </p>
        </div>
        {governance && (
          <div className="mt-3 space-y-2">
            {result?.governanceNotes && result.governanceNotes.length > 0 ? (
              result.governanceNotes.map((note, idx) => (
                <p key={idx} className="text-[10px] leading-[18px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Governance</span> · {note}
                </p>
              ))
            ) : (
              <p className="text-[10px] leading-[18px] text-muted-foreground">
                <span className="font-semibold text-foreground">Governance</span> · Check runtime usage limits in NetSuite execution logs.
              </p>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-[10px]">
          <CircleAlert size={12} className={error ? 'text-destructive' : 'text-muted-foreground'} />
          <span className={error ? 'text-destructive' : 'text-muted-foreground'}>
            {error ? error : 'Runtime errors not evaluated'}
          </span>
        </div>
      </section>

      <section className="insight-section">
        <h3><FlaskConical size={14} className="text-primary" />Recommended testing</h3>
        <ol className="space-y-3 text-[10px] leading-[17px] text-muted-foreground">
          {['Deploy script to a NetSuite sandbox.', 'Verify trigger events (create, edit, field change, save).', 'Check execution logs and governance usage.'].map((text, i) => (
            <li key={text} className="flex gap-2">
              <span className="text-primary">0{i + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      </section>
      <p className="mt-4 text-[9px] leading-4 text-muted-foreground">Always review converted code before production deployment.</p>
    </aside>
  );
}

