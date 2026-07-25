export interface CloudLlmClient {
  complete(input: { prompt: string; chainId: string }): Promise<{ reply: string; endpoint: string }>;
}

export class MockCloudLlmClient implements CloudLlmClient {
  async complete(input: { prompt: string; chainId: string }): Promise<{ reply: string; endpoint: string }> {
    void input.chainId;
    const trimmed = input.prompt.trim();
    const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
    return {
      reply: `Online (mock): I looked that up. Regarding "${preview}" — here is a short neutral answer.`,
      endpoint: 'mock://cloud-llm',
    };
  }
}
