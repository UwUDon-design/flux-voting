const router = require('express').Router();
const { db } = require('../firebase');
const { sanitizeText } = require('../utils/sanitize');
const { voteLimiter } = require('../middleware/rateLimiter');

// GET /api/election/state
router.get('/election/state', async (req, res) => {
  try {
    const snap = await db.collection('election').doc('current').get();
    res.json({ phase: snap.exists ? snap.data().phase : 'SETUP' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/members/validate
router.post('/members/validate', async (req, res) => {
  try {
    const id = (req.body.memberId || '').toString().toUpperCase().trim();
    if (!id) return res.status(400).json({ error: 'Member ID required' });

    const snap = await db.collection('members').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Invalid member ID' });
    const m = snap.data();
    if (m.status === 'invalid') return res.status(403).json({ error: 'This ID has been invalidated' });

    res.json({
      memberId: snap.id,
      name: m.name || null,
      status: m.status,
      votedPositions: m.voted_positions || [],
      registeredPositions: m.registered_positions || [],
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/candidates?memberId=FLUX-XXXX  (memberId optional — filters out self)
router.get('/candidates', async (req, res) => {
  try {
    const memberIdFilter = req.query.memberId
      ? req.query.memberId.toString().toUpperCase().trim()
      : null;

    const [posSnap, candSnap] = await Promise.all([
      db.collection('positions').orderBy('order').get(),
      db.collection('candidates').get(),
    ]);

    const positions = posSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const candidates = candSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json(positions.map(p => ({
      id: p.id,
      title: p.title,
      order: p.order,
      registrationClosed: p.registration_closed,
      candidates: candidates
        .filter(c => c.position_id === p.id && c.member_id !== memberIdFilter)
        .map(c => ({ id: c.id, name: c.name, bio: c.bio || null })),
    })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/register
router.post('/register', voteLimiter, async (req, res) => {
  try {
    const { memberId, name, positionId, bio } = req.body;
    if (!memberId || !name || !positionId) {
      return res.status(400).json({ error: 'memberId, name, and positionId are required' });
    }

    const cleanId = memberId.toString().toUpperCase().trim();
    const cleanName = sanitizeText(name);
    const cleanBio = bio ? sanitizeText(bio) : null;

    if (!cleanName) return res.status(400).json({ error: 'Name cannot be empty' });

    // Phase check outside transaction (fast fail)
    const elSnap = await db.collection('election').doc('current').get();
    if (!elSnap.exists || elSnap.data().phase !== 'REGISTRATION') {
      return res.status(403).json({ error: 'Candidate registration is not currently open' });
    }

    const memberRef = db.collection('members').doc(cleanId);
    const positionRef = db.collection('positions').doc(positionId);
    // Use auto-ID for candidate doc (new ref created outside transaction)
    const candidateRef = db.collection('candidates').doc();

    await db.runTransaction(async (t) => {
      const [memberSnap, posSnap] = await Promise.all([
        t.get(memberRef),
        t.get(positionRef),
      ]);

      if (!memberSnap.exists) throw apiError('Invalid member ID', 404);
      if (memberSnap.data().status === 'invalid') throw apiError('This ID has been invalidated', 403);
      if ((memberSnap.data().registered_positions || []).length > 0) throw apiError('You have already registered for a position. Each member may only run for one position.', 409);
      if (!posSnap.exists) throw apiError('Invalid position', 404);

      const pos = posSnap.data();
      if (pos.registration_closed) throw apiError('Registration for this position is closed', 403);

      const registeredIds = pos.registered_member_ids || [];
      if (registeredIds.includes(cleanId)) throw apiError('You are already registered for this position', 409);
      if (registeredIds.length >= 3) throw apiError('This position is full (3 candidates maximum)', 403);

      const newRegistered = [...registeredIds, cleanId];
      const nowFull = newRegistered.length >= 3;

      t.set(candidateRef, {
        member_id: cleanId,
        position_id: positionId,
        name: cleanName,
        bio: cleanBio,
        created_at: new Date().toISOString(),
      });

      t.update(positionRef, {
        registered_member_ids: newRegistered,
        registration_closed: nowFull,
      });

      const memberData = memberSnap.data();
      const regPositions = memberData.registered_positions || [];
      t.update(memberRef, {
        status: 'registered_candidate',
        name: cleanName,
        registered_positions: [...regPositions, positionId],
      });
    });

    res.json({ success: true, message: 'Registered as a candidate successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/vote
router.post('/vote', voteLimiter, async (req, res) => {
  try {
    const { memberId, votes } = req.body;
    if (!memberId || !Array.isArray(votes) || votes.length === 0) {
      return res.status(400).json({ error: 'memberId and votes[] are required' });
    }

    const cleanId = memberId.toString().toUpperCase().trim();

    // Phase check (fast fail)
    const elSnap = await db.collection('election').doc('current').get();
    if (!elSnap.exists || elSnap.data().phase !== 'VOTING') {
      return res.status(403).json({ error: 'Voting is not currently open' });
    }

    // Validate each candidate outside the transaction (reads only, no writes)
    for (const v of votes) {
      if (!v.positionId || !v.candidateId) {
        throw apiError('Each vote must have positionId and candidateId', 400);
      }
      const candSnap = await db.collection('candidates').doc(v.candidateId).get();
      if (!candSnap.exists) throw apiError(`Invalid candidate: ${v.candidateId}`, 400);
      const cand = candSnap.data();
      if (cand.position_id !== v.positionId) throw apiError('Candidate does not belong to that position', 400);
      if (cand.member_id === cleanId) throw apiError('You cannot vote for yourself', 403);
    }

    // Build vote document refs (composite key = uniqueness constraint)
    const voteEntries = votes.map(v => ({
      ref: db.collection('votes').doc(`${cleanId}__${v.positionId}`),
      positionId: v.positionId,
      candidateId: v.candidateId,
    }));

    const memberRef = db.collection('members').doc(cleanId);

    await db.runTransaction(async (t) => {
      const memberSnap = await t.get(memberRef);
      if (!memberSnap.exists) throw apiError('Invalid member ID', 404);
      if (memberSnap.data().status === 'invalid') throw apiError('This ID has been invalidated', 403);

      const votedPositions = memberSnap.data().voted_positions || [];

      // Read all vote docs atomically
      const voteSnaps = await Promise.all(voteEntries.map(v => t.get(v.ref)));

      for (let i = 0; i < voteEntries.length; i++) {
        const { positionId } = voteEntries[i];
        if (votedPositions.includes(positionId) || voteSnaps[i].exists) {
          throw apiError(`You have already voted for this position`, 409);
        }
      }

      const newVotedPositions = [...votedPositions, ...voteEntries.map(v => v.positionId)];

      for (const entry of voteEntries) {
        t.set(entry.ref, {
          member_id: cleanId,
          position_id: entry.positionId,
          candidate_id: entry.candidateId,
          cast_at: new Date().toISOString(),
        });
      }

      t.update(memberRef, {
        voted_positions: newVotedPositions,
        status: 'voted',
      });
    });

    res.json({ success: true, message: 'Votes cast successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/results  (only when PUBLISHED)
router.get('/results', async (req, res) => {
  try {
    const elSnap = await db.collection('election').doc('current').get();
    if (!elSnap.exists || elSnap.data().phase !== 'PUBLISHED') {
      return res.status(403).json({ error: 'Results have not been published yet' });
    }
    res.json(await computeResults());
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

function apiError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function computeResults() {
  const [posSnap, candSnap, voteSnap] = await Promise.all([
    db.collection('positions').orderBy('order').get(),
    db.collection('candidates').get(),
    db.collection('votes').get(),
  ]);

  const positions = posSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const candidates = candSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const votes = voteSnap.docs.map(d => d.data());

  return positions.map(pos => {
    const posCandidates = candidates.filter(c => c.position_id === pos.id);
    const posVotes = votes.filter(v => v.position_id === pos.id);
    const total = posVotes.length;

    const results = posCandidates
      .map(c => ({
        id: c.id,
        name: c.name,
        votes: posVotes.filter(v => v.candidate_id === c.id).length,
        percentage: 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    results.forEach(r => {
      r.percentage = total > 0 ? Math.round((r.votes / total) * 100) : 0;
    });

    const maxVotes = results[0]?.votes ?? 0;
    const topCandidates = results.filter(r => r.votes === maxVotes && maxVotes > 0);
    const isTie = topCandidates.length > 1;

    return {
      positionId: pos.id,
      positionTitle: pos.title,
      order: pos.order,
      candidates: results,
      winner: isTie ? null : (topCandidates[0] || null),
      isTie,
      tiedCandidates: isTie ? topCandidates : [],
      totalVotes: total,
    };
  });
}

module.exports = router;
module.exports.computeResults = computeResults;
