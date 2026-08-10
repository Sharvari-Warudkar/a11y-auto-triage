const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const PORTKEY_VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY;
const PORTKEY_GATEWAY = 'https://api.portkey.ai/v1';

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${PORTKEY_GATEWAY}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-portkey-api-key': PORTKEY_API_KEY || '',
      'x-portkey-virtual-key': PORTKEY_VIRTUAL_KEY || ''
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000)
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding request failed: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  return data.data[0].embedding;
}
