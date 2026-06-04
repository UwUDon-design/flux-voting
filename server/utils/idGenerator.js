// Excludes visually confusable characters: 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRawId() {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `FLUX-${suffix}`;
}

async function generateBulkIds(db, count) {
  const existingSnap = await db.collection('members').get();
  const existingSet = new Set(existingSnap.docs.map(d => d.id));

  const generated = new Set();
  let attempts = 0;
  const maxAttempts = count * 20;

  while (generated.size < count && attempts < maxAttempts) {
    const id = generateRawId();
    if (!existingSet.has(id) && !generated.has(id)) {
      generated.add(id);
    }
    attempts++;
  }

  if (generated.size < count) {
    throw new Error('Could not generate enough unique IDs — try again');
  }

  return [...generated];
}

module.exports = { generateBulkIds };
