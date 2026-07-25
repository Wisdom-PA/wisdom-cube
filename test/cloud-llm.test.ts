import { describe, expect, it } from 'vitest';
import { MockCloudLlmClient } from '../src/services/cloud-llm-client.ts';

describe('MockCloudLlmClient', () => {
  it('returns a short neutral reply and mock endpoint', async () => {
    const client = new MockCloudLlmClient();
    const result = await client.complete({ prompt: 'What is the weather in London?', chainId: 'c1' });
    expect(result.endpoint).toBe('mock://cloud-llm');
    expect(result.reply).toContain('Online (mock)');
    expect(result.reply).toContain('weather in London');
  });

  it('truncates long prompts in the reply preview', async () => {
    const client = new MockCloudLlmClient();
    const prompt = 'x'.repeat(120);
    const result = await client.complete({ prompt, chainId: 'c2' });
    expect(result.reply).toContain('...');
  });
});
