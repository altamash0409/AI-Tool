import { describe, expect, it } from 'vitest';
import { convertDemo, samples } from './demo';
const options = { comments: true, modernize: true, governance: true };
describe('honest sample conversions', () => {
  it('matches bundled samples and labels output as demo', async () => {
    for (const sample of samples) {
      const result = await convertDemo({ source: sample.source, sourceVersion: sample.version, scriptType: sample.type, options });
      expect(result.demo).toBe(true);
      expect(result.code).toContain('DEMO TEMPLATE');
      expect(result.code).toContain('@NApiVersion 2.1');
    }
  });
  it('rejects custom code and mismatched settings', async () => {
    await expect(convertDemo({ source: 'var arbitrary = 1;', sourceVersion: '1.0', scriptType: 'User Event', options })).rejects.toThrow('unmodified sample');
    const sample = samples[0];
    if (!sample) throw new Error('Missing sample');
    await expect(convertDemo({ source: sample.source, sourceVersion: '2.0', scriptType: 'User Event', options })).rejects.toThrow('unmodified sample');
  });
});