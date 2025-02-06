import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  Grid,
  AspectRatio,
  Divider,
  CircularProgress,
  Alert
} from '@mui/joy';
import { getPoliticians } from '../../api/politicians';

export default function PoliticianList() {
  const { data: politicians, isLoading, error } = useQuery({
    queryKey: ['politicians'],
    queryFn: getPoliticians
  });

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
          Error loading politicians. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography level="h1" sx={{ mb: 2 }}>
        Politicians
      </Typography>

      <Grid container spacing={2}>
        {politicians?.map((politician) => (
          <Grid key={politician.id} xs={12} sm={6} md={4} lg={3}>
            <Card
              component={Link}
              to={`/politicians/${politician.id}`}
              sx={{
                height: '100%',
                textDecoration: 'none',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <AspectRatio ratio="1" sx={{ mb: 1 }}>
                {politician.photoUrl ? (
                  <img
                    src={politician.photoUrl}
                    alt={politician.name}
                    loading="lazy"
                  />
                ) : (
                  <Box
                    sx={{
                      background: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    No Photo
                  </Box>
                )}
              </AspectRatio>

              <Typography level="h4">{politician.name}</Typography>
              <Typography level="body-sm" sx={{ mb: 1 }}>
                {politician.party} - {politician.state}
              </Typography>

              <Divider />

              <Typography level="body-xs" sx={{ mt: 1 }}>
                {politician.currentRole}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 