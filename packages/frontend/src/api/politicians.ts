import axios from 'axios';
import type { Politician } from '@polity/shared';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

export async function getPoliticians() {
  const response = await api.get<Politician[]>('/api/politicians');
  return response.data;
}

export async function getPolitician(id: string) {
  const response = await api.get<Politician>(`/api/politicians/${id}`);
  return response.data;
}

export async function getPoliticianVotingHistory(id: string) {
  const response = await api.get(`/api/politicians/${id}/voting-history`);
  return response.data;
}

export async function getPoliticianScores(id: string) {
  const response = await api.get(`/api/politicians/${id}/scores`);
  return response.data;
}

export async function syncPoliticians() {
  const response = await api.post('/api/sync/politicians');
  return response.data;
}

// Real data endpoints
export async function getRealDataStatus() {
  const response = await api.get('/api/politicians/data/status');
  return response.data;
}

export async function syncRealVotingData(options: {
  billLimit?: number;
  voteLimit?: number;
  calculateScores?: boolean;
} = {}) {
  const response = await api.post('/api/sync/voting-data', options);
  return response.data;
} 