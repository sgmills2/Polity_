import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Table,
  Button,
  LinearProgress,
  Sheet
} from '@mui/joy';
import { getPolitician, getPoliticianVotingHistory, getPoliticianScores, getRealDataStatus } from '../../api/politicians';
import PoliticianTopicSlider from '../../components/PoliticianTopicSlider';
import { POLITICAL_TOPICS, type VotingRecord, type Topic, type Politician } from '@polity/shared';

// Interface for real voting data (different from shared VotingRecord)
interface RealVotingRecord {
  id: string;
  politician_id: string;
  bill_id: string;
  vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  vote_date: string;
  congress_member_id: string;
  member_name: string;
  member_party: string;
  member_state: string;
  bill_title: string;
  bill_number: string;
  bill_type: string;
  topics: string[];
}

// Interface for real score data
interface RealPoliticianScore {
  topic_id: string;
  topic_name: string;
  score: number;
  vote_count: number;
  confidence: number;
  last_calculated: string;
}

// Mock scoring system for demonstration (replace with real voting analysis)
const generatePoliticianScore = (politician: Politician, topic: Topic): { score: number; voteCount: number; confidence: number; } => {
  const seed = politician.name.length + topic.name.length;
  const baseScore = ((seed * 7) % 200 - 100) / 100; // Range -1 to 1
  
  // Adjust based on party affiliation for more realistic distribution
  let partyAdjustment = 0;
  if (politician.party === 'Democratic' || politician.party === 'Democrat') {
    partyAdjustment = topic.name.includes('Healthcare') || topic.name.includes('Climate') ? 0.3 : 
                     topic.name.includes('Defense') ? -0.2 : 0.1;
  } else if (politician.party === 'Republican') {
    partyAdjustment = topic.name.includes('Defense') ? 0.3 :
                     topic.name.includes('Healthcare') || topic.name.includes('Climate') ? -0.3 : -0.1;
  }
  
  const score = Math.max(-1, Math.min(1, baseScore + partyAdjustment));
  const voteCount = Math.floor(Math.random() * 50) + 10;
  const confidence = Math.min(1, voteCount / 30);
  
  return { score, voteCount, confidence };
};

const generateMockVotingRecords = (politician: Politician): VotingRecord[] => {
  const records: VotingRecord[] = [];
  const votes: Array<'Yea' | 'Nay' | 'Present' | 'Not Voting'> = ['Yea', 'Nay', 'Present', 'Not Voting'];
  const billTypes = ['HR', 'S', 'HJRes', 'SJRes'];
  
  for (let i = 0; i < 25; i++) {
    const billType = billTypes[Math.floor(Math.random() * billTypes.length)];
    const billNumber = Math.floor(Math.random() * 9999) + 1;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 365));
    
    // Get random topics (1-3 per bill)
    const shuffledTopics = [...POLITICAL_TOPICS].sort(() => 0.5 - Math.random());
    const topicCount = Math.floor(Math.random() * 3) + 1;
    const billTopics = shuffledTopics.slice(0, topicCount);
    
    records.push({
      id: `mock-${i}`,
      politicianId: politician.id,
      billId: `bill-${i}`,
      vote: votes[Math.floor(Math.random() * votes.length)],
      date: date.toISOString().split('T')[0],
      topicIds: billTopics.map(t => t.id)
    });
  }
  
  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const calculatePhilosophy = (scores: Array<{ score: number }>): string => {
  if (scores.length === 0) return 'Unknown';
  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  
  if (avgScore < -0.6) return 'Very Progressive';
  if (avgScore < -0.3) return 'Progressive';
  if (avgScore < -0.1) return 'Liberal';
  if (avgScore < 0.1) return 'Moderate';
  if (avgScore < 0.3) return 'Conservative';
  if (avgScore < 0.6) return 'Very Conservative';
  return 'Far Right';
};

const getPhilosophyColor = (philosophy: string): string => {
  switch (philosophy) {
    case 'Very Progressive': return '#1976D2';
    case 'Progressive': return '#2196F3';
    case 'Liberal': return '#03A9F4';
    case 'Moderate': return '#9C27B0';
    case 'Conservative': return '#FF9800';
    case 'Very Conservative': return '#F44336';
    case 'Far Right': return '#D32F2F';
    default: return '#757575';
  }
};

export default function PoliticianDetail() {
  const { id } = useParams<{ id: string }>();

  // Check real data status
  const { data: dataStatus } = useQuery({
    queryKey: ['realDataStatus'],
    queryFn: getRealDataStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });

  const { data: politician, isLoading: isLoadingPolitician, error: politicianError } = useQuery({
    queryKey: ['politician', id],
    queryFn: () => getPolitician(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: votingHistory, isLoading: isLoadingVotes, error: votesError } = useQuery({
    queryKey: ['politician-voting-history', id],
    queryFn: () => getPoliticianVotingHistory(id!) as Promise<RealVotingRecord[]>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: realScores, isLoading: isLoadingScores, error: scoresError } = useQuery({
    queryKey: ['politician-scores', id],
    queryFn: () => getPoliticianScores(id!) as Promise<RealPoliticianScore[]>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Determine if we have real data or need to use mock data
  const hasRealData = dataStatus?.hasData && realScores && realScores.length > 0;
  
  // Generate topic scores (real or mock)
  const topicScores: Array<{ topic: string; score: number; voteCount: number; confidence: number }> = politician ? (hasRealData ? 
    POLITICAL_TOPICS.map(topic => {
      const realScore = realScores.find((rs: RealPoliticianScore) => rs.topic_name === topic.name);
      return realScore ? {
        topic: topic.name,
        score: realScore.score,
        voteCount: realScore.vote_count,
        confidence: realScore.confidence
      } : {
        topic: topic.name,
        ...generatePoliticianScore(politician, topic)
      };
    }) :
    POLITICAL_TOPICS.map(topic => ({
      topic: topic.name,
      ...generatePoliticianScore(politician, topic)
    }))
  ) : [];

  // Generate voting records (real or mock)
  const mockVotingRecords = politician ? generateMockVotingRecords(politician) : [];
  const hasRealVotingData = votingHistory && votingHistory.length > 0;
  const displayVotingHistory = hasRealVotingData ? votingHistory : mockVotingRecords;

  // Calculate overall statistics
  const philosophy = topicScores.length > 0 ? calculatePhilosophy(topicScores) : 'Unknown';
  const philosophyColor = getPhilosophyColor(philosophy);
  const avgConfidence = topicScores.length > 0 ? topicScores.reduce((sum, s) => sum + s.confidence, 0) / topicScores.length : 0;
  const totalVotes = topicScores.reduce((sum, s) => sum + s.voteCount, 0);

  if (isLoadingPolitician || isLoadingVotes || isLoadingScores) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size="lg" />
      </Box>
    );
  }

  if (politicianError || votesError || scoresError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">
          Error loading politician data. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!politician) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="warning">
          Politician not found.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Data Status Alert */}
      {dataStatus && (
        <Alert 
          color={hasRealData ? "success" : "warning"} 
          sx={{ mb: 3 }}
          startDecorator={hasRealData ? "🎯" : "⚠️"}
        >
          {hasRealData ? (
            `Using real Congressional data: ${dataStatus.billCount} bills, ${dataStatus.voteCount} voting records`
          ) : (
            `Real voting data not available. Using estimated scores based on party affiliation and political trends.`
          )}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Basic Info & Stats */}
        <Grid xs={12} md={4}>
          {/* Basic Information Card */}
          <Card sx={{ p: 3, mb: 3, height: 'fit-content' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={politician.photoUrl || undefined}
                sx={{ width: 80, height: 80, mr: 2 }}
              >
                {politician.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Box>
                <Typography level="h3" sx={{ mb: 1 }}>
                  {politician.name}
                </Typography>
                <Chip color="primary" variant="soft" sx={{ mr: 1 }}>
                  {politician.party}
                </Chip>
                <Chip color="neutral" variant="outlined">
                  {politician.state}
                </Chip>
              </Box>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography level="body-sm" color="neutral" sx={{ mb: 1 }}>
                <strong>Chamber:</strong> {politician.chamber === 'senate' ? 'U.S. Senate' : 'U.S. House of Representatives'}
              </Typography>
              <Typography level="body-sm" color="neutral" sx={{ mb: 1 }}>
                <strong>Role:</strong> {politician.currentRole}
              </Typography>
              <Typography level="body-sm" color="neutral">
                <strong>Serving Since:</strong> {new Date(politician.servingSince).getFullYear()}
              </Typography>
            </Box>
          </Card>

          {/* Political Summary Card */}
          <Card sx={{ p: 3, height: 'fit-content' }}>
            <Typography level="h4" sx={{ mb: 2 }}>Political Summary</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography level="body-sm" color="neutral" sx={{ mb: 1 }}>Overall Philosophy</Typography>
              <Chip 
                size="lg" 
                sx={{ 
                  backgroundColor: philosophyColor,
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              >
                {philosophy}
              </Chip>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography level="body-sm" color="neutral" sx={{ mb: 1 }}>
                Data Confidence: {(avgConfidence * 100).toFixed(0)}%
              </Typography>
              <LinearProgress 
                determinate 
                value={avgConfidence * 100} 
                sx={{ height: 8 }}
                color={avgConfidence > 0.7 ? 'success' : avgConfidence > 0.4 ? 'warning' : 'danger'}
              />
            </Box>

            <Typography level="body-sm" color="neutral">
              <strong>Total Votes Analyzed:</strong> {totalVotes.toLocaleString()}
            </Typography>
          </Card>
        </Grid>

        {/* Right Column - Political Positions & Voting */}
        <Grid xs={12} md={8}>
          {/* Political Spectrum Section */}
          <Box sx={{ mb: 4 }}>
            <Typography level="h3" sx={{ mb: 3 }}>
              Political Positions by Topic
            </Typography>
            
            {!hasRealData && (
              <Alert color="warning" sx={{ mb: 3 }}>
                📊 These scores are estimated based on party affiliation and political trends. 
                Real voting record analysis will provide more accurate positioning.
              </Alert>
            )}

            <Grid container spacing={3}>
              {POLITICAL_TOPICS.map((topic) => {
                const topicScore = topicScores.find(ts => ts.topic === topic.name);
                return (
                  <Grid key={topic.name} xs={12}>
                    <PoliticianTopicSlider
                      topic={topic}
                      politician={politician}
                      score={{
                        score: topicScore?.score || 0,
                        voteCount: topicScore?.voteCount || 0,
                        confidence: topicScore?.confidence || 0
                      }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Voting History Section */}
          <Card sx={{ p: 3 }}>
            <Typography level="h4" sx={{ mb: 3 }}>Recent Voting History</Typography>
            
            {!hasRealVotingData && (
              <Alert color="warning" sx={{ mb: 3 }}>
                🗳️ Showing simulated voting records. Real Congressional voting data will be displayed when available.
              </Alert>
            )}

            <Sheet sx={{ overflow: 'auto', maxHeight: 500 }}>
              <Table stickyHeader>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill</th>
                    <th>Vote</th>
                    <th>Topics</th>
                  </tr>
                </thead>
                <tbody>
                  {displayVotingHistory.slice(0, 15).map((record: any, index: number) => {
                    // Handle both real and mock voting records
                    const date = hasRealVotingData ? record.vote_date : record.date;
                    const billTitle = hasRealVotingData ? record.bill_title : `${record.billId} - Sample Legislation`;
                    const billNumber = hasRealVotingData ? record.bill_number : record.billId;
                    const billType = hasRealVotingData ? record.bill_type : '';
                    const topics = hasRealVotingData ? record.topics : record.topicIds.map((tid: string) => POLITICAL_TOPICS.find(t => t.id === tid)?.name).filter(Boolean);
                    
                    return (
                      <tr key={record.id || index}>
                        <td>
                          <Typography level="body-sm">
                            {new Date(date).toLocaleDateString()}
                          </Typography>
                        </td>
                        <td>
                          <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>
                            {billType} {billNumber}
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            {billTitle?.length > 60 
                              ? `${billTitle.substring(0, 60)}...` 
                              : billTitle}
                          </Typography>
                        </td>
                        <td>
                          <Chip 
                            size="sm"
                            color={
                              record.vote === 'Yea' ? 'success' : 
                              record.vote === 'Nay' ? 'danger' : 
                              record.vote === 'Present' ? 'warning' : 'neutral'
                            }
                            variant="soft"
                          >
                            {record.vote}
                          </Chip>
                        </td>
                        <td>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {topics?.slice(0, 2).map((topicName: string, idx: number) => {
                              const topic = POLITICAL_TOPICS.find(t => t.name === topicName);
                              return (
                                <Chip 
                                  key={idx}
                                  size="sm" 
                                  variant="outlined"
                                  sx={{ 
                                    fontSize: '0.75rem',
                                    backgroundColor: topic?.color + '20',
                                    borderColor: topic?.color
                                  }}
                                >
                                  {topicName?.length > 12 ? `${topicName.substring(0, 12)}...` : topicName}
                                </Chip>
                              );
                            })}
                            {topics && topics.length > 2 && (
                              <Chip size="sm" variant="plain" color="neutral">
                                +{topics.length - 2}
                              </Chip>
                            )}
                          </Box>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Sheet>
            
            <Typography level="body-sm" color="neutral" sx={{ mt: 2, textAlign: 'center' }}>
              Showing {Math.min(15, displayVotingHistory.length)} of {displayVotingHistory.length} voting records
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 