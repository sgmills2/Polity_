# Enhanced Legislative Data Sources

## Overview

This document outlines the enhanced data integration capabilities for Polity, expanding beyond the current Congress.gov API to include multiple high-quality legislative data sources.

## 🎯 Available Data Sources

### 1. House Clerk (clerk.house.gov) ✅ Implemented
**Best for**: Detailed House voting records

**Data Available**:
- ✅ All House roll call votes since 1990
- ✅ Individual member votes on every bill
- ✅ Vote totals and breakdowns
- ✅ Bill questions and descriptions
- ✅ Vote dates and results

**API Format**: XML feeds (HTTP)
**Cost**: Free
**Rate Limits**: None specified
**Data Quality**: ⭐⭐⭐⭐⭐ (Primary source)

**Example Usage**:
```typescript
import { houseClerkService } from '../services/houseClerkIntegration';

// Get all House votes for 2024
const rollCalls = await houseClerkService.getHouseVotesForYear(2024);

// Get detailed vote information
const voteDetails = await houseClerkService.getHouseRollCallVote(2024, '001');
```

### 2. GovInfo API (api.govinfo.gov) ✅ Implemented  
**Best for**: Comprehensive bill metadata and legislative documents

**Data Available**:
- ✅ Full bill text and summaries
- ✅ Congressional records and proceedings
- ✅ Committee reports
- ✅ Federal Register documents
- ✅ Public laws and resolutions

**API Format**: REST JSON
**Cost**: Free (requires API key)
**Rate Limits**: 1,000 requests/hour
**Data Quality**: ⭐⭐⭐⭐⭐ (Government Publishing Office)

**Setup**:
1. Get free API key: https://api.govinfo.gov/docs/
2. Add to `.env`: `GOVINFO_API_KEY=your_key_here`

**Example Usage**:
```typescript
import { govInfoService } from '../services/houseClerkIntegration';

// Get congressional bills
const bills = await govInfoService.getCongressionalBills({
  congress: 118,
  pageSize: 100
});
```

### 3. Congress.gov API (Currently Using) ✅ Active
**Best for**: Politician biographical data and basic bill information

**Data Available**:
- ✅ Member biographical information
- ✅ Bill summaries and status
- ✅ Committee information
- ✅ Basic voting records

**API Format**: REST JSON
**Cost**: Free (requires API key)
**Rate Limits**: 5,000 requests/hour
**Data Quality**: ⭐⭐⭐⭐ (Official but limited detail)

### 4. Senate.gov 🔄 Planned
**Best for**: Senate voting records and proceedings

**Data Available**:
- 📋 Senate roll call votes
- 📋 Committee schedules and reports
- 📋 Senate calendar and proceedings

**API Format**: Limited XML/HTML scraping required
**Cost**: Free
**Implementation Status**: Planning phase

### 5. OpenSecrets.org API 🔄 Future Enhancement
**Best for**: Campaign finance and lobbying data

**Data Available**:
- 💰 Campaign contributions
- 💰 Lobbying expenditures
- 💰 PAC donations
- 💰 Industry influence tracking

**API Format**: REST JSON
**Cost**: Free for basic, paid for advanced
**Implementation Status**: Future enhancement

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd packages/backend
yarn add xml2js
yarn add -D @types/xml2js
```

### 2. Set Up Environment Variables
```bash
# .env file
CONGRESS_API_KEY=your_congress_key
GOVINFO_API_KEY=your_govinfo_key  # Optional but recommended
```

### 3. Run the Demo
```bash
yarn enhanced-data-demo
```

This will test all available data sources and show sample data.

### 4. Sync Real Data
```bash
# Sync House voting records (limited for testing)
yarn enhanced-sync-demo
```

## 📊 Data Integration Strategy

### Phase 1: Foundation (✅ Complete)
- ✅ Congress.gov API for politician data
- ✅ Basic infrastructure for scoring

### Phase 2: Enhanced Voting Data (✅ Available)
- ✅ House Clerk integration for detailed House votes
- ✅ GovInfo API for bill metadata
- ✅ Combined data processing pipeline

### Phase 3: Comprehensive Coverage (🔄 In Progress)
- 📋 Senate voting records integration
- 📋 Historical data backfill
- 📋 Automated scoring algorithms

### Phase 4: Advanced Analytics (🔄 Future)
- 💰 Campaign finance correlation
- 📈 Trend analysis and predictions
- 🤖 ML-powered topic classification

## 🔧 Technical Implementation

### Data Flow Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   House Clerk   │───▶│   Data Processing │───▶│   Supabase DB   │
│   XML Feeds     │    │   & Scoring       │    │   Normalized    │
└─────────────────┘    │                  │    │   Data          │
                       │                  │    └─────────────────┘
┌─────────────────┐    │                  │           │
│   GovInfo API   │───▶│                  │           ▼
│   Bill Metadata │    │                  │    ┌─────────────────┐
└─────────────────┘    │                  │    │   Frontend UI   │
                       │                  │    │   Spectrum      │
┌─────────────────┐    │                  │    │   Visualization │
│  Congress.gov   │───▶│                  │    └─────────────────┘
│  Politicians    │    └──────────────────┘
└─────────────────┘
```

### Database Schema Updates
The existing schema supports the enhanced data:
- ✅ `bills` table for legislation
- ✅ `voting_records` table for individual votes
- ✅ `political_scores` table for calculated positions
- ✅ `politicians` table for member data

### Scoring Algorithm Enhancement
With detailed voting data, we can:
1. **Topic Classification**: ML-based bill categorization
2. **Weighted Scoring**: Different vote importance levels
3. **Confidence Metrics**: Based on vote count and consistency
4. **Historical Tracking**: Position changes over time

## 🎯 Production Recommendations

### 1. Data Source Priority
1. **House Clerk** - Most detailed voting data, start here
2. **GovInfo API** - Enhanced bill context and metadata
3. **Congress.gov** - Continue using for politician biographical data
4. **Senate.gov** - Add when ready for comprehensive coverage

### 2. Sync Strategy
```typescript
// Recommended sync schedule
const syncStrategy = {
  politicians: 'Weekly',      // Congress.gov - member updates
  houseVotes: 'Daily',        // House Clerk - new votes
  billMetadata: 'Weekly',     // GovInfo - bill updates
  scoringCalculation: 'Daily' // After new vote data
};
```

### 3. Performance Optimization
- **Incremental Sync**: Only fetch new/updated records
- **Caching**: Store parsed XML data temporarily
- **Rate Limiting**: Respect API limits (especially GovInfo)
- **Parallel Processing**: Process different sources simultaneously

### 4. Error Handling
- **Graceful Degradation**: Continue with available data sources
- **Retry Logic**: Handle temporary API failures
- **Data Validation**: Verify data integrity before storage
- **Monitoring**: Track sync success rates and data quality

## 📋 Next Steps

### Immediate (This Sprint)
1. ✅ Test House Clerk integration with real data
2. ✅ Set up GovInfo API access
3. 📋 Enhance political scoring with real vote data
4. 📋 Update frontend to show real scores instead of mock data

### Short Term (Next Month)
1. 📋 Add Senate voting records
2. 📋 Implement historical data backfill
3. 📋 Create automated topic classification
4. 📋 Add data quality monitoring

### Long Term (Future Releases)
1. 📋 Campaign finance integration
2. 📋 Predictive analytics
3. 📋 Real-time vote tracking
4. 📋 Advanced visualization features

## 🔗 External Links

- [House Clerk Electronic Voting Records](http://clerk.house.gov/evs/)
- [GovInfo API Documentation](https://api.govinfo.gov/docs/)
- [Congress.gov API Documentation](https://github.com/LibraryOfCongress/api.congress.gov/)
- [Senate.gov Roll Call Votes](https://www.senate.gov/legislative/votes.htm)
- [OpenSecrets.org API](https://www.opensecrets.org/open-data/api-documentation)

## 💡 Tips for Development

### Testing with Real Data
```bash
# Test House Clerk with limited data
yarn enhanced-data-demo

# Sync small batch of real votes
cd packages/backend
yarn ts-node -e "
import { houseClerkService } from './src/services/houseClerkIntegration';
houseClerkService.syncHouseVotingRecords(2024, 5).then(console.log);
"
```

### Debugging XML Parsing
The House Clerk XML can be tricky. Use these tools:
- Online XML viewers for structure analysis
- `xml2js` parser options for custom handling
- Logging raw XML responses for troubleshooting

### API Key Management
Store API keys securely:
```bash
# .env.example
CONGRESS_API_KEY=get_from_congress_api
GOVINFO_API_KEY=get_from_govinfo_api
```

---

**Need help?** Check the demo script or create an issue with specific questions about data integration. 