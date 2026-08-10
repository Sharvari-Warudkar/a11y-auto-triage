import { getEmbedding } from './embeddings';
import { search } from './store';
import { Violation, RetrievedContext } from '../types';

export async function retrieveContext(violation: Violation): Promise<RetrievedContext[]> {
  const query = `${violation.id}: ${violation.help}. ${violation.description}`;
  const queryEmbedding = await getEmbedding(query);
  const results = search(queryEmbedding, 3);

  return results.map(r => ({
    criterionId: r.id,
    title: r.title,
    content: r.content,
    score: r.score
  }));
}
