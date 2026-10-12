export type ScriptType = 'User Event' | 'Client' | 'Suitelet' | 'Map/Reduce' | 'Scheduled' | 'RESTlet' | 'Portlet' | 'Mass Update';
export interface ConversionOptions { comments: boolean; modernize: boolean; governance: boolean; }
export interface ConversionRequest { source: string; sourceVersion: '1.0' | '2.0'; scriptType: ScriptType; options: ConversionOptions; }
export interface ConversionResult { code: string; demo: true; apiChanges: { from: string; to: string }[]; }
export interface ScriptSample { name: string; description: string; type: ScriptType; version: '1.0' | '2.0'; source: string; output: string; changes: ConversionResult['apiChanges']; }
export const samples: ScriptSample[] = [
  {
    name: 'Sales order · User Event', description: 'Set a memo before a sales order is saved', type: 'User Event', version: '1.0',
    source: `/**
 * Sales Order — Before Submit
 * Sets a memo on new sales orders.
 */
function beforeSubmit(type) {
  if (type !== 'create') {
    return;
  }

  // Get the current sales order
  var record = nlapiGetNewRecord();
  var customerId = record.getFieldValue('entity');

  if (!customerId) {
    nlapiLogExecution('DEBUG', 'Skipped',
      'No customer selected');
    return;
  }

  // Set the sales order memo
  record.setFieldValue('memo',
    'Created with SuiteScript');

  nlapiLogExecution('AUDIT', 'Sales Order',
    'Memo updated for customer ' + customerId);
}`,
    output: `/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * DEMO TEMPLATE — not an AI conversion
 */
define(['N/log'], (log) => {
  const beforeSubmit = (context) => {
    if (context.type !== context.UserEventType.CREATE) {
      return;
    }

    // Get the current sales order
    const record = context.newRecord;
    const customerId = record.getValue({ fieldId: 'entity' });

    if (!customerId) {
      log.debug({ title: 'Skipped', details: 'No customer selected' });
      return;
    }

    // Set the sales order memo
    record.setValue({
      fieldId: 'memo', value: 'Created with SuiteScript'
    });
    log.audit({ title: 'Sales Order',
      details: 'Memo updated for customer ' + customerId });
  };
  return { beforeSubmit };
});`,
    changes: [{ from: 'nlapiGetNewRecord()', to: 'context.newRecord' }, { from: 'getFieldValue / setFieldValue', to: 'getValue / setValue' }, { from: 'nlapiLogExecution()', to: 'N/log · debug / audit' }],
  },
  {
    name: 'Customer check · Client', description: 'Validate a customer before saving a record', type: 'Client', version: '1.0',
    source: `/**
 * Customer validation — Client Script
 */
function saveRecord() {
  var customer = nlapiGetFieldValue('entity');
  if (!customer) {
    alert('Please select a customer.');
    return false;
  }
  return true;
}`,
    output: `/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * DEMO TEMPLATE — not an AI conversion
 */
define([], () => {
  const saveRecord = (context) => {
    const customer = context.currentRecord.getValue({
      fieldId: 'entity'
    });
    if (!customer) {
      alert('Please select a customer.');
      return false;
    }
    return true;
  };
  return { saveRecord };
});`,
    changes: [{ from: 'nlapiGetFieldValue()', to: 'context.currentRecord.getValue()' }],
  },
  {
    name: 'Execution log · SuiteScript 2.0', description: 'A minimal 2.0 User Event module', type: 'User Event', version: '2.0',
    source: `/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 */
define(['N/log'], function(log) {
  function beforeSubmit(context) {
    log.debug({ title: 'Event', details: context.type });
  }
  return { beforeSubmit: beforeSubmit };
});`,
    output: `/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * DEMO TEMPLATE — not an AI conversion
 */
define(['N/log'], (log) => {
  const beforeSubmit = (context) => {
    log.debug({ title: 'Event', details: context.type });
  };
  return { beforeSubmit };
});`,
    changes: [{ from: '@NApiVersion 2.0', to: '@NApiVersion 2.1' }],
  },
];
// Replace this adapter with a real service. Unknown input must never receive a sample output.
export async function convertDemo(request: ConversionRequest): Promise<ConversionResult> {
  const sample = samples.find(s => s.source.trim() === request.source.trim() && s.version === request.sourceVersion && s.type === request.scriptType);
  if (!sample) throw new Error('Demo conversion supports only unmodified sample scripts with matching settings. Load a sample to try it. Your source has been kept unchanged.');
  await new Promise(resolve => setTimeout(resolve, 450));
  let code = sample.output;
  if (!request.options.comments) code = code.replace(/^    \/\/.*\n/gm, '');
  if (!request.options.modernize) {
    code = code.replace(/define\(\[([^\]]*)\], \(([^)]*)\) => \{/g, 'define([$1], function($2) {');
    code = code.replace(/const (beforeSubmit|saveRecord) = \(context\) => \{/g, 'function $1(context) {').replace(/\n  };\n  return/g, '\n  }\n  return');
  }
  return { code, demo: true, apiChanges: sample.changes };
}
