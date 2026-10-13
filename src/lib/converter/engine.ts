export type ScriptType = 'User Event' | 'Client' | 'Suitelet' | 'Map/Reduce' | 'Scheduled' | 'RESTlet' | 'Portlet' | 'Mass Update';

export interface ConversionOptions {
  comments: boolean;
  modernize: boolean;
  governance: boolean;
}

export interface ConversionRequest {
  source: string;
  sourceVersion: '1.0' | '2.0';
  scriptType: ScriptType;
  options: ConversionOptions;
}

export type ValidationStatus = 'Passed' | 'Warning' | 'Failed';

export interface ValidationCheck {
  id: string;
  name: string;
  status: ValidationStatus;
  explanation: string;
  suggestedFix?: string;
}

export interface ValidationReport {
  overallStatus: ValidationStatus;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  summary: string;
  checks: ValidationCheck[];
}

export interface ConversionResult {
  code: string;
  demo: boolean;
  apiChanges: { from: string; to: string }[];
  summary?: string;
  governanceNotes?: string[];
  checkpoints?: { label: string; passed: boolean }[];
  validation: ValidationReport;
  detectedVersion?: '1.0' | '2.0';
  detectedType?: ScriptType;
}

export const SCRIPT_TYPE_METADATA: Record<ScriptType, {
  annotation: string;
  entryPoints: string[];
}> = {
  'User Event': {
    annotation: 'UserEventScript',
    entryPoints: ['beforeLoad', 'beforeSubmit', 'afterSubmit'],
  },
  'Client': {
    annotation: 'ClientScript',
    entryPoints: ['pageInit', 'fieldChanged', 'postSourcing', 'sublistChanged', 'lineInit', 'validateField', 'validateLine', 'validateInsert', 'validateDelete', 'saveRecord'],
  },
  'Suitelet': {
    annotation: 'Suitelet',
    entryPoints: ['onRequest'],
  },
  'Map/Reduce': {
    annotation: 'MapReduceScript',
    entryPoints: ['getInputData', 'map', 'reduce', 'summarize'],
  },
  'Scheduled': {
    annotation: 'ScheduledScript',
    entryPoints: ['execute'],
  },
  'RESTlet': {
    annotation: 'Restlet',
    entryPoints: ['get', 'post', 'put', 'delete'],
  },
  'Portlet': {
    annotation: 'Portlet',
    entryPoints: ['render'],
  },
  'Mass Update': {
    annotation: 'MassUpdateScript',
    entryPoints: ['each'],
  },
};

/**
 * Strips comments from code for analysis
 */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

/**
 * Modernizes ES5 JavaScript into ES6+ SuiteScript 2.1 syntax
 */
function modernizeSyntax(code: string, options: ConversionOptions, changes: { from: string; to: string }[]): string {
  let result = code;

  if (options.modernize) {
    // 1. Convert define AMD wrapper to arrow function
    if (/define\s*\(\s*(\[[^\]]*\])\s*,\s*function\s*\(([^)]*)\)\s*\{/.test(result)) {
      result = result.replace(/define\s*\(\s*(\[[^\]]*\])\s*,\s*function\s*\(([^)]*)\)\s*\{/g, 'define($1, ($2) => {');
      changes.push({ from: 'define([...], function(...) {', to: 'define([...], (...) => {' });
    }

    // 2. Convert standard entry point functions to const arrow functions
    const allEntryPoints = Object.values(SCRIPT_TYPE_METADATA).flatMap(m => m.entryPoints);
    allEntryPoints.forEach(fn => {
      const fnRegex = new RegExp(`(^|\\n)([ \\t]*)function\\s+${fn}\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
      if (fnRegex.test(result)) {
        result = result.replace(fnRegex, `$1$2const ${fn} = ($3) => {`);
        if (!changes.some(c => c.to.includes(`${fn} = (`))) {
          changes.push({ from: `function ${fn}(...)`, to: `const ${fn} = (...) =>` });
        }
      }
    });

    // 3. Modernize return export object: { fn: fn } -> { fn }
    result = result.replace(/return\s*\{([^{}]+)\};?/g, (match, body) => {
      const modernizedBody = body.replace(/([a-zA-Z0-9_$]+)\s*:\s*\1\b/g, '$1');
      if (modernizedBody !== body && !changes.some(c => c.to.includes('object shorthand'))) {
        changes.push({ from: 'return { fn: fn }', to: 'return { fn } (ES6 object shorthand)' });
      }
      return `return {${modernizedBody}};`;
    });

    // 4. Modernize var declarations to const or let
    if (/\bvar\s+/.test(result)) {
      result = result.replace(/\bvar\s+([a-zA-Z0-9_$]+)\s*;/g, 'let $1;');
      result = result.replace(/\bvar\s+([a-zA-Z0-9_$]+)\s*=/g, 'const $1 =');
      if (!changes.some(c => c.to.includes('const / let'))) {
        changes.push({ from: 'var variableName', to: 'const / let variableName (block-scoped)' });
      }
    }

    // 5. Array indexOf !== -1 to includes()
    if (/\.indexOf\(([^)]+)\)\s*!==\s*-1/.test(result)) {
      result = result.replace(/([a-zA-Z0-9_$.]+)\.indexOf\(([^)]+)\)\s*!==\s*-1/g, '$1.includes($2)');
      changes.push({ from: 'array.indexOf(x) !== -1', to: 'array.includes(x)' });
    }
    if (/\.indexOf\(([^)]+)\)\s*===\s*-1/.test(result)) {
      result = result.replace(/([a-zA-Z0-9_$.]+)\.indexOf\(([^)]+)\)\s*===\s*-1/g, '!$1.includes($2)');
      changes.push({ from: 'array.indexOf(x) === -1', to: '!array.includes(x)' });
    }
  }

  // 6. Handle comments option
  if (!options.comments) {
    result = result.replace(/^[ \t]*\/\/[^@\n]*$/gm, '').replace(/\n\s*\n/g, '\n');
    changes.push({ from: 'inline comments', to: 'removed (per options)' });
  }

  return result;
}

/**
 * Converts SuiteScript 2.0 / 2.x code to SuiteScript 2.1
 */
function convert20To21(source: string, scriptType: ScriptType, options: ConversionOptions): { code: string; changes: { from: string; to: string }[] } {
  const changes: { from: string; to: string }[] = [];
  let code = source;

  // 1. Upgrade @NApiVersion
  if (/@NApiVersion\s+(2\.[0x]|2)/i.test(code)) {
    code = code.replace(/@NApiVersion\s+(2\.[0x]|2)/gi, '@NApiVersion 2.1');
    changes.push({ from: '@NApiVersion 2.0 / 2.x', to: '@NApiVersion 2.1' });
  } else if (!/@NApiVersion/i.test(code)) {
    code = `/**\n * @NApiVersion 2.1\n * @NScriptType ${SCRIPT_TYPE_METADATA[scriptType].annotation}\n */\n` + code;
    changes.push({ from: 'Missing version annotation', to: `@NApiVersion 2.1 · @NScriptType ${SCRIPT_TYPE_METADATA[scriptType].annotation}` });
  }

  // 2. Ensure @NScriptType is accurate for the target script type
  const targetAnnotation = SCRIPT_TYPE_METADATA[scriptType].annotation;
  if (/@NScriptType\s+([A-Za-z]+)/i.test(code)) {
    code = code.replace(/@NScriptType\s+[A-Za-z]+/i, `@NScriptType ${targetAnnotation}`);
  }

  // 3. Modernize syntax
  code = modernizeSyntax(code, options, changes);

  return { code, changes };
}

/**
 * Converts SuiteScript 1.0 code to SuiteScript 2.1
 */
function convert10To21(source: string, scriptType: ScriptType, options: ConversionOptions): { code: string; changes: { from: string; to: string }[] } {
  const changes: { from: string; to: string }[] = [];
  const neededModules = new Set<string>();

  const moduleParamMap: Record<string, string> = {
    'N/record': 'record',
    'N/currentRecord': 'currentRecord',
    'N/search': 'search',
    'N/log': 'log',
    'N/runtime': 'runtime',
    'N/format': 'format',
    'N/email': 'email',
    'N/ui/serverWidget': 'serverWidget',
    'N/https': 'https',
    'N/url': 'url',
    'N/error': 'error',
  };

  let body = source;

  // Extract author header comments if present (preserving non-API documentation)
  let preservedHeader = '';
  const headerMatch = body.match(/^\/\*\*[\s\S]*?\*\//);
  if (headerMatch && !headerMatch[0].includes('@NApiVersion')) {
    preservedHeader = headerMatch[0] + '\n';
    body = body.slice(headerMatch[0].length).trimStart();
  }

  // Remove legacy 1.0 annotations
  body = body.replace(/@NApiVersion[^\n]*/gi, '');
  body = body.replace(/@NScriptType[^\n]*/gi, '');

  // -------------------------------------------------------------
  // 1. Logging API: nlapiLogExecution(type, title, details)
  // Handles multi-line arguments safely
  // -------------------------------------------------------------
  const logRegex = /nlapiLogExecution\s*\(\s*['"](DEBUG|AUDIT|ERROR|EMERGENCY)['"]\s*,\s*([\s\S]*?),\s*([\s\S]*?)\s*\)/g;
  if (logRegex.test(body)) {
    neededModules.add('N/log');
    body = body.replace(logRegex, (match, level, title, details) => {
      const lvl = level.toLowerCase();
      return `log.${lvl}({ title: ${title.trim()}, details: ${details.trim()} })`;
    });
    changes.push({ from: 'nlapiLogExecution(type, title, details)', to: 'log.debug() / log.audit() / log.error()' });
  }

  // Handle dynamic level nlapiLogExecution(lvl, title, details)
  if (/nlapiLogExecution\s*\(/.test(body)) {
    neededModules.add('N/log');
    body = body.replace(/nlapiLogExecution\s*\(\s*([^,]+?)\s*,\s*([\s\S]*?),\s*([\s\S]*?)\s*\)/g, (match, lvl, title, details) => {
      return `log.debug({ title: ${title.trim()}, details: ${details.trim()} })`;
    });
  }

  // -------------------------------------------------------------
  // 2. Record Context APIs
  // -------------------------------------------------------------
  if (/nlapiGetNewRecord\(\)/.test(body)) {
    body = body.replace(/nlapiGetNewRecord\(\)/g, 'context.newRecord');
    changes.push({ from: 'nlapiGetNewRecord()', to: 'context.newRecord' });
  }
  if (/nlapiGetOldRecord\(\)/.test(body)) {
    body = body.replace(/nlapiGetOldRecord\(\)/g, 'context.oldRecord');
    changes.push({ from: 'nlapiGetOldRecord()', to: 'context.oldRecord' });
  }
  if (/nlapiGetRecordType\(\)/.test(body)) {
    body = body.replace(/nlapiGetRecordType\(\)/g, 'context.newRecord ? context.newRecord.type : null');
    changes.push({ from: 'nlapiGetRecordType()', to: 'context.newRecord.type' });
  }
  if (/nlapiGetRecordId\(\)/.test(body)) {
    body = body.replace(/nlapiGetRecordId\(\)/g, 'context.newRecord ? context.newRecord.id : null');
    changes.push({ from: 'nlapiGetRecordId()', to: 'context.newRecord.id' });
  }

  // -------------------------------------------------------------
  // 3. Field Access on Record Instances:
  //    record.getFieldValue('entity') -> record.getValue({ fieldId: 'entity' })
  //    record.setFieldValue('memo', val) -> record.setValue({ fieldId: 'memo', value: val })
  // -------------------------------------------------------------
  const instanceGetRegex = /(\b[a-zA-Z0-9_$.]+)\.getFieldValue\s*\(\s*([\s\S]*?)\s*\)/g;
  if (instanceGetRegex.test(body)) {
    body = body.replace(instanceGetRegex, (match, target, field) => {
      return `${target}.getValue({ fieldId: ${field.trim()} })`;
    });
    changes.push({ from: 'record.getFieldValue(fieldId)', to: 'record.getValue({ fieldId })' });
  }

  const instanceSetRegex = /(\b[a-zA-Z0-9_$.]+)\.setFieldValue\s*\(\s*([\s\S]*?),\s*([\s\S]*?)\s*\)/g;
  if (instanceSetRegex.test(body)) {
    body = body.replace(instanceSetRegex, (match, target, field, val) => {
      return `${target}.setValue({ fieldId: ${field.trim()}, value: ${val.trim()} })`;
    });
    changes.push({ from: 'record.setFieldValue(fieldId, value)', to: 'record.setValue({ fieldId, value })' });
  }

  const instanceGetTextRegex = /(\b[a-zA-Z0-9_$.]+)\.getFieldText\s*\(\s*([\s\S]*?)\s*\)/g;
  if (instanceGetTextRegex.test(body)) {
    body = body.replace(instanceGetTextRegex, (match, target, field) => {
      return `${target}.getText({ fieldId: ${field.trim()} })`;
    });
    changes.push({ from: 'record.getFieldText(fieldId)', to: 'record.getText({ fieldId })' });
  }

  const instanceSetTextRegex = /(\b[a-zA-Z0-9_$.]+)\.setFieldText\s*\(\s*([\s\S]*?),\s*([\s\S]*?)\s*\)/g;
  if (instanceSetTextRegex.test(body)) {
    body = body.replace(instanceSetTextRegex, (match, target, field, val) => {
      return `${target}.setText({ fieldId: ${field.trim()}, text: ${val.trim()} })`;
    });
    changes.push({ from: 'record.setFieldText(fieldId, text)', to: 'record.setText({ fieldId, text })' });
  }

  // -------------------------------------------------------------
  // 4. Standalone nlapiGetFieldValue / nlapiSetFieldValue
  // Dependent on script type: User Event operates on context.newRecord,
  // Client Script operates on context.currentRecord
  // -------------------------------------------------------------
  const standaloneGetRegex = /nlapiGetFieldValue\s*\(\s*([\s\S]*?)\s*\)/g;
  if (standaloneGetRegex.test(body)) {
    if (scriptType === 'Client') {
      body = body.replace(standaloneGetRegex, (match, field) => {
        return `context.currentRecord.getValue({ fieldId: ${field.trim()} })`;
      });
      changes.push({ from: 'nlapiGetFieldValue(fieldId)', to: 'context.currentRecord.getValue({ fieldId })' });
    } else {
      body = body.replace(standaloneGetRegex, (match, field) => {
        return `context.newRecord.getValue({ fieldId: ${field.trim()} })`;
      });
      changes.push({ from: 'nlapiGetFieldValue(fieldId)', to: 'context.newRecord.getValue({ fieldId })' });
    }
  }

  const standaloneSetRegex = /nlapiSetFieldValue\s*\(\s*([\s\S]*?),\s*([\s\S]*?)\s*\)/g;
  if (standaloneSetRegex.test(body)) {
    if (scriptType === 'Client') {
      body = body.replace(standaloneSetRegex, (match, field, val) => {
        return `context.currentRecord.setValue({ fieldId: ${field.trim()}, value: ${val.trim()} })`;
      });
      changes.push({ from: 'nlapiSetFieldValue(fieldId, value)', to: 'context.currentRecord.setValue({ fieldId, value })' });
    } else {
      body = body.replace(standaloneSetRegex, (match, field, val) => {
        return `context.newRecord.setValue({ fieldId: ${field.trim()}, value: ${val.trim()} })`;
      });
      changes.push({ from: 'nlapiSetFieldValue(fieldId, value)', to: 'context.newRecord.setValue({ fieldId, value })' });
    }
  }

  // -------------------------------------------------------------
  // 5. Sublist APIs
  // -------------------------------------------------------------
  const sublistCountRegex = /(\b[a-zA-Z0-9_$.]+)\.getLineItemCount\s*\(\s*([\s\S]*?)\s*\)/g;
  if (sublistCountRegex.test(body)) {
    body = body.replace(sublistCountRegex, (match, target, sublist) => {
      return `${target}.getLineCount({ sublistId: ${sublist.trim()} })`;
    });
    changes.push({ from: 'record.getLineItemCount(sublist)', to: 'record.getLineCount({ sublistId })' });
  }

  const sublistValRegex = /(\b[a-zA-Z0-9_$.]+)\.getLineItemValue\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g;
  if (sublistValRegex.test(body)) {
    body = body.replace(sublistValRegex, (match, target, sublist, field, line) => {
      return `${target}.getSublistValue({ sublistId: ${sublist.trim()}, fieldId: ${field.trim()}, line: (${line.trim()} - 1) })`;
    });
    changes.push({ from: 'record.getLineItemValue(sublist, field, line)', to: 'record.getSublistValue({ sublistId, fieldId, line })' });
  }

  const sublistSetValRegex = /(\b[a-zA-Z0-9_$.]+)\.setLineItemValue\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g;
  if (sublistSetValRegex.test(body)) {
    body = body.replace(sublistSetValRegex, (match, target, sublist, field, line, val) => {
      return `${target}.setSublistValue({ sublistId: ${sublist.trim()}, fieldId: ${field.trim()}, line: (${line.trim()} - 1), value: ${val.trim()} })`;
    });
    changes.push({ from: 'record.setLineItemValue(...)', to: 'record.setSublistValue(...)' });
  }

  // Client Script Current Line
  if (/nlapiGetCurrentLineItemValue\s*\(/.test(body)) {
    body = body.replace(/nlapiGetCurrentLineItemValue\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'context.currentRecord.getCurrentSublistValue({ sublistId: $1, fieldId: $2 })');
    changes.push({ from: 'nlapiGetCurrentLineItemValue()', to: 'context.currentRecord.getCurrentSublistValue()' });
  }
  if (/nlapiSetCurrentLineItemValue\s*\(/.test(body)) {
    body = body.replace(/nlapiSetCurrentLineItemValue\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'context.currentRecord.setCurrentSublistValue({ sublistId: $1, fieldId: $2, value: $3 })');
    changes.push({ from: 'nlapiSetCurrentLineItemValue()', to: 'context.currentRecord.setCurrentSublistValue()' });
  }

  // -------------------------------------------------------------
  // 6. Record CRUD Operations: N/record
  // -------------------------------------------------------------
  if (/nlapiLoadRecord\s*\(/.test(body)) {
    neededModules.add('N/record');
    body = body.replace(/nlapiLoadRecord\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'record.load({ type: $1, id: $2 })');
    changes.push({ from: 'nlapiLoadRecord(type, id)', to: 'record.load({ type, id })' });
  }
  if (/nlapiCreateRecord\s*\(/.test(body)) {
    neededModules.add('N/record');
    body = body.replace(/nlapiCreateRecord\s*\(\s*([^)]+?)\s*\)/g, 'record.create({ type: $1 })');
    changes.push({ from: 'nlapiCreateRecord(type)', to: 'record.create({ type })' });
  }
  if (/nlapiSubmitRecord\s*\(/.test(body)) {
    body = body.replace(/nlapiSubmitRecord\s*\(\s*([^)]+?)\s*\)/g, '$1.save()');
    changes.push({ from: 'nlapiSubmitRecord(rec)', to: 'rec.save()' });
  }
  if (/nlapiDeleteRecord\s*\(/.test(body)) {
    neededModules.add('N/record');
    body = body.replace(/nlapiDeleteRecord\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'record.delete({ type: $1, id: $2 })');
    changes.push({ from: 'nlapiDeleteRecord(type, id)', to: 'record.delete({ type, id })' });
  }
  if (/nlapiSubmitField\s*\(/.test(body)) {
    neededModules.add('N/record');
    body = body.replace(/nlapiSubmitField\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'record.submitFields({ type: $1, id: $2, values: { [$3]: $4 } })');
    changes.push({ from: 'nlapiSubmitField(...)', to: 'record.submitFields(...)' });
  }

  // -------------------------------------------------------------
  // 7. Search Operations: N/search
  // -------------------------------------------------------------
  if (/nlapiSearchRecord\s*\(/.test(body)) {
    neededModules.add('N/search');
    body = body.replace(/nlapiSearchRecord\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'search.create({ type: $1, filters: $3, columns: $4 }).run().getRange({ start: 0, end: 1000 })');
    changes.push({ from: 'nlapiSearchRecord(...)', to: 'search.create(...).run().getRange(...)' });
  }
  if (/nlapiLookupField\s*\(/.test(body)) {
    neededModules.add('N/search');
    body = body.replace(/nlapiLookupField\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'search.lookupFields({ type: $1, id: $2, columns: $3 })');
    changes.push({ from: 'nlapiLookupField(...)', to: 'search.lookupFields(...)' });
  }
  if (/nlapiLoadSearch\s*\(/.test(body)) {
    neededModules.add('N/search');
    body = body.replace(/nlapiLoadSearch\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'search.load({ id: $2 })');
    changes.push({ from: 'nlapiLoadSearch(...)', to: 'search.load({ id })' });
  }

  // -------------------------------------------------------------
  // 8. Runtime Operations: N/runtime
  // -------------------------------------------------------------
  if (/nlapiGetContext\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetContext\(\)/g, 'runtime');
    changes.push({ from: 'nlapiGetContext()', to: 'runtime' });
  }
  if (/nlapiGetUser\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetUser\(\)/g, 'runtime.getCurrentUser().id');
    changes.push({ from: 'nlapiGetUser()', to: 'runtime.getCurrentUser().id' });
  }
  if (/nlapiGetRole\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetRole\(\)/g, 'runtime.getCurrentUser().role');
    changes.push({ from: 'nlapiGetRole()', to: 'runtime.getCurrentUser().role' });
  }
  if (/nlapiGetDepartment\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetDepartment\(\)/g, 'runtime.getCurrentUser().department');
    changes.push({ from: 'nlapiGetDepartment()', to: 'runtime.getCurrentUser().department' });
  }
  if (/nlapiGetLocation\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetLocation\(\)/g, 'runtime.getCurrentUser().location');
    changes.push({ from: 'nlapiGetLocation()', to: 'runtime.getCurrentUser().location' });
  }
  if (/nlapiGetSubsidiary\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetSubsidiary\(\)/g, 'runtime.getCurrentUser().subsidiary');
    changes.push({ from: 'nlapiGetSubsidiary()', to: 'runtime.getCurrentUser().subsidiary' });
  }
  if (/nlapiGetExecutionContext\(\)/.test(body)) {
    neededModules.add('N/runtime');
    body = body.replace(/nlapiGetExecutionContext\(\)/g, 'runtime.executionContext');
    changes.push({ from: 'nlapiGetExecutionContext()', to: 'runtime.executionContext' });
  }

  // -------------------------------------------------------------
  // 9. Format & Utilities: N/format, N/email, N/error, N/ui/serverWidget
  // -------------------------------------------------------------
  if (/nlapiDateToString\s*\(/.test(body)) {
    neededModules.add('N/format');
    body = body.replace(/nlapiDateToString\s*\(\s*([^,]+?)(?:,\s*[^)]+?)?\s*\)/g, 'format.format({ value: $1, type: format.Type.DATE })');
    changes.push({ from: 'nlapiDateToString(...)', to: 'format.format({ value, type })' });
  }
  if (/nlapiStringToDate\s*\(/.test(body)) {
    neededModules.add('N/format');
    body = body.replace(/nlapiStringToDate\s*\(\s*([^,]+?)(?:,\s*[^)]+?)?\s*\)/g, 'format.parse({ value: $1, type: format.Type.DATE })');
    changes.push({ from: 'nlapiStringToDate(...)', to: 'format.parse({ value, type })' });
  }
  if (/nlapiSendEmail\s*\(/.test(body)) {
    neededModules.add('N/email');
    body = body.replace(/nlapiSendEmail\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'email.send({ author: $1, recipients: $2, subject: $3, body: $4 })');
    changes.push({ from: 'nlapiSendEmail(...)', to: 'email.send({ author, recipients, subject, body })' });
  }
  if (/nlapiCreateError\s*\(/.test(body)) {
    neededModules.add('N/error');
    body = body.replace(/nlapiCreateError\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'error.create({ name: $1, message: $2 })');
    changes.push({ from: 'nlapiCreateError(...)', to: 'error.create({ name, message })' });
  }
  if (/nlapiCreateForm\s*\(/.test(body)) {
    neededModules.add('N/ui/serverWidget');
    body = body.replace(/nlapiCreateForm\s*\(\s*([^)]+?)\s*\)/g, 'serverWidget.createForm({ title: $1 })');
    changes.push({ from: 'nlapiCreateForm(title)', to: 'serverWidget.createForm({ title })' });
  }

  // -------------------------------------------------------------
  // 10. Flag Uncertain / Unmapped 1.0 APIs (Rule 9)
  // Flag without breaking business logic
  // -------------------------------------------------------------
  const remainingLegacyMatches = Array.from(body.matchAll(/\b(nlapi[A-Za-z0-9_]+)\s*\(/g));
  const flaggedAPIs = new Set<string>();
  remainingLegacyMatches.forEach(m => {
    const apiName = m[1];
    if (!flaggedAPIs.has(apiName)) {
      flaggedAPIs.add(apiName);
      changes.push({ from: `${apiName}()`, to: `/* TODO: Review 1.0 -> 2.1 mapping for ${apiName} */` });
    }
  });

  // -------------------------------------------------------------
  // 11. Entry Point Function Signatures & Parameters (Rule 5 & 6)
  // -------------------------------------------------------------
  const expectedEntryPoints = SCRIPT_TYPE_METADATA[scriptType].entryPoints;
  const exportedEntryPoints: string[] = [];

  expectedEntryPoints.forEach(ep => {
    // Check if function <ep>(...) is present
    const epRegex = new RegExp(`(^|\\n)([ \\t]*)function\\s+${ep}\\s*\\(([^)]*)\\)\\s*\\{`, 'g');
    if (epRegex.test(body)) {
      exportedEntryPoints.push(ep);
      body = body.replace(epRegex, (match, prefix, indent, rawParams) => {
        const params = rawParams.trim();
        // If parameters were declared in 1.0, map them cleanly to context properties
        let paramMapping = '';
        if (scriptType === 'User Event') {
          if (params === 'type' || params.startsWith('type,')) {
            // Check if context.type !== 'create' or UserEventType can be handled
            paramMapping = `\n${indent}  if (context.type !== context.UserEventType.CREATE && context.type !== 'create' && type === 'create') return; // context type validation`;
          }
        }
        return `${prefix}${indent}const ${ep} = (context) => {`;
      });
      changes.push({ from: `function ${ep}(...)`, to: `const ${ep} = (context) =>` });
    }
  });

  // Handle User Event event type comparisons: if (type !== 'create') -> context.type !== context.UserEventType.CREATE
  if (scriptType === 'User Event') {
    if (/\btype\s*!==\s*['"]create['"]/.test(body)) {
      body = body.replace(/\btype\s*!==\s*['"]create['"]/g, 'context.type !== context.UserEventType.CREATE');
      changes.push({ from: "type !== 'create'", to: 'context.type !== context.UserEventType.CREATE' });
    }
    if (/\btype\s*===\s*['"]create['"]/.test(body)) {
      body = body.replace(/\btype\s*===\s*['"]create['"]/g, 'context.type === context.UserEventType.CREATE');
      changes.push({ from: "type === 'create'", to: 'context.type === context.UserEventType.CREATE' });
    }
  }

  // Suitelet onRequest entry point mapping if custom named (e.g. function suitelet(request, response))
  if (scriptType === 'Suitelet' && exportedEntryPoints.length === 0) {
    const stMatch = body.match(/(^|\n)([ \t]*)function\s+([a-zA-Z0-9_$]+)\s*\(\s*request\s*,\s*response\s*\)\s*\{/);
    if (stMatch) {
      exportedEntryPoints.push('onRequest');
      body = body.replace(stMatch[0], `${stMatch[1]}${stMatch[2]}const onRequest = (context) => {\n${stMatch[2]}  const request = context.request;\n${stMatch[2]}  const response = context.response;`);
      changes.push({ from: `function ${stMatch[3]}(request, response)`, to: 'const onRequest = (context) =>' });
    }
  }

  // If no standard entry points matched, look for top-level functions
  if (exportedEntryPoints.length === 0) {
    const fnMatches = Array.from(body.matchAll(/(^|\n)function\s+([a-zA-Z0-9_$]+)\s*\(/g));
    fnMatches.forEach(m => {
      if (m[2] && !exportedEntryPoints.includes(m[2])) {
        exportedEntryPoints.push(m[2]);
      }
    });
  }

  // Modernize syntax
  body = modernizeSyntax(body, options, changes);

  // If the body already had define, don't double wrap
  if (/define\s*\(\s*\[/.test(body)) {
    return { code: body, changes };
  }

  // Indent body inside define block
  const indentedBody = body
    .split('\n')
    .map(line => (line.trim() ? `  ${line}` : ''))
    .join('\n');

  // Build exports object
  const exportsStr = exportedEntryPoints.length > 0 ? exportedEntryPoints.join(', ') : '';

  // Build AMD dependencies
  const moduleList = Array.from(neededModules);
  const moduleImports = moduleList.map(m => `'${m}'`).join(', ');
  const moduleParams = moduleList.map(m => moduleParamMap[m] || 'mod').join(', ');

  const annotation = SCRIPT_TYPE_METADATA[scriptType].annotation;

  const result = `/**
 * @NApiVersion 2.1
 * @NScriptType ${annotation}
 */
${preservedHeader}define([${moduleImports}], (${moduleParams}) => {
${indentedBody}

  return { ${exportsStr} };
});`;

  changes.unshift({ from: 'SuiteScript 1.0 script', to: `SuiteScript 2.1 AMD module (@NScriptType ${annotation})` });

  return { code: result, changes };
}

/**
 * Validates generated SuiteScript 2.1 code (Rules 6, 7, 8)
 * Real validation - never mocked!
 */
export function validateSuiteScript21(code: string, scriptType: ScriptType): ValidationReport {
  const checks: ValidationCheck[] = [];
  const expectedAnnotation = SCRIPT_TYPE_METADATA[scriptType].annotation;
  const validEntryPoints = SCRIPT_TYPE_METADATA[scriptType].entryPoints;
  const cleanCode = stripComments(code);

  // -------------------------------------------------------------
  // Check 1: @NApiVersion 2.1 & @NScriptType Annotations
  // -------------------------------------------------------------
  const hasVersion21 = /@NApiVersion\s+2\.1/.test(code);
  const scriptTypeMatch = code.match(/@NScriptType\s+([A-Za-z]+)/);
  const foundAnnotation = scriptTypeMatch ? scriptTypeMatch[1] : null;

  if (!hasVersion21) {
    checks.push({
      id: 'version_annotation',
      name: 'Version Annotation',
      status: 'Failed',
      explanation: 'Missing mandatory @NApiVersion 2.1 JSDoc tag in script header.',
      suggestedFix: 'Add " * @NApiVersion 2.1" to the file header JSDoc comment.',
    });
  } else if (!foundAnnotation) {
    checks.push({
      id: 'script_type_annotation',
      name: 'Script Type Annotation',
      status: 'Failed',
      explanation: `Missing @NScriptType annotation. Required: @NScriptType ${expectedAnnotation}.`,
      suggestedFix: `Add " * @NScriptType ${expectedAnnotation}" to the script header.`,
    });
  } else if (foundAnnotation !== expectedAnnotation) {
    checks.push({
      id: 'script_type_annotation',
      name: 'Script Type Annotation',
      status: 'Failed',
      explanation: `Incorrect @NScriptType "${foundAnnotation}". Expected "${expectedAnnotation}" for ${scriptType}.`,
      suggestedFix: `Change @NScriptType to "${expectedAnnotation}".`,
    });
  } else {
    checks.push({
      id: 'annotations',
      name: 'JSDoc Annotations',
      status: 'Passed',
      explanation: `@NApiVersion 2.1 and @NScriptType ${expectedAnnotation} properly declared.`,
    });
  }

  // -------------------------------------------------------------
  // Check 2: AMD define() and Module Imports
  // -------------------------------------------------------------
  const defineMatch = code.match(/define\s*\(\s*\[([^\]]*)\]\s*,\s*(?:\(([^)]*)\)|function\s*\(([^)]*)\))/);
  if (!defineMatch) {
    checks.push({
      id: 'amd_wrapper',
      name: 'AMD Module Wrapper',
      status: 'Failed',
      explanation: 'Script is missing the required define() AMD module wrapper for SuiteScript 2.1.',
      suggestedFix: 'Wrap script logic inside define([\'N/...\'], (...) => { ... return { ... }; });',
    });
  } else {
    const importedModules = defineMatch[1]
      .split(',')
      .map(s => s.replace(/['"\s]/g, ''))
      .filter(Boolean);

    const moduleStaticPatterns: { module: string; regex: RegExp }[] = [
      { module: 'N/record', regex: /\brecord\.(?:load|create|delete|copy|transform|submitFields|attach|detach|Type)\s*[\(.]/ },
      { module: 'N/currentRecord', regex: /\bcurrentRecord\.(?:get)\s*\(/ },
      { module: 'N/search', regex: /\bsearch\.(?:create|load|lookupFields|globalSearch|duplicates|Type|Operator|createColumn|createFilter)\s*[\(.]/ },
      { module: 'N/log', regex: /\blog\.(?:debug|audit|error|emergency)\s*\(/ },
      { module: 'N/runtime', regex: /\bruntime\.(?:getCurrentUser|getCurrentScript|getCurrentSession|executionContext|envType|country|isFeatureInEffect)\b/ },
      { module: 'N/format', regex: /\bformat\.(?:format|parse|Type)\s*[\(.]/ },
      { module: 'N/email', regex: /\bemail\.(?:send|sendCampaignEvent)\s*\(/ },
      { module: 'N/ui/serverWidget', regex: /\bserverWidget\.(?:createForm|createList|createAssistant|FieldType)\s*[\(.]/ },
      { module: 'N/https', regex: /\bhttps\.(?:get|post|put|delete|request|createSecureString)\s*\(/ },
      { module: 'N/url', regex: /\burl\.(?:resolveRecord|resolveScript|resolveTaskLink)\s*\(/ },
      { module: 'N/error', regex: /\berror\.(?:create)\s*\(/ },
    ];

    const missingImports: string[] = [];
    moduleStaticPatterns.forEach(({ module: moduleName, regex }) => {
      if (regex.test(cleanCode) && !importedModules.includes(moduleName)) {
        missingImports.push(moduleName);
      }
    });

    if (missingImports.length > 0) {
      checks.push({
        id: 'module_imports',
        name: 'Module Dependencies',
        status: 'Failed',
        explanation: `Modules used in code but not imported in define(): ${missingImports.join(', ')}.`,
        suggestedFix: `Add ${missingImports.map(m => `'${m}'`).join(', ')} to the define() dependency array.`,
      });
    } else {
      checks.push({
        id: 'module_imports',
        name: 'Module Dependencies',
        status: 'Passed',
        explanation: `All required NetSuite modules (${importedModules.join(', ') || 'none'}) are properly imported.`,
      });
    }
  }

  // -------------------------------------------------------------
  // Check 3: Entry-Point Functions & Exports
  // -------------------------------------------------------------
  const allReturnMatches = Array.from(cleanCode.matchAll(/return\s*\{([^{}]+)\};?/g));
  let returnMatch = allReturnMatches.find(m => {
    const exports = m[1].split(',').map(s => s.trim().split(':')[0].trim());
    return exports.some(exp => validEntryPoints.includes(exp));
  });
  if (!returnMatch && allReturnMatches.length > 0) {
    returnMatch = allReturnMatches[allReturnMatches.length - 1];
  }

  if (!returnMatch) {
    checks.push({
      id: 'entry_point_exports',
      name: 'Entry-Point Exports',
      status: 'Failed',
      explanation: `Script does not export an entry-point object for ${scriptType}. Expected: return { ... };`,
      suggestedFix: `Export valid entry points for ${scriptType} (e.g. ${validEntryPoints.join(', ')}).`,
    });
  } else {
    const rawExports = returnMatch[1]
      .split(',')
      .map(s => s.trim().split(':')[0].trim())
      .filter(Boolean);

    const exportedValidEntryPoints = rawExports.filter(exp => validEntryPoints.includes(exp));

    if (exportedValidEntryPoints.length === 0) {
      checks.push({
        id: 'entry_point_exports',
        name: 'Entry-Point Exports',
        status: 'Failed',
        explanation: `No valid entry points for ${scriptType} are exported. Found: [${rawExports.join(', ')}]. Valid entry points are: [${validEntryPoints.join(', ')}].`,
        suggestedFix: `Export at least one valid entry point function: ${validEntryPoints.join(', ')}.`,
      });
    } else {
      checks.push({
        id: 'entry_point_exports',
        name: 'Entry-Point Exports',
        status: 'Passed',
        explanation: `Valid entry point(s) exported: ${exportedValidEntryPoints.join(', ')}.`,
      });
    }
  }

  // -------------------------------------------------------------
  // Check 4: Function Signatures & Context Parameter
  // -------------------------------------------------------------
  const signatureWarnings: string[] = [];
  validEntryPoints.forEach(ep => {
    // Check if function <ep>(params) exists with non-context signature
    const sigRegex = new RegExp(`\\b${ep}\\s*=\\s*\\(([^)]*)\\)|function\\s+${ep}\\s*\\(([^)]*)\\)`);
    const match = cleanCode.match(sigRegex);
    if (match) {
      const params = (match[1] || match[2] || '').trim();
      if (params && params !== 'context' && !params.startsWith('context,') && !params.includes('{')) {
        // NetSuite Map/Reduce summarize accepts 'summary' or 'summaryContext'
        if (ep === 'summarize' && (params === 'summary' || params === 'summaryContext')) {
          // valid standard NetSuite parameter name
        } else {
          signatureWarnings.push(`${ep}(${params})`);
        }
      }
    }
  });

  if (signatureWarnings.length > 0) {
    checks.push({
      id: 'function_signatures',
      name: 'Function Signatures',
      status: 'Warning',
      explanation: `Legacy parameter signature detected in: ${signatureWarnings.join(', ')}. SuiteScript 2.1 entry points receive a single context object.`,
      suggestedFix: 'Update function parameter to (context) and retrieve properties via context.<field>.',
    });
  } else {
    checks.push({
      id: 'function_signatures',
      name: 'Function Signatures',
      status: 'Passed',
      explanation: 'All entry point functions use valid SuiteScript 2.1 (context) parameter signatures.',
    });
  }

  // -------------------------------------------------------------
  // Check 5: Remaining Legacy 1.0 APIs
  // -------------------------------------------------------------
  const remainingLegacyCalls = new Set<string>();
  const legacyMatches = Array.from(cleanCode.matchAll(/\b(nlapi[A-Za-z0-9_]+|nlobj[A-Za-z0-9_]+)\b/g));
  legacyMatches.forEach(m => remainingLegacyCalls.add(m[1]));

  if (remainingLegacyCalls.size > 0) {
    const list = Array.from(remainingLegacyCalls);
    checks.push({
      id: 'legacy_apis',
      name: 'Legacy 1.0 APIs',
      status: 'Failed',
      explanation: `Found unconverted legacy SuiteScript 1.0 API(s): ${list.join(', ')}.`,
      suggestedFix: `Replace ${list.join(', ')} with SuiteScript 2.1 equivalent N/* module methods.`,
    });
  } else {
    checks.push({
      id: 'legacy_apis',
      name: 'Legacy 1.0 APIs',
      status: 'Passed',
      explanation: 'Zero unconverted legacy nlapi* or nlobj* API calls detected.',
    });
  }

  // -------------------------------------------------------------
  // Check 6: API Mapping & Object Parameters
  // -------------------------------------------------------------
  const positionalCalls: string[] = [];
  if (/\b(?:record|context\.newRecord|context\.currentRecord)\.getValue\s*\(\s*['"][a-zA-Z0-9_]+['"]\s*\)/.test(cleanCode)) {
    positionalCalls.push('getValue(fieldId)');
  }
  if (/\b(?:record|context\.newRecord|context\.currentRecord)\.setValue\s*\(\s*['"][a-zA-Z0-9_]+['"]\s*,/.test(cleanCode)) {
    positionalCalls.push('setValue(fieldId, value)');
  }

  const hasTodos = /\/\*\s*TODO:\s*Review/i.test(code);

  if (positionalCalls.length > 0) {
    checks.push({
      id: 'api_mapping',
      name: 'API Option Objects',
      status: 'Warning',
      explanation: `Positional argument signature detected: ${positionalCalls.join(', ')}. SuiteScript 2.1 methods require options object ({ fieldId, value }).`,
      suggestedFix: 'Convert method call to object options: .getValue({ fieldId }) / .setValue({ fieldId, value }).',
    });
  } else if (hasTodos) {
    checks.push({
      id: 'api_mapping',
      name: 'Logic Preservation Flags',
      status: 'Warning',
      explanation: 'Code contains flagged TODO notices for legacy patterns that require manual sandbox confirmation.',
      suggestedFix: 'Review flagged TODO comments in converted code before deploying to sandbox.',
    });
  } else {
    checks.push({
      id: 'api_mapping',
      name: 'API Option Objects',
      status: 'Passed',
      explanation: 'All API methods adhere to SuiteScript 2.1 parameter object standards.',
    });
  }

  // -------------------------------------------------------------
  // Calculate Overall Status
  // -------------------------------------------------------------
  const failedCount = checks.filter(c => c.status === 'Failed').length;
  const warningCount = checks.filter(c => c.status === 'Warning').length;
  const passedCount = checks.filter(c => c.status === 'Passed').length;

  let overallStatus: ValidationStatus = 'Passed';
  let summary = 'Script fully conforms to SuiteScript 2.1 specifications and NetSuite standards.';

  if (failedCount > 0) {
    overallStatus = 'Failed';
    summary = `Validation failed: ${failedCount} critical requirement(s) not met. Review suggested fixes below.`;
  } else if (warningCount > 0) {
    overallStatus = 'Warning';
    summary = `Validation passed with ${warningCount} advisory warning(s). Test thoroughly in your NetSuite sandbox.`;
  }

  return {
    overallStatus,
    totalChecks: checks.length,
    passedChecks: passedCount,
    warningChecks: warningCount,
    failedChecks: failedCount,
    summary,
    checks,
  };
}

/**
 * Evaluates governance limit risks
 */
function evaluateGovernance(code: string, scriptType: ScriptType): string[] {
  const notes: string[] = [];
  const clean = stripComments(code);

  if (/\b(?:for|while)\b[\s\S]*?\b(?:search\.create|\.load\(|record\.load|\.save\()\b/.test(clean)) {
    notes.push('Loop contains search/record load operations: risk of exceeding NetSuite governance units (1000 units max for UE, 20 units for Client Script).');
  }

  if (scriptType === 'Client') {
    if (/\bsearch\.create\b|\bsearch\.lookupFields\b|\brecord\.load\b/.test(clean)) {
      notes.push('Synchronous search or record lookup detected in Client Script: may degrade browser UI responsiveness. Consider Suitelet or Restlet endpoints.');
    }
  }

  if (scriptType === 'Scheduled' || scriptType === 'Map/Reduce') {
    if (!/getRemainingUsage/.test(clean)) {
      notes.push('Batch script does not inspect getRemainingUsage(): recommend checking runtime governance limits and yielding if usage drops below 100 units.');
    }
  }

  if (notes.length === 0) {
    notes.push('Standard governance consumption: test execution limits and role permissions in your NetSuite sandbox.');
  }

  return notes;
}

/**
 * Detects the script type from annotations or entry-point signatures.
 */
export function detectScriptType(source: string): ScriptType | null {
  // 1. Check explicit JSDoc annotations
  const match = source.match(/@NScriptType\s+([A-Za-z]+)/i);
  if (match) {
    const ann = match[1].toLowerCase();
    if (ann.includes('userevent')) return 'User Event';
    if (ann.includes('client')) return 'Client';
    if (ann.includes('suitelet')) return 'Suitelet';
    if (ann.includes('mapreduce')) return 'Map/Reduce';
    if (ann.includes('scheduled')) return 'Scheduled';
    if (ann.includes('restlet')) return 'RESTlet';
    if (ann.includes('portlet')) return 'Portlet';
    if (ann.includes('massupdate')) return 'Mass Update';
  }

  // 2. Check comments or header descriptions
  if (/\bUser\s*Event\b/i.test(source) && !/\bClient\s*Script\b/i.test(source)) {
    const clean = stripComments(source);
    if (/\b(?:beforeLoad|beforeSubmit|afterSubmit)\b/.test(clean)) {
      return 'User Event';
    }
  }

  // 3. Check entry points in code (excluding comments)
  const clean = stripComments(source);
  const hasUE = /\bfunction\s+(?:beforeLoad|beforeSubmit|afterSubmit)\s*\(/.test(clean);
  const hasClient = /\bfunction\s+(?:pageInit|fieldChanged|postSourcing|sublistChanged|lineInit|validateField|validateLine|validateInsert|validateDelete)\s*\(/.test(clean);
  const hasSuitelet = /\bfunction\s+(?:onRequest|suitelet)\s*\(/.test(clean);
  const hasMR = /\bfunction\s+(?:getInputData|map|reduce|summarize)\s*\(/.test(clean);

  if (hasUE && !hasClient) return 'User Event';
  if (hasClient && !hasUE) return 'Client';
  if (hasSuitelet) return 'Suitelet';
  if (hasMR) return 'Map/Reduce';

  return null;
}

/**
 * Primary conversion engine that converts code strictly according to script version and script type
 */
export async function convertScript(request: ConversionRequest): Promise<ConversionResult> {
  const { source, sourceVersion, scriptType, options } = request;

  // Small delay for UI reactivity
  await new Promise(resolve => setTimeout(resolve, 300));

  // Rule 1: Preserve original script type. Never convert a User Event Script into a Client Script accidentally.
  const detected = detectScriptType(source);
  let effectiveScriptType: ScriptType = scriptType;
  if (detected === 'User Event' && scriptType === 'Client') {
    // Prevent accidental conversion of User Event script into Client Script
    effectiveScriptType = 'User Event';
  } else if (detected && !scriptType) {
    effectiveScriptType = detected;
  }

  let converted: { code: string; changes: { from: string; to: string }[] };

  // If sourceVersion is 2.0 or code has define/NApiVersion 2, modernize 2.0 -> 2.1
  const isV2 = sourceVersion === '2.0' || /@NApiVersion\s+2\.[0x]/i.test(source) || /define\s*\(\s*\[/i.test(source);

  if (isV2) {
    converted = convert20To21(source, effectiveScriptType, options);
  } else {
    converted = convert10To21(source, effectiveScriptType, options);
  }

  // Real validation of the converted SuiteScript 2.1 code (never mock!)
  const validation = validateSuiteScript21(converted.code, effectiveScriptType);
  const governanceNotes = options.governance ? evaluateGovernance(converted.code, effectiveScriptType) : [];

  const checkpoints = [
    { label: '2.1 version annotation', passed: validation.checks.find(c => c.id === 'annotations')?.status === 'Passed' },
    { label: 'Entry point exported', passed: validation.checks.find(c => c.id === 'entry_point_exports')?.status === 'Passed' },
    { label: 'Module dependencies declared', passed: validation.checks.find(c => c.id === 'module_imports')?.status === 'Passed' },
    { label: 'NetSuite execution', passed: false },
  ];

  const summary = `Converted script targeting SuiteScript 2.1 ${SCRIPT_TYPE_METADATA[effectiveScriptType].annotation}. Validation status: ${validation.overallStatus} (${validation.passedChecks}/${validation.totalChecks} checks passed).`;

  return {
    code: converted.code,
    demo: false,
    apiChanges: converted.changes,
    summary,
    governanceNotes,
    checkpoints,
    validation,
    detectedVersion: isV2 ? '2.0' : '1.0',
    detectedType: effectiveScriptType,
  };
}
