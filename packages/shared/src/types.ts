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
  // New fields for political scoring
  overallScore?: number; // -1 (conservative) to 1 (progressive)
  topicScores?: PoliticalScore[];
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
  category: TopicCategory;
  color: string; // For UI theming
  icon: string; // Icon name for UI
}

export type TopicCategory = 
  | 'Healthcare' 
  | 'Reproductive Rights' 
  | 'Defense & War' 
  | 'Economy & Taxes' 
  | 'Environment' 
  | 'Civil Rights' 
  | 'Immigration' 
  | 'Education'
  | 'Criminal Justice'
  | 'Technology & Privacy';

export interface Bill {
  id: string;
  congress: number;
  title: string;
  summary: string;
  introducedDate: string;
  topicIds: string[];
  status: string;
  progressiveScore: number; // -1 (conservative position) to 1 (progressive position)
}

export interface PoliticalScore {
  topicId: string;
  topicName: string;
  score: number; // -1 to 1, where -1 is most conservative, 1 is most progressive
  voteCount: number; // Number of votes contributing to this score
  confidence: number; // 0-1, how confident we are in this score
}

export interface AggregateScore {
  overallScore: number;
  topicScores: PoliticalScore[];
  philosophy: 'Progressive' | 'Liberal' | 'Moderate' | 'Conservative' | 'Very Conservative';
}

// New interface for the slider component
export interface TopicSliderData {
  topic: Topic;
  politicians: Array<{
    politician: Politician;
    score: number;
    voteCount: number;
    confidence: number;
  }>;
}

// Sample topics we'll implement
export const POLITICAL_TOPICS: Topic[] = [
  {
    id: 'healthcare',
    name: 'Universal Healthcare',
    description: 'Support for government-provided healthcare, Medicare for All, etc.',
    category: 'Healthcare',
    color: '#2563eb', // Blue
    icon: 'LocalHospital'
  },
  {
    id: 'reproductive-rights',
    name: 'Reproductive Rights',
    description: 'Support for abortion access, contraception, reproductive freedom',
    category: 'Reproductive Rights', 
    color: '#dc2626', // Red
    icon: 'Female'
  },
  {
    id: 'defense-spending',
    name: 'Defense & War',
    description: 'Support for military spending, foreign interventions, defense budget',
    category: 'Defense & War',
    color: '#059669', // Green
    icon: 'Security'
  },
  {
    id: 'climate-action',
    name: 'Climate Action',
    description: 'Support for environmental regulations, clean energy, climate policies',
    category: 'Environment',
    color: '#16a34a', // Green
    icon: 'Eco'
  },
  {
    id: 'tax-policy',
    name: 'Progressive Taxation',
    description: 'Support for higher taxes on wealthy, corporate tax increases',
    category: 'Economy & Taxes',
    color: '#7c3aed', // Purple
    icon: 'AccountBalance'
  },
  {
    id: 'civil-rights',
    name: 'Civil Rights',
    description: 'Support for LGBTQ+ rights, racial equality, voting rights',
    category: 'Civil Rights',
    color: '#ea580c', // Orange
    icon: 'Diversity3'
  }
]; 