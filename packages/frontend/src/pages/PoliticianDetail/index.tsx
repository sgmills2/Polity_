import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  AspectRatio,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  Table
} from '@mui/joy';
import { getPolitician, getPoliticianVotingHistory } from '../../api/politicians';
import type { VotingRecord } from '@polity/shared';

export default function PoliticianDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: politician,
    isLoading: isLoadingPolitician,
    error: politicianError
  } = useQuery({
    queryKey: ['politician', id],
    queryFn: () => getPolitician(id!),
    enabled: !!id
  });

  const {
    data: votingHistory,
    isLoading: isLoadingVotes,
    error: votesError
  } = useQuery({
    queryKey: ['politician-votes', id],
    queryFn: () => getPoliticianVotingHistory(id!),
    enabled: !!id
  });

  if (isLoadingPolitician || isLoadingVotes) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (politicianError || votesError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color="danger">
          Error loading politician details. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!politician) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert color="warning">Politician not found.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid xs={12} md={4}>
          <Card>
            <AspectRatio ratio="1" sx={{ mb: 2 }}>
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

            <Typography level="h3">{politician.name}</Typography>
            <Typography level="body-lg" sx={{ mb: 2 }}>
              {politician.party} - {politician.state}
            </Typography>

            <Divider />

            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography level="body-sm">
                <strong>Role:</strong> {politician.currentRole}
              </Typography>
              <Typography level="body-sm">
                <strong>Serving Since:</strong>{' '}
                {new Date(politician.servingSince).toLocaleDateString()}
              </Typography>
              {politician.description && (
                <Typography level="body-sm">
                  <strong>About:</strong> {politician.description}
                </Typography>
              )}
            </Stack>
          </Card>
        </Grid>

        {/* Voting History */}
        <Grid xs={12} md={8}>
          <Card>
            <Typography level="h4" sx={{ mb: 2 }}>
              Recent Votes
            </Typography>

            <Table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill</th>
                  <th>Vote</th>
                </tr>
              </thead>
              <tbody>
                {votingHistory?.map((record: VotingRecord & { bills: { title: string } }) => (
                  <tr key={record.id}>
                    <td>
                      {new Date(record.vote_date).toLocaleDateString()}
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {record.bills.title}
                      </Typography>
                    </td>
                    <td>
                      <Typography
                        level="body-sm"
                        color={
                          record.vote === 'Yea'
                            ? 'success'
                            : record.vote === 'Nay'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {record.vote}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 