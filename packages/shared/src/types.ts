export type Chamber = 'senate' | 'house';

export interface Politician {
  id: string;
  name: string;
  state: string;
  chamber: Chamber;
  party: string;
  photoUrl: string;
  description: string;
  currentRole: string;
  servingSince: string;
}

export type VoteType = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

export interface VotingRecord {
  id: string;
  politicianId: string;
  billId: string;
  date: string;
  vote: VoteType;
  topicIds: string[];
}

export interface Topic {
  id: string;
  name: string;
  description: string;
}

export interface Bill {
  id: string;
  congress: number;
  title: string;
  summary: string;
  introducedDate: string;
  topicIds: string[];
  status: string;
}

export interface PoliticalScore {
  topicId: string;
  score: number; // -1 to 1, where -1 is most conservative, 1 is most liberal
}

export interface AggregateScore {
  overallScore: number;
  topicScores: PoliticalScore[];
  philosophy: 'Progressive' | 'Liberal' | 'Moderate' | 'Conservative' | 'Very Conservative';
} 