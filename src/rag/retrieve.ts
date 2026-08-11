import { search } from './store';
import { Violation, RetrievedContext } from '../types';

export function retrieveContext(violation: Violation): RetrievedContext[] {
  const query = `${violation.id} ${violation.help} ${violation.description}`;
  const results = search(query, 3);

  return results.map(r => ({
    criterionId: r.id,
    title: r.title,
    content: r.content,
    score: r.score
  }));
}
