const { getEmbedding } = require('./embeddings');
const { search } = require('./store');

async function retrieveContext(violation) {
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

module.exports = { retrieveContext };
