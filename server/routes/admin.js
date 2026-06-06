const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase');
const { requireAdmin } = require('../middleware/adminAuth');
const { generateBulkIds } = require('../utils/idGenerator');
const { sanitizeText } = require('../utils/sanitize');
const { computeResults } = require('./public');

// ─── Auth ──────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const validUsername = username === process.env.ADMIN_USERNAME;
    const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || '');

    if (!validUsername || !validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { isAdmin: true, username },
      process.env.SESSION_SECRET || 'dev-secret-change-this',
      { expiresIn: '1h' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

// ─── Election state ────────────────────────────────────────────────────────

router.get('/election', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('election').doc('current').get();
    res.json(snap.exists ? snap.data() : { phase: 'SETUP' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

const PHASE_TRANSITIONS = {
  open_registration:  { from: 'SETUP',        to: 'REGISTRATION' },
  close_registration: { from: 'REGISTRATION', to: 'VOTING' },
  open_voting:        { from: 'REGISTRATION', to: 'VOTING' },
  close_voting:       { from: 'VOTING',       to: 'RESULTS' },
  publish_results:    { from: 'RESULTS',      to: 'PUBLISHED' },
};

router.post('/election/:action', requireAdmin, async (req, res) => {
  try {
    const { action } = req.params;
    const transition = PHASE_TRANSITIONS[action];
    if (!transition) return res.status(400).json({ error: 'Unknown action' });

    const elRef = db.collection('election').doc('current');
    const snap = await elRef.get();
    const currentPhase = snap.exists ? snap.data().phase : 'SETUP';

    if (currentPhase !== transition.from) {
      return res.status(409).json({
        error: `Cannot perform '${action}' from phase '${currentPhase}'`,
      });
    }

    const now = new Date().toISOString();
    const updates = { phase: transition.to };

    if (action === 'close_registration' || action === 'open_voting') {
      // Close all positions when transitioning to voting
      const posSnap = await db.collection('positions').get();
      const batch = db.batch();
      posSnap.docs.forEach(d => batch.update(d.ref, { registration_closed: true }));
      batch.update(elRef, { phase: 'VOTING', voting_opened_at: now });
      await batch.commit();
      return res.json({ success: true, phase: 'VOTING' });
    }

    if (action === 'close_voting') updates.voting_closed_at = now;
    if (action === 'publish_results') updates.results_published_at = now;

    await elRef.update(updates);
    res.json({ success: true, phase: transition.to });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Member ID management ──────────────────────────────────────────────────

router.post('/ids/generate', requireAdmin, async (req, res) => {
  try {
    const count = parseInt(req.body.count, 10);
    if (!count || count < 1 || count > 500) {
      return res.status(400).json({ error: 'count must be between 1 and 500' });
    }

    const ids = await generateBulkIds(db, count);
    const batch = db.batch();
    const now = new Date().toISOString();

    ids.forEach(id => {
      batch.set(db.collection('members').doc(id), {
        status: 'generated',
        name: null,
        voted_positions: [],
        registered_positions: [],
        created_at: now,
      });
    });

    await batch.commit();
    res.json({ success: true, count: ids.length, ids });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/ids', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('members').get();
    const members = snap.docs.map(d => ({
      id: d.id,
      status: d.data().status,
      name: d.data().name || null,
      votedPositions: d.data().voted_positions || [],
      registeredPositions: d.data().registered_positions || [],
      createdAt: d.data().created_at,
    }));
    res.json(members);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ids/export', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('members').get();
    const rows = [['ID', 'Status', 'Name', 'Voted Positions', 'Created At']];

    snap.docs.forEach(d => {
      const m = d.data();
      rows.push([
        d.id,
        m.status,
        m.name || '',
        (m.voted_positions || []).join('; '),
        m.created_at || '',
      ]);
    });

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flux-member-ids.csv"');
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/ids/:id/invalidate', requireAdmin, async (req, res) => {
  try {
    const memberId = req.params.id.toUpperCase();
    const snap = await db.collection('members').doc(memberId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Member ID not found' });

    await db.collection('members').doc(memberId).update({ status: 'invalid' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/ids/:id/reinstate', requireAdmin, async (req, res) => {
  try {
    const memberId = req.params.id.toUpperCase();
    const snap = await db.collection('members').doc(memberId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Member ID not found' });

    await db.collection('members').doc(memberId).update({ status: 'generated' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Candidate management ──────────────────────────────────────────────────

router.get('/candidates', requireAdmin, async (req, res) => {
  try {
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
      registeredCount: (p.registered_member_ids || []).length,
      candidates: candidates
        .filter(c => c.position_id === p.id)
        .map(c => ({
          id: c.id,
          memberId: c.member_id,
          name: c.name,
          bio: c.bio || null,
          createdAt: c.created_at,
        })),
    })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/candidates/:id', requireAdmin, async (req, res) => {
  try {
    const candRef = db.collection('candidates').doc(req.params.id);
    const candSnap = await candRef.get();
    if (!candSnap.exists) return res.status(404).json({ error: 'Candidate not found' });

    const { member_id, position_id } = candSnap.data();
    const posRef = db.collection('positions').doc(position_id);
    const memberRef = db.collection('members').doc(member_id);

    await db.runTransaction(async (t) => {
      const [posSnap, memberSnap] = await Promise.all([t.get(posRef), t.get(memberRef)]);

      // Remove from position's registered_member_ids
      const registeredIds = (posSnap.data()?.registered_member_ids || []).filter(id => id !== member_id);
      t.update(posRef, {
        registered_member_ids: registeredIds,
        registration_closed: registeredIds.length >= 3,
      });

      // Remove position from member's registered_positions
      if (memberSnap.exists) {
        const regPositions = (memberSnap.data().registered_positions || []).filter(p => p !== position_id);
        const updates = { registered_positions: regPositions };
        if (regPositions.length === 0 && memberSnap.data().status === 'registered_candidate') {
          updates.status = 'generated';
        }
        t.update(memberRef, updates);
      }

      t.delete(candRef);
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/positions/:id/close-registration', requireAdmin, async (req, res) => {
  try {
    const posRef = db.collection('positions').doc(req.params.id);
    const snap = await posRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Position not found' });

    await posRef.update({ registration_closed: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Live tally & participation ────────────────────────────────────────────

router.get('/tally', requireAdmin, async (req, res) => {
  try {
    const [posSnap, candSnap, voteSnap] = await Promise.all([
      db.collection('positions').orderBy('order').get(),
      db.collection('candidates').get(),
      db.collection('votes').get(),
    ]);

    const positions = posSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const candidates = candSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const votes = voteSnap.docs.map(d => d.data());

    const tally = positions.map(pos => ({
      positionId: pos.id,
      positionTitle: pos.title,
      candidates: candidates
        .filter(c => c.position_id === pos.id)
        .map(c => ({
          id: c.id,
          name: c.name,
          votes: votes.filter(v => v.candidate_id === c.id).length,
        }))
        .sort((a, b) => b.votes - a.votes),
      totalVotes: votes.filter(v => v.position_id === pos.id).length,
    }));

    res.json(tally);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/participation', requireAdmin, async (req, res) => {
  try {
    const membersSnap = await db.collection('members').get();
    const members = membersSnap.docs.map(d => d.data());

    const total = members.filter(m => m.status !== 'invalid').length;
    const voted = members.filter(m => m.status === 'voted').length;
    const registered = members.filter(m => m.status === 'registered_candidate').length;
    const unused = members.filter(m => m.status === 'generated').length;
    const invalid = members.filter(m => m.status === 'invalid').length;

    res.json({ total, voted, registered, unused, invalid });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Results ───────────────────────────────────────────────────────────────

router.get('/results', requireAdmin, async (req, res) => {
  try {
    const elSnap = await db.collection('election').doc('current').get();
    const phase = elSnap.exists ? elSnap.data().phase : 'SETUP';

    if (phase !== 'RESULTS' && phase !== 'PUBLISHED') {
      return res.status(403).json({ error: 'Voting must be closed to view results' });
    }

    res.json(await computeResults());
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/results/export', requireAdmin, async (req, res) => {
  try {
    const results = await computeResults();
    const rows = [['Position', 'Candidate', 'Votes', 'Percentage', 'Result']];

    results.forEach(pos => {
      pos.candidates.forEach(c => {
        let result = '';
        if (pos.isTie && pos.tiedCandidates.some(t => t.id === c.id)) result = 'TIE';
        else if (pos.winner?.id === c.id) result = 'WINNER';
        rows.push([pos.positionTitle, c.name, c.votes, `${c.percentage}%`, result]);
      });
    });

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flux-results.csv"');
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
