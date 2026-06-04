import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ─── Public ────────────────────────────────────────────────────────────────

export const getElectionState = () => api.get('/election/state').then(r => r.data);

export const validateMember = (memberId) =>
  api.post('/members/validate', { memberId }).then(r => r.data);

export const getCandidates = (memberId = null) =>
  api.get('/candidates', { params: memberId ? { memberId } : {} }).then(r => r.data);

export const registerCandidate = (data) =>
  api.post('/register', data).then(r => r.data);

export const castVotes = (memberId, votes) =>
  api.post('/vote', { memberId, votes }).then(r => r.data);

export const getPublishedResults = () =>
  api.get('/results').then(r => r.data);

// ─── Admin ─────────────────────────────────────────────────────────────────

export const adminLogin = (username, password) =>
  api.post('/admin/login', { username, password }).then(r => r.data);

export const adminLogout = () =>
  api.post('/admin/logout').then(r => r.data);

export const getAdminMe = () =>
  api.get('/admin/me').then(r => r.data);

export const getAdminElection = () =>
  api.get('/admin/election').then(r => r.data);

export const advanceElection = (action) =>
  api.post(`/admin/election/${action}`).then(r => r.data);

export const generateIds = (count) =>
  api.post('/admin/ids/generate', { count }).then(r => r.data);

export const getAllIds = () =>
  api.get('/admin/ids').then(r => r.data);

export const invalidateId = (id) =>
  api.patch(`/admin/ids/${id}/invalidate`).then(r => r.data);

export const reinstateId = (id) =>
  api.patch(`/admin/ids/${id}/reinstate`).then(r => r.data);

export const getAdminCandidates = () =>
  api.get('/admin/candidates').then(r => r.data);

export const removeCandidate = (id) =>
  api.delete(`/admin/candidates/${id}`).then(r => r.data);

export const closePositionRegistration = (positionId) =>
  api.patch(`/admin/positions/${positionId}/close-registration`).then(r => r.data);

export const getLiveTally = () =>
  api.get('/admin/tally').then(r => r.data);

export const getParticipation = () =>
  api.get('/admin/participation').then(r => r.data);

export const getAdminResults = () =>
  api.get('/admin/results').then(r => r.data);

export const exportResultsCsv = () => window.open('/api/admin/results/export', '_blank');
export const exportIdsCsv = () => window.open('/api/admin/ids/export', '_blank');
