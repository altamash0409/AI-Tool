import { describe, expect, it } from 'vitest';
import { convertDemo, samples } from './demo';
import { convertScript, validateSuiteScript21 } from './engine';

const defaultOptions = { comments: true, modernize: true, governance: true };

describe('SuiteScript 2.1 AI Converter Tests', () => {
  // -------------------------------------------------------------
  // Test 1: Existing Sample 1 (Sales Order - User Event 1.0)
  // -------------------------------------------------------------
  it('converts Sample 1 (Sales Order 1.0 UE) to valid SuiteScript 2.1 User Event Script', async () => {
    const sample = samples[0];
    const result = await convertDemo({
      source: sample.source,
      sourceVersion: '1.0',
      scriptType: 'User Event',
      options: defaultOptions,
    });

    // 1. Output must be a User Event Script (NEVER Client Script)
    expect(result.code).toContain('@NApiVersion 2.1');
    expect(result.code).toContain('@NScriptType UserEventScript');
    expect(result.code).not.toContain('@NScriptType ClientScript');

    // 2. AMD define and N/log import
    expect(result.code).toContain("define(['N/log'], (log) => {");

    // 3. Entry point function and parameter mapping
    expect(result.code).toContain('const beforeSubmit = (context) => {');
    expect(result.code).toContain('context.type !== context.UserEventType.CREATE');

    // 4. nlapiLogExecution replaced with log.debug() and log.audit()
    expect(result.code).toContain("log.debug({ title: 'Skipped', details: 'No customer selected' })");
    expect(result.code).toContain("log.audit({ title: 'Sales Order', details: 'Memo updated for customer ' + customerId })");
    expect(result.code).not.toContain('nlapiLogExecution');

    // 5. Field access using record.getValue and record.setValue
    expect(result.code).toContain("const record = context.newRecord;");
    expect(result.code).toContain("record.getValue({ fieldId: 'entity' })");
    expect(result.code).toContain("record.setValue({ fieldId: 'memo', value: 'Created with SuiteScript' })");

    // 6. Export beforeSubmit
    expect(result.code).toMatch(/return\s*\{\s*beforeSubmit\s*\};/);

    // 7. Non-mocked validation report must be Passed
    expect(result.validation).toBeDefined();
    expect(result.validation.overallStatus).toBe('Passed');
    expect(result.validation.failedChecks).toBe(0);
    expect(result.validation.checks.find(c => c.id === 'annotations')?.status).toBe('Passed');
    expect(result.validation.checks.find(c => c.id === 'module_imports')?.status).toBe('Passed');
    expect(result.validation.checks.find(c => c.id === 'entry_point_exports')?.status).toBe('Passed');
    expect(result.validation.checks.find(c => c.id === 'legacy_apis')?.status).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 2: Sample 2 (Customer Check - Client Script 1.0)
  // -------------------------------------------------------------
  it('converts Sample 2 (Customer Check 1.0 Client) to valid SuiteScript 2.1 Client Script', async () => {
    const sample = samples[1];
    const result = await convertDemo({
      source: sample.source,
      sourceVersion: '1.0',
      scriptType: 'Client',
      options: defaultOptions,
    });

    expect(result.code).toContain('@NApiVersion 2.1');
    expect(result.code).toContain('@NScriptType ClientScript');
    expect(result.code).toContain('const saveRecord = (context) => {');
    expect(result.code).toContain("context.currentRecord.getValue({ fieldId: 'entity' })");
    expect(result.code).toMatch(/return\s*\{\s*saveRecord\s*\};/);
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 3: Sample 3 (Execution Log - 2.0 to 2.1 User Event)
  // -------------------------------------------------------------
  it('modernizes Sample 3 (2.0 User Event) to 2.1 with ES6 arrow functions and object shorthand', async () => {
    const sample = samples[2];
    const result = await convertDemo({
      source: sample.source,
      sourceVersion: '2.0',
      scriptType: 'User Event',
      options: defaultOptions,
    });

    expect(result.code).toContain('@NApiVersion 2.1');
    expect(result.code).toContain('@NScriptType UserEventScript');
    expect(result.code).toContain("define(['N/log'], (log) => {");
    expect(result.code).toContain('const beforeSubmit = (context) => {');
    expect(result.code).toMatch(/return\s*\{\s*beforeSubmit\s*\};/);
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 4: Script Type Preservation (Never convert UE to Client)
  // -------------------------------------------------------------
  it('strictly preserves User Event script type and prevents accidental conversion to Client Script', async () => {
    const userEvent10 = `
      /**
       * Sales Order User Event
       */
      function beforeSubmit(type) {
        var rec = nlapiGetNewRecord();
        var val = rec.getFieldValue('entity');
      }
    `;

    // Even if client accidentally selected 'Client' scriptType
    const result = await convertScript({
      source: userEvent10,
      sourceVersion: '1.0',
      scriptType: 'Client',
      options: defaultOptions,
    });

    expect(result.code).toContain('@NScriptType UserEventScript');
    expect(result.code).not.toContain('@NScriptType ClientScript');
    expect(result.detectedType).toBe('User Event');
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 5: Suitelet conversion (1.0 -> 2.1 onRequest)
  // -------------------------------------------------------------
  it('converts Suitelet 1.0 to 2.1 onRequest AMD module', async () => {
    const suitelet10 = `
      function suitelet(request, response) {
        if (request.getMethod() === 'GET') {
          nlapiLogExecution('DEBUG', 'Suitelet', 'GET received');
        }
      }
    `;

    const result = await convertScript({
      source: suitelet10,
      sourceVersion: '1.0',
      scriptType: 'Suitelet',
      options: defaultOptions,
    });

    expect(result.code).toContain('@NApiVersion 2.1');
    expect(result.code).toContain('@NScriptType Suitelet');
    expect(result.code).toContain("define(['N/log'], (log) => {");
    expect(result.code).toContain('const onRequest = (context) => {');
    expect(result.code).toMatch(/return\s*\{\s*onRequest\s*\};/);
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 6: Map/Reduce 2.0 to 2.1 modernization
  // -------------------------------------------------------------
  it('modernizes Map/Reduce script entry points and preserves script type', async () => {
    const mrCode = `
      /**
       * @NApiVersion 2.0
       * @NScriptType MapReduceScript
       */
      define(['N/record', 'N/log'], function(record, log) {
        function getInputData() {
          return { type: 'custom' };
        }
        function map(context) {
          log.debug({ title: 'Map', details: context.key });
        }
        function reduce(context) {
          log.debug({ title: 'Reduce', details: context.key });
        }
        function summarize(summary) {
          log.audit({ title: 'Summary', details: 'Done' });
        }
        return {
          getInputData: getInputData,
          map: map,
          reduce: reduce,
          summarize: summarize
        };
      });
    `;

    const result = await convertScript({
      source: mrCode,
      sourceVersion: '2.0',
      scriptType: 'Map/Reduce',
      options: defaultOptions,
    });

    expect(result.code).toContain('@NApiVersion 2.1');
    expect(result.code).toContain('@NScriptType MapReduceScript');
    expect(result.code).toContain('const getInputData = () =>');
    expect(result.code).toContain('const map = (context) =>');
    expect(result.code).toMatch(/return\s*\{\s*getInputData,\s*map,\s*reduce,\s*summarize\s*\};/);
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 7: Legacy Search, Record CRUD, and Runtime APIs
  // -------------------------------------------------------------
  it('replaces nlapiLoadRecord, nlapiSearchRecord, and nlapiGetUser with N/* module calls', async () => {
    const legacyComplex = `
      function beforeLoad(type) {
        var rec = nlapiLoadRecord('salesorder', 123);
        var res = nlapiSearchRecord('customer', null, null, null);
        var user = nlapiGetUser();
        nlapiLogExecution('DEBUG', 'User', user);
      }
    `;

    const result = await convertScript({
      source: legacyComplex,
      sourceVersion: '1.0',
      scriptType: 'User Event',
      options: defaultOptions,
    });

    expect(result.code).toContain("define(['N/log', 'N/record', 'N/search', 'N/runtime'], (log, record, search, runtime) => {");
    expect(result.code).toContain("record.load({ type: 'salesorder', id: 123 })");
    expect(result.code).toContain("search.create({ type: 'customer'");
    expect(result.code).toContain("runtime.getCurrentUser().id");
    expect(result.code).toMatch(/return\s*\{\s*beforeLoad\s*\};/);
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 8: Sublist APIs conversion
  // -------------------------------------------------------------
  it('converts 1.0 sublist methods to 2.1 0-indexed sublist calls', async () => {
    const sublistScript = `
      function beforeSubmit(type) {
        var rec = nlapiGetNewRecord();
        var count = rec.getLineItemCount('item');
        var item = rec.getLineItemValue('item', 'item', 1);
        rec.setLineItemValue('item', 'quantity', 1, 5);
      }
    `;

    const result = await convertScript({
      source: sublistScript,
      sourceVersion: '1.0',
      scriptType: 'User Event',
      options: defaultOptions,
    });

    expect(result.code).toContain("rec.getLineCount({ sublistId: 'item' })");
    expect(result.code).toContain("rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: (1 - 1) })");
    expect(result.code).toContain("rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: (1 - 1), value: 5 })");
    expect(result.validation.overallStatus).toBe('Passed');
  });

  // -------------------------------------------------------------
  // Test 9: Edge Case - Remaining Legacy nlapi* Call Detection
  // -------------------------------------------------------------
  it('detects unmapped legacy nlapi* APIs and flags Validation Report as Failed', async () => {
    const unmappedCode = `
      /**
       * @NApiVersion 2.1
       * @NScriptType UserEventScript
       */
      define(['N/log'], (log) => {
        const beforeSubmit = (context) => {
          nlapiCustomObsoleteMethod();
        };
        return { beforeSubmit };
      });
    `;

    const report = validateSuiteScript21(unmappedCode, 'User Event');
    expect(report.overallStatus).toBe('Failed');
    const legacyCheck = report.checks.find(c => c.id === 'legacy_apis');
    expect(legacyCheck?.status).toBe('Failed');
    expect(legacyCheck?.explanation).toContain('nlapiCustomObsoleteMethod');
    expect(legacyCheck?.suggestedFix).toBeDefined();
  });

  // -------------------------------------------------------------
  // Test 10: Edge Case - Missing Entry Point Exports
  // -------------------------------------------------------------
  it('flags missing entry point exports as Failed in Validation Report', async () => {
    const invalidExportsCode = `
      /**
       * @NApiVersion 2.1
       * @NScriptType UserEventScript
       */
      define(['N/log'], (log) => {
        const customHelper = () => {};
        return { customHelper };
      });
    `;

    const report = validateSuiteScript21(invalidExportsCode, 'User Event');
    expect(report.overallStatus).toBe('Failed');
    const exportsCheck = report.checks.find(c => c.id === 'entry_point_exports');
    expect(exportsCheck?.status).toBe('Failed');
    expect(exportsCheck?.suggestedFix).toContain('beforeLoad');
  });
});