# The Flux — EXCO Voting Platform

Web-based election platform for The Flux EXCO 2026. Built with React + Vite (frontend) and Node.js + Express + Firebase Firestore (backend).

---

## Setup

### 1. Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Enable **Firestore Database** (start in production mode).
3. Go to **Project Settings → Service Accounts** and generate a new private key. Download the JSON file.
4. Add these Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // All access via server-side Admin SDK only
    }
  }
}
```

### 2. Server

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` with your values:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SESSION_SECRET=a-long-random-string-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
PORT=3001
CLIENT_URL=http://localhost:5173
```

> **Note on `FIREBASE_PRIVATE_KEY`:** Copy the entire key from the downloaded JSON, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Replace literal newlines with `\n` and wrap the whole thing in double quotes.

Seed the database with positions:

```bash
npm run seed
```

Start the server:

```bash
npm run dev      # development (nodemon)
npm start        # production
```

### 3. Client

```bash
cd client
npm install
npm run dev      # development server on :5173
npm run build    # production build → dist/
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (with `\n`) |
| `SESSION_SECRET` | Express session secret (long random string) |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password (plain text in env is fine; never commit `.env`) |
| `PORT` | Server port (default: 3001) |
| `CLIENT_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |

---

## Election Workflow

1. **Pre-election:** Admin generates member IDs → Admin Panel → Member IDs → Generate
2. **Registration:** Admin advances to REGISTRATION phase from Dashboard. Members use `/register` with their Member ID.
3. **Voting:** Admin advances to VOTING phase (this locks all registrations). Members use `/vote`.
4. **Results:** Admin closes voting, views results at `/admin/results`, then publishes to make them public at `/results`.

---

## Routes

### Public
| Route | Description |
|---|---|
| `/` | Landing page |
| `/register` | Candidate registration |
| `/vote` | Voter portal |
| `/vote/confirmed` | Post-vote confirmation |
| `/results` | Published results |

### Admin
| Route | Description |
|---|---|
| `/admin/login` | Admin login |
| `/admin` | Dashboard + phase controls |
| `/admin/ids` | Member ID management |
| `/admin/candidates` | Candidate management |
| `/admin/voting` | Live vote tally |
| `/admin/results` | Results + publish |

---

## Deployment (Vercel + Firebase Hosting)

**Frontend** — deploy `client/dist` to Vercel or Firebase Hosting. Set `VITE_API_URL` if the API is on a different domain and update `src/api/index.js` accordingly.

**Backend** — deploy to Railway, Render, or a VPS. Set all env vars in the platform dashboard. Ensure `CLIENT_URL` points to your deployed frontend.

---

## Security Notes

- All votes are double-validated: server-side check + Firestore transaction using composite document keys (`{memberId}__{positionId}`) as a natural unique constraint.
- Member IDs are submitted via POST body — never exposed in URLs.
- Admin routes are protected by server-side session middleware.
- Rate limiting: 60 req/min general, 20 req/min on vote/registration endpoints.
- Input is sanitised with `sanitize-html` on the server.
