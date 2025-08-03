import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, 
  Typography, 
  Stack, 
  CircularProgress, 
  Alert, 
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  ButtonGroup,
  Sheet,
  Tooltip
} from '@mui/joy';
import { getPoliticians } from '../../api/politicians';
import { POLITICAL_TOPICS, type Politician, type Topic } from '@polity/shared';

// Mock scoring for demonstration (replace with real scores later)
const generateMockScore = (politician: Politician, topic: Topic): number => {
  // Generate consistent scores based on party and topic
  let baseScore = 0;
  
  if (politician.party === 'D') {
    // Democrats are more progressive
    baseScore = -0.3 - (Math.random() * 0.6); // -0.3 to -0.9
  } else if (politician.party === 'R') {
    // Republicans are more conservative  
    baseScore = 0.3 + (Math.random() * 0.6); // 0.3 to 0.9
  } else {
    // Independents vary more
    baseScore = (Math.random() - 0.5) * 1.2; // -0.6 to 0.6
  }
  
  // Add topic-specific variation
  const topicVariation = (Math.sin(politician.name.length + topic.id.length) * 0.3);
  const nameVariation = (Math.sin(politician.state.length) * 0.2);
  
  return Math.max(-1, Math.min(1, baseScore + topicVariation + nameVariation));
};

const generateMockVoteData = () => ({
  voteCount: Math.floor(Math.random() * 20) + 5,
  confidence: 0.6 + (Math.random() * 0.4) // 0.6 to 1.0
});

const ScoreToPosition = (score: number): number => {
  // Convert score from [-1, 1] to [0, 100] for positioning
  return ((score + 1) / 2) * 100;
};

const ScoreToLabel = (score: number): string => {
  if (score < -0.6) return 'Very Progressive';
  if (score < -0.2) return 'Progressive'; 
  if (score < 0.2) return 'Moderate';
  if (score < 0.6) return 'Conservative';
  return 'Very Conservative';
};

const ScoreToColor = (score: number): string => {
  if (score < -0.4) return '#3b82f6'; // Blue for progressive
  if (score < -0.1) return '#0ea5e9'; // Sky blue for lean progressive
  if (score < 0.1) return '#84cc16'; // Green for moderate
  if (score < 0.4) return '#f97316'; // Orange for lean conservative
  return '#dc2626'; // Red for conservative
};

interface PoliticianWithScore {
  politician: Politician;
  score: number;
  voteCount: number;
  confidence: number;
}

interface HoverCardProps {
  politician: Politician;
  score: number;
  topic: Topic;
  voteCount: number;
  confidence: number;
}

function HoverCard({ politician, score, topic, voteCount, confidence }: HoverCardProps) {
  const getDetailedScoreLabel = (score: number): string => {
    if (score < -0.8) return 'Revolutionary Progressive';
    if (score < -0.6) return 'Very Progressive';
    if (score < -0.4) return 'Progressive';
    if (score < -0.2) return 'Lean Progressive';
    if (score < -0.1) return 'Center-Left';
    if (score < 0.1) return 'Moderate';
    if (score < 0.2) return 'Center-Right';
    if (score < 0.4) return 'Lean Conservative';
    if (score < 0.6) return 'Conservative';
    if (score < 0.8) return 'Very Conservative';
    return 'Ultra Conservative';
  };

  const getTopicPosition = (score: number, topic: Topic): string => {
    const label = getDetailedScoreLabel(score);
    return `${label} on ${topic.name}`;
  };

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        minWidth: 280,
        maxWidth: 320,
        boxShadow: 'lg',
        borderColor: ScoreToColor(score),
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src={politician.photoUrl}
            alt={politician.name}
            size="md"
            sx={{ 
              border: `2px solid ${ScoreToColor(score)}`,
              flexShrink: 0 
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography level="title-sm" sx={{ fontWeight: 600 }}>
              {politician.name}
            </Typography>
            <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
              {politician.currentRole} • {politician.state}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            size="sm"
            color={politician.party === 'D' ? 'primary' : politician.party === 'R' ? 'danger' : 'neutral'}
            variant="soft"
          >
            {politician.party === 'D' ? 'Democrat' : politician.party === 'R' ? 'Republican' : 'Independent'}
          </Chip>
          <Chip size="sm" variant="outlined">
            {politician.chamber === 'senate' ? 'Senate' : 'House'}
          </Chip>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography level="body-sm" sx={{ fontWeight: 600, color: ScoreToColor(score), mb: 0.5 }}>
            {getTopicPosition(score, topic)}
          </Typography>
          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
            Score: {score.toFixed(2)} • {voteCount} votes • {(confidence * 100).toFixed(0)}% confidence
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="sm"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              borderColor: ScoreToColor(score),
              color: ScoreToColor(score),
            }}
          >
            {ScoreToLabel(score)}
          </Chip>
          <Chip
            size="sm"
            variant="soft"
            color={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'warning' : 'danger'}
          >
            {confidence > 0.8 ? 'High Confidence' : confidence > 0.6 ? 'Medium Confidence' : 'Low Confidence'}
          </Chip>
        </Box>
      </CardContent>
    </Card>
  );
}

interface TopicSpectrumProps {
  topic: Topic;
  politicians: PoliticianWithScore[];
  partyFilter: string;
}

function TopicSpectrum({ topic, politicians, partyFilter }: TopicSpectrumProps) {
  const filteredPoliticians = useMemo(() => {
    return politicians.filter(p => partyFilter === 'all' || p.politician.party === partyFilter);
  }, [politicians, partyFilter]);

  const stats = useMemo(() => {
    const progressive = filteredPoliticians.filter(p => p.score < -0.2).length;
    const moderate = filteredPoliticians.filter(p => p.score >= -0.2 && p.score <= 0.2).length;
    const conservative = filteredPoliticians.filter(p => p.score > 0.2).length;
    const avgScore = filteredPoliticians.reduce((sum, p) => sum + p.score, 0) / filteredPoliticians.length;
    
    return { progressive, moderate, conservative, avgScore, total: filteredPoliticians.length };
  }, [filteredPoliticians]);

  return (
    <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ 
          width: 40, 
          height: 40, 
          borderRadius: '50%', 
          bgcolor: topic.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.2rem'
        }}>
          {topic.icon === 'LocalHospital' && '🏥'}
          {topic.icon === 'Female' && '⚕️'}
          {topic.icon === 'Security' && '🛡️'}
          {topic.icon === 'Eco' && '🌱'}
          {topic.icon === 'AccountBalance' && '💰'}
          {topic.icon === 'Diversity3' && '⚖️'}
        </Box>
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography level="h4" sx={{ color: topic.color, mb: 0.5 }}>
            {topic.name}
          </Typography>
          <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
            {topic.description}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography level="body-sm" sx={{ fontWeight: 600 }}>
            {stats.total} Politicians
          </Typography>
          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
            Avg: {stats.avgScore.toFixed(2)}
          </Typography>
        </Box>
      </Stack>

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Chip size="sm" color="primary" variant="soft">
          {stats.progressive} Progressive
        </Chip>
        <Chip size="sm" color="neutral" variant="soft">
          {stats.moderate} Moderate
        </Chip>
        <Chip size="sm" color="danger" variant="soft">
          {stats.conservative} Conservative
        </Chip>
      </Stack>

      {/* Spectrum */}
      <Box>
        {/* Labels */}
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            More Progressive
          </Typography>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            More Conservative
          </Typography>
        </Stack>

        {/* Spectrum Line */}
        <Box sx={{ position: 'relative', height: 60, mb: 2 }}>
          {/* Background gradient */}
          <Box 
            sx={{
              position: 'absolute',
              top: '25px',
              left: '0px',
              right: '0px',
              height: '8px',
              background: 'linear-gradient(to right, #3b82f6 0%, #0ea5e9 25%, #84cc16 50%, #f97316 75%, #dc2626 100%)',
              borderRadius: '4px',
              zIndex: 5,
            }}
          />

          {/* Center line */}
          <Box sx={{
            position: 'absolute',
            left: '50%',
            top: '22px',
            width: '1px',
            height: '14px',
            backgroundColor: '#666',
            opacity: 0.6,
            zIndex: 10
          }} />

          {/* Politicians */}
          {filteredPoliticians.map((politicianData, index) => {
            const position = ScoreToPosition(politicianData.score);
            const scoreColor = ScoreToColor(politicianData.score);
            
            return (
              <Tooltip
                key={politicianData.politician.id}
                title={
                  <HoverCard
                    politician={politicianData.politician}
                    score={politicianData.score}
                    topic={topic}
                    voteCount={politicianData.voteCount}
                    confidence={politicianData.confidence}
                  />
                }
                placement="top"
                sx={{ zIndex: 1000 }}
              >
                <Avatar
                  src={politicianData.politician.photoUrl}
                  alt={politicianData.politician.name}
                  size="sm"
                  sx={{
                    position: 'absolute',
                    left: `${position}%`,
                    top: Math.floor(index / 20) * 30 + 10, // Stack vertically when overlapping
                    transform: 'translateX(-50%)',
                    border: `2px solid ${scoreColor}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: `0 0 0 2px ${scoreColor}20`,
                    zIndex: 20,
                    '&:hover': {
                      transform: 'translateX(-50%) scale(1.2)',
                      boxShadow: `0 0 0 4px ${scoreColor}40`,
                      zIndex: 30
                    }
                  }}
                >
                  {politicianData.politician.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Card>
  );
}

export default function PoliticalSpectrum() {
  const [partyFilter, setPartyFilter] = useState<'all' | 'D' | 'R' | 'I'>('all');

  const {
    data: politicians,
    isLoading,
    error
  } = useQuery({
    queryKey: ['politicians'],
    queryFn: getPoliticians
  });

  const topicData = useMemo(() => {
    if (!politicians) return [];
    
    return POLITICAL_TOPICS.map(topic => ({
      topic,
      politicians: politicians.map(politician => {
        const score = generateMockScore(politician, topic);
        const voteData = generateMockVoteData();
        
        return {
          politician,
          score,
          voteCount: voteData.voteCount,
          confidence: voteData.confidence
        };
      }).sort((a, b) => a.score - b.score) // Sort by score for better visualization
    }));
  }, [politicians]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color="danger">
          Error loading politician data: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  if (!politicians || politicians.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color="neutral">
          No politicians found. Please run the data sync to populate the database.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography level="h1" sx={{ mb: 2, fontSize: { xs: '2rem', md: '3rem' } }}>
            Political Spectrum Analysis
          </Typography>
          <Typography level="body-lg" sx={{ color: 'text.secondary', maxWidth: 800, mx: 'auto' }}>
            Explore how politicians align across key political topics. Each spectrum shows the distribution 
            of all politicians from progressive to conservative positions. Hover over politician avatars for detailed information.
          </Typography>
        </Box>

        {/* Party Filter */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box>
            <Typography level="title-sm" sx={{ mb: 1, textAlign: 'center' }}>
              Filter by Party:
            </Typography>
            <ButtonGroup variant="outlined" spacing={0.5}>
              {[
                { value: 'all', label: 'All Parties' },
                { value: 'D', label: 'Democrats' },
                { value: 'R', label: 'Republicans' },
                { value: 'I', label: 'Independents' }
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={partyFilter === value ? 'solid' : 'outlined'}
                  onClick={() => setPartyFilter(value as any)}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
                      backgroundSize: '400% 400%',
                      animation: 'rainbow 2s ease infinite',
                      color: 'white',
                      borderColor: 'transparent',
                    },
                    '@keyframes rainbow': {
                      '0%': { backgroundPosition: '0% 50%' },
                      '50%': { backgroundPosition: '100% 50%' },
                      '100%': { backgroundPosition: '0% 50%' },
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        </Box>

        {/* Topic Spectrums */}
        <Stack spacing={2}>
          {topicData.map(({ topic, politicians }) => (
            <TopicSpectrum
              key={topic.id}
              topic={topic}
              politicians={politicians}
              partyFilter={partyFilter}
            />
          ))}
        </Stack>

        {/* Note about mock data */}
        <Alert color="warning" variant="soft">
          <Typography level="title-sm" sx={{ mb: 1 }}>
            📊 Demo Mode: Mock Political Scores
          </Typography>
          <Typography level="body-sm">
            The political spectrum scores shown here are generated for demonstration purposes. 
            In production, these would be calculated from real voting records and policy positions for each topic.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
} 