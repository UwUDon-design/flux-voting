require('dotenv').config();
const { db } = require('./firebase');

const POSITIONS = [
  { id: 'president',           title: 'President',                order: 1 },
  { id: 'vice-president',      title: 'Vice President',           order: 2 },
  { id: 'general-secretary',   title: 'General Secretary',        order: 3 },
  { id: 'treasurer',           title: 'Treasurer',                order: 4 },
  { id: 'director-operations', title: 'Director of Operations',   order: 5 },
  { id: 'director-pr',         title: 'Director of PR and Marketing', order: 6 },
];

async function seed() {
  console.log('Seeding positions...');
  const batch = db.batch();

  for (const pos of POSITIONS) {
    const ref = db.collection('positions').doc(pos.id);
    batch.set(ref, {
      title: pos.title,
      order: pos.order,
      max_candidates: 3,
      registration_closed: false,
      registered_member_ids: [],
    }, { merge: true });
  }

  // Create singleton election document in SETUP phase
  const electionRef = db.collection('election').doc('current');
  batch.set(electionRef, {
    phase: 'SETUP',
    created_at: new Date().toISOString(),
    voting_opened_at: null,
    voting_closed_at: null,
    results_published_at: null,
  }, { merge: true });

  await batch.commit();
  console.log('Seed complete. 6 positions and election document created.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
