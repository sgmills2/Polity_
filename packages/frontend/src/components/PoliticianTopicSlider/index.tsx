import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Avatar,
  Tooltip,
  LinearProgress,
  Sheet
} from '@mui/joy';
import { Topic, Politician } from '@polity/shared';

interface PoliticianScore {
  score: number; // -1 (progressive) to 1 (conservative)
  voteCount: number;
  confidence: number;
}

interface PoliticianTopicSliderProps {
  topic: Topic;
  politician: Politician;
  score: PoliticianScore;
  showDetails?: boolean;
}

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

const ScoreToColor = (score: number, _party: string): string => {
  // More vibrant colors for individual view that match the gradient
  if (score < -0.4) return '#3b82f6'; // Blue for progressive
  if (score < -0.1) return '#0ea5e9'; // Sky blue for lean progressive
  if (score < 0.1) return '#84cc16'; // Green for moderate
  if (score < 0.4) return '#f97316'; // Orange for lean conservative
  return '#dc2626'; // Red for conservative
};

const getScoreDescription = (score: number, topic: Topic): string => {
  const intensity = Math.abs(score);
  const position = score < 0 ? 'progressive' : 'conservative';
  
  if (intensity < 0.2) {
    return `Takes a moderate position on ${topic.name.toLowerCase()}`;
  } else if (intensity < 0.6) {
    return `Leans ${position} on ${topic.name.toLowerCase()}`;
  } else {
    return `Strongly ${position} on ${topic.name.toLowerCase()}`;
  }
};

export default function PoliticianTopicSlider({ 
  topic, 
  politician, 
  score, 
  showDetails = true 
}: PoliticianTopicSliderProps) {
  const position = ScoreToPosition(score.score);
  const scoreColor = ScoreToColor(score.score, politician.party);

  return (
    <Card variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ 
          width: 32, 
          height: 32, 
          borderRadius: '50%', 
          bgcolor: topic.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1rem'
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
            {getScoreDescription(score.score, topic)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip 
            size="sm" 
            variant="soft"
            sx={{ 
              bgcolor: scoreColor + '20', 
              color: scoreColor,
              border: `1px solid ${scoreColor}40`
            }}
          >
            {ScoreToLabel(score.score)}
          </Chip>
          {showDetails && (
            <Typography level="body-xs" sx={{ color: 'text.tertiary', minWidth: 45 }}>
              {score.score.toFixed(2)}
            </Typography>
          )}
        </Stack>
      </Stack>

      {/* Spectrum */}
      <div style={{ marginBottom: showDetails ? 16 : 0 }}>
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
        <div style={{ position: 'relative', height: 40 }}>
          {/* Background gradient */}
          <div 
            style={{
              position: 'absolute',
              top: '15px',
              left: '0px',
              right: '0px',
              height: '8px',
              background: 'linear-gradient(to right, #3b82f6 0%, #0ea5e9 25%, #84cc16 50%, #f97316 75%, #dc2626 100%)',
              borderRadius: '4px',
              opacity: 1,
              width: '100%',
              zIndex: 5,
              display: 'block',
              pointerEvents: 'none',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          />

          {/* Center line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '12px',
            width: '1px',
            height: '14px',
            backgroundColor: '#666',
            opacity: 0.6,
            zIndex: 10
          }} />

          {/* Politician position */}
          <Tooltip
            title={
              <Box>
                <Typography level="body-sm" sx={{ fontWeight: 600 }}>
                  {politician.name}
                </Typography>
                <Typography level="body-xs">
                  {ScoreToLabel(score.score)} ({score.score.toFixed(2)})
                </Typography>
                <Typography level="body-xs">
                  Based on {score.voteCount} votes
                </Typography>
                <Typography level="body-xs">
                  Confidence: {(score.confidence * 100).toFixed(0)}%
                </Typography>
              </Box>
            }
            placement="top"
          >
            <Avatar
              src={politician.photoUrl}
              alt={politician.name}
              size="sm"
              sx={{
                position: 'absolute',
                left: `${position}%`,
                top: 5,
                transform: 'translateX(-50%)',
                border: `3px solid ${scoreColor}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: `0 0 0 3px ${scoreColor}20`,
                zIndex: 20,
                '&:hover': {
                  transform: 'translateX(-50%) scale(1.15)',
                  boxShadow: `0 0 0 4px ${scoreColor}40`,
                  zIndex: 25
                }
              }}
            >
              {politician.name.split(' ').map(n => n[0]).join('')}
            </Avatar>
          </Tooltip>

          {/* Score indicator line */}
          <div style={{
            position: 'absolute',
            left: `${position}%`,
            top: '12px',
            width: '2px',
            height: '14px',
            backgroundColor: scoreColor,
            transform: 'translateX(-50%)',
            opacity: 0.8,
            zIndex: 15
          }} />
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <Sheet variant="soft" sx={{ p: 1.5, borderRadius: 'sm' }}>
          <Stack direction="row" spacing={3} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography level="body-xs" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Votes:
              </Typography>
              <Chip size="sm" variant="outlined">
                {score.voteCount}
              </Chip>
            </Stack>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography level="body-xs" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Confidence:
              </Typography>
              <Box sx={{ minWidth: 40 }}>
                <LinearProgress
                  determinate
                  value={score.confidence * 100}
                  sx={{ 
                    height: 4,
                    bgcolor: 'background.level2',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: score.confidence > 0.8 ? 'success.500' : 
                              score.confidence > 0.6 ? 'warning.500' : 'danger.500'
                    }
                  }}
                />
              </Box>
              <Typography level="body-xs">
                {(score.confidence * 100).toFixed(0)}%
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography level="body-xs" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Position:
              </Typography>
              <Typography level="body-xs" sx={{ color: scoreColor, fontWeight: 600 }}>
                {position.toFixed(0)}% →
              </Typography>
            </Stack>
          </Stack>
        </Sheet>
      )}
    </Card>
  );
} 