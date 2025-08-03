import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AspectRatio,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Input,
  Option,
  Select,
  Sheet,
  Skeleton,
  Snackbar,
  Stack,
  Typography
} from '@mui/joy';
import {
  CheckCircle,
  DataUsage as DataUsageIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Search,
  Warning
} from '@mui/icons-material';

import { getPoliticians, getRealDataStatus, syncPoliticians, syncRealVotingData } from '../../api/politicians';

interface FilterState {
  search: string;
  party: string;
  state: string;
  chamber: string;
}

interface SyncResponse {
  success: boolean;
  message: string;
  data?: {
    totalSynced: number;
    duration: string;
    errors?: string[];
  };
}

interface ToastState {
  open: boolean;
  message: string;
  color: 'success' | 'warning' | 'danger';
  startDecorator?: React.ReactNode;
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const PARTIES = [
  { value: 'D', label: 'Democratic', color: 'primary' },
  { value: 'R', label: 'Republican', color: 'danger' },
  { value: 'I', label: 'Independent', color: 'neutral' }
];

const CHAMBERS = [
  { value: 'senate', label: 'Senate' },
  { value: 'house', label: 'House' }
];

export default function PoliticianList() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    party: '',
    state: '',
    chamber: ''
  });
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    color: 'success'
  });

  const { data: politicians, isLoading, error } = useQuery({
    queryKey: ['politicians'],
    queryFn: getPoliticians,
    staleTime: 5 * 60 * 1000, // 5 minutes to match global config
  });

  // Sync mutation for live data
  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const data = await syncPoliticians();
      return data;
    },
    onSuccess: (data) => {
      // Force immediate refetch of politicians data
      queryClient.invalidateQueries({ queryKey: ['politicians'] });
      queryClient.refetchQueries({ queryKey: ['politicians'] });
      
      if (data.success) {
        setToast({
          open: true,
          message: `✓ ${data.message} in ${data.data?.duration}`,
          color: 'success',
          startDecorator: <CheckCircle />
        });
      } else {
        setToast({
          open: true,
          message: `⚠ ${data.message}`,
          color: 'warning',
          startDecorator: <Warning />
        });
      }
    },
    onError: (error) => {
      setToast({
        open: true,
        message: `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'danger',
        startDecorator: <ErrorIcon />
      });
    },
  });

  // Voting data sync mutation
  const votingDataSyncMutation = useMutation({
    mutationFn: async (options: { billLimit?: number; voteLimit?: number; calculateScores?: boolean }) => {
      const data = await syncRealVotingData(options);
      return data;
    },
    onSuccess: (data) => {
      // Force immediate refetch of data
      queryClient.invalidateQueries({ queryKey: ['politicians'] });
      queryClient.invalidateQueries({ queryKey: ['realDataStatus'] });
      
      if (data.success) {
        setToast({
          open: true,
          message: `✓ Voting data sync completed: ${data.summary?.totalRecords || 0} records`,
          color: 'success',
          startDecorator: <CheckCircle />
        });
      } else {
        setToast({
          open: true,
          message: `⚠ Voting data sync completed with errors`,
          color: 'warning',
          startDecorator: <Warning />
        });
      }
    },
    onError: (error) => {
      setToast({
        open: true,
        message: `Failed to sync voting data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'danger',
        startDecorator: <ErrorIcon />
      });
    },
  });

  // Get real data status
  const { data: realDataStatus } = useQuery({
    queryKey: ['realDataStatus'],
    queryFn: getRealDataStatus,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleVotingDataSync = (options: { billLimit?: number; voteLimit?: number; calculateScores?: boolean } = {}) => {
    votingDataSyncMutation.mutate(options);
  };

  // Filtered politicians
  const filteredPoliticians = useMemo(() => {
    if (!politicians) return [];
    
    return politicians.filter(politician => {
      const matchesSearch = !filters.search || 
        politician.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        politician.state.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesParty = !filters.party || politician.party === filters.party;
      const matchesState = !filters.state || politician.state === filters.state;
      const matchesChamber = !filters.chamber || politician.chamber === filters.chamber;
      
      return matchesSearch && matchesParty && matchesState && matchesChamber;
    });
  }, [politicians, filters]);

  // Statistics
  const stats = useMemo(() => {
    if (!politicians) return null;
    
    const partyStats = politicians.reduce((acc, p) => {
      acc[p.party] = (acc[p.party] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const chamberStats = politicians.reduce((acc, p) => {
      acc[p.chamber] = (acc[p.chamber] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { partyStats, chamberStats, total: politicians.length };
  }, [politicians]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', party: '', state: '', chamber: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Toast Notification */}
      <Snackbar
        variant="soft"
        color={toast.color}
        open={toast.open}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        startDecorator={toast.startDecorator}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {toast.message}
      </Snackbar>

      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography level="h2" component="h1">
          Politicians ({filteredPoliticians.length})
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={handleSync}
            loading={syncMutation.isPending}
            startDecorator={syncMutation.isPending ? undefined : <RefreshIcon />}
            size="sm"
          >
            {syncMutation.isPending ? 'Syncing...' : 'Sync Politicians'}
          </Button>
          
          <Button
            variant="soft"
            color="primary"
            onClick={() => handleVotingDataSync({ billLimit: 50, voteLimit: 25, calculateScores: true })}
            loading={votingDataSyncMutation.isPending}
            startDecorator={votingDataSyncMutation.isPending ? undefined : <DataUsageIcon />}
            size="sm"
          >
            {votingDataSyncMutation.isPending ? 'Syncing Votes...' : 'Sync Voting Data'}
          </Button>
        </Box>
      </Box>

      {/* Real Data Status Panel */}
      {realDataStatus && (
        <Card variant="soft" color={realDataStatus.hasData ? 'success' : 'neutral'} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography level="title-sm" sx={{ mb: 1 }}>
                  Real Voting Data Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Typography level="body-sm">
                    <strong>Politicians:</strong> {realDataStatus.totalPoliticians || 0}
                  </Typography>
                  <Typography level="body-sm">
                    <strong>Bills:</strong> {realDataStatus.totalBills || 0}
                  </Typography>
                  <Typography level="body-sm">
                    <strong>Voting Records:</strong> {realDataStatus.totalVotingRecords || 0}
                  </Typography>
                  <Typography level="body-sm">
                    <strong>Political Scores:</strong> {realDataStatus.totalPoliticalScores || 0}
                  </Typography>
                </Box>
                {realDataStatus.lastActivity && (
                  <Typography level="body-xs" sx={{ mt: 1, opacity: 0.7 }}>
                    Last Activity: {new Date(realDataStatus.lastActivity).toLocaleString()}
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  size="sm" 
                  color={realDataStatus.hasData ? 'success' : 'neutral'}
                  variant="soft"
                >
                  {realDataStatus.hasData ? 'Real Data Available' : 'Mock Data Only'}
                </Chip>
                
                <Button
                  variant="plain"
                  size="sm"
                  color="primary"
                  onClick={() => handleVotingDataSync({ billLimit: 100, voteLimit: 50, calculateScores: true })}
                  loading={votingDataSyncMutation.isPending}
                  startDecorator={<RefreshIcon />}
                >
                  Full Sync
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
          <Typography level="body-sm" sx={{ mb: 1, fontWeight: 600 }}>
            Overview ({stats.total} total)
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {Object.entries(stats.partyStats).map(([party, count]) => {
              const partyInfo = PARTIES.find(p => p.value === party);
              return (
                <Chip
                  key={party}
                  color={partyInfo?.color as any}
                  size="sm"
                  variant="soft"
                >
                  {partyInfo?.label || party}: {count as number}
                </Chip>
              );
            })}
            <Divider orientation="vertical" />
            {Object.entries(stats.chamberStats).map(([chamber, count]) => (
              <Chip key={chamber} size="sm" variant="outlined">
                {chamber.charAt(0).toUpperCase() + chamber.slice(1)}: {count as number}
              </Chip>
            ))}
          </Stack>
        </Sheet>
      )}

      {/* Filters */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Input
            placeholder="Search politicians..."
            startDecorator={<Search />}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          
          <Select
            placeholder="Party"
            value={filters.party}
            onChange={(_, value) => updateFilter('party', value || '')}
            sx={{ minWidth: 120 }}
          >
            {PARTIES.map(party => (
              <Option key={party.value} value={party.value}>
                {party.label}
              </Option>
            ))}
          </Select>
          
          <Select
            placeholder="State"
            value={filters.state}
            onChange={(_, value) => updateFilter('state', value || '')}
            sx={{ minWidth: 100 }}
          >
            {STATES.map(state => (
              <Option key={state} value={state}>
                {state}
              </Option>
            ))}
          </Select>
          
          <Select
            placeholder="Chamber"
            value={filters.chamber}
            onChange={(_, value) => updateFilter('chamber', value || '')}
            sx={{ minWidth: 120 }}
          >
            {CHAMBERS.map(chamber => (
              <Option key={chamber.value} value={chamber.value}>
                {chamber.label}
              </Option>
            ))}
          </Select>
        </Stack>
        
        {hasActiveFilters && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography level="body-sm">Active filters:</Typography>
            {filters.search && (
              <Chip size="sm" variant="soft">
                Search: {filters.search}
              </Chip>
            )}
            {filters.party && (
              <Chip size="sm" variant="soft">
                {PARTIES.find(p => p.value === filters.party)?.label}
              </Chip>
            )}
            {filters.state && (
              <Chip size="sm" variant="soft">
                {filters.state}
              </Chip>
            )}
            {filters.chamber && (
              <Chip size="sm" variant="soft">
                {CHAMBERS.find(c => c.value === filters.chamber)?.label}
              </Chip>
            )}
            <Button size="sm" variant="plain" onClick={clearFilters}>
              Clear all
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Results */}
      <Typography level="body-sm" sx={{ mb: 2 }}>
        Showing {filteredPoliticians.length} of {politicians?.length || 0} politicians
      </Typography>

      {/* Loading State */}
      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid key={i} xs={12} sm={6} md={4} lg={3}>
              <Card sx={{ height: 280 }}>
                <AspectRatio ratio="1">
                  <Skeleton />
                </AspectRatio>
                <Skeleton height="1em" sx={{ mt: 1 }} />
                <Skeleton height="0.8em" width="60%" />
                <Skeleton height="0.7em" width="80%" sx={{ mt: 1 }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {filteredPoliticians.map((politician) => {
            const partyInfo = PARTIES.find(p => p.value === politician.party);
            
            return (
              <Grid key={politician.id} xs={12} sm={6} md={4} lg={3}>
                <Card
                  component={Link}
                  to={`/politicians/${politician.id}`}
                  sx={{
                    height: '100%',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'lg',
                      borderColor: partyInfo?.color + '.300'
                    }
                  }}
                >
                  <AspectRatio ratio="1" sx={{ mb: 1 }}>
                    {politician.photoUrl ? (
                      <img
                        src={politician.photoUrl}
                        alt={politician.name}
                        loading="lazy"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          background: 'linear-gradient(45deg, var(--joy-palette-neutral-100), var(--joy-palette-neutral-200))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'text.tertiary'
                        }}
                      >
                        <Typography level="body-sm">No Photo</Typography>
                      </Box>
                    )}
                  </AspectRatio>

                  <Box sx={{ p: 1.5 }}>
                    <Typography level="h4" sx={{ mb: 0.5 }}>
                      {politician.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                      <Chip
                        size="sm"
                        color={partyInfo?.color as any}
                        variant="soft"
                      >
                        {politician.party}
                      </Chip>
                      <Chip size="sm" variant="outlined">
                        {politician.state}
                      </Chip>
                    </Stack>

                    <Typography level="body-sm" sx={{ mb: 1, color: 'text.secondary' }}>
                      {politician.chamber.charAt(0).toUpperCase() + politician.chamber.slice(1)}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      {politician.currentRole}
                    </Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      Since {new Date(politician.servingSince).getFullYear()}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Empty State */}
      {!isLoading && filteredPoliticians.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography level="h4" sx={{ mb: 1 }}>
            No politicians found
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            Try adjusting your filters or search terms
          </Typography>
          {hasActiveFilters && (
            <Button variant="outlined" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
} 