const { Store } = require('express-session');
const { db } = require('../firebase');

class FirestoreStore extends Store {
  constructor(options = {}) {
    super();
    this.collection = options.collection || 'sessions';
  }

  async get(sid, callback) {
    try {
      const doc = await db.collection(this.collection).doc(sid).get();
      if (!doc.exists) return callback(null, null);
      const { session, expires } = doc.data();
      if (expires && Date.now() > expires) {
        await db.collection(this.collection).doc(sid).delete();
        return callback(null, null);
      }
      callback(null, session);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      const expires = session.cookie?.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + 60 * 60 * 1000;
      await db.collection(this.collection).doc(sid).set({ session, expires });
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await db.collection(this.collection).doc(sid).delete();
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = FirestoreStore;
