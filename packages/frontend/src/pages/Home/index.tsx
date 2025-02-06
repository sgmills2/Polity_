import { Link } from 'react-router-dom';
import { Box, Typography, Button, Grid } from '@mui/joy';

export default function Home() {
  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography level="h1" sx={{ mb: 2 }}>
          Welcome to Polity
        </Typography>
        <Typography level="body-lg" sx={{ mb: 4 }}>
          Track and analyze voting patterns of US politicians
        </Typography>
        <Button
          component={Link}
          to="/politicians"
          size="lg"
          sx={{ minWidth: 200 }}
        >
          View Politicians
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 6 }}>
        <Grid xs={12} md={4}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography level="h3" sx={{ mb: 2 }}>
              Voting Records
            </Typography>
            <Typography>
              Analyze detailed voting histories from Congress.gov
            </Typography>
          </Box>
        </Grid>
        <Grid xs={12} md={4}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography level="h3" sx={{ mb: 2 }}>
              Issue Analysis
            </Typography>
            <Typography>
              See where politicians stand on key issues
            </Typography>
          </Box>
        </Grid>
        <Grid xs={12} md={4}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography level="h3" sx={{ mb: 2 }}>
              Political Spectrum
            </Typography>
            <Typography>
              Visualize political leanings across different topics
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
} 