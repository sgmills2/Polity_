import { supabase } from '../config/supabase';

interface CongressBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  summary?: {
    text: string;
  };
  url: string;
  actions?: {
    url: string;
    count: number;
  };
}

interface BillAction {
  actionDate: string;
  text: string;
  type: string;
  sourceSystem?: {
    name: string;
  };
  recordedVotes?: Array<{
    chamber: string;
    date: string;
    rollNumber: number;
    url: string;
  }>;
}

async function fetchFromCongressApi(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    throw new Error('CONGRESS_API_KEY environment variable is required');
  }

  const url = new URL(`https://api.congress.gov/v3${endpoint}`);
  url.searchParams.append('api_key', congressApiKey);
  url.searchParams.append('format', 'json');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });

  console.log(`Fetching: ${url.pathname}?${url.searchParams.toString().substring(0, 100)}...`);
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function classifyBillByTopic(bill: CongressBill): Promise<string[]> {
  // Get topics from database
  const { data: topics } = await supabase
    .from('topics')
    .select('id, keywords');

  if (!topics) return [];

  const matchedTopics: string[] = [];
  const billText = `${bill.title} ${bill.summary?.text || ''}`.toLowerCase();

  for (const topic of topics) {
    const keywords = topic.keywords || [];
    const hasMatch = keywords.some((keyword: string) => 
      billText.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      matchedTopics.push(topic.id);
    }
  }

  return matchedTopics;
}

function calculateProgressiveScore(bill: CongressBill): number {
  // Simple heuristic scoring based on keywords in title/summary
  const text = `${bill.title} ${bill.summary?.text || ''}`.toLowerCase();
  
  // Progressive indicators (-1 = more progressive)
  const progressiveKeywords = [
    'universal healthcare', 'medicare for all', 'climate action', 'clean energy',
    'reproductive rights', 'abortion access', 'voting rights', 'civil rights',
    'minimum wage', 'tax on wealthy', 'corporate tax', 'student debt',
    'affordable housing', 'gun control', 'immigration reform'
  ];
  
  // Conservative indicators (+1 = more conservative)
  const conservativeKeywords = [
    'defense spending', 'military budget', 'border security', 'deportation',
    'tax cuts', 'deregulation', 'oil drilling', 'coal mining',
    'religious freedom', 'second amendment', 'traditional marriage'
  ];

  let score = 0;
  
  progressiveKeywords.forEach(keyword => {
    if (text.includes(keyword)) score -= 0.2; // More negative = more progressive
  });
  
  conservativeKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 0.2; // More positive = more conservative
  });

  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, score));
}

async function syncBill(congressBill: CongressBill): Promise<string | null> {
  try {
    const congressId = `${congressBill.congress}${congressBill.type}${congressBill.number}`;
    
    // Check if bill already exists
    const { data: existingBill } = await supabase
      .from('bills')
      .select('id')
      .eq('congress_id', congressId)
      .single();

    if (existingBill) {
      return existingBill.id;
    }

    // Classify bill and calculate progressive score
    const topicIds = await classifyBillByTopic(congressBill);
    const progressiveScore = calculateProgressiveScore(congressBill);

    const billData = {
      congress_id: congressId,
      congress: congressBill.congress,
      bill_type: congressBill.type,
      bill_number: congressBill.number,
      title: congressBill.title,
      summary: congressBill.summary?.text || null,
      introduced_date: congressBill.introducedDate,
      status: congressBill.latestAction?.text || 'Unknown',
      progressive_score: progressiveScore,
      topic_ids: topicIds
    };

    const { data: newBill, error } = await supabase
      .from('bills')
      .insert(billData)
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting bill:', error);
      return null;
    }

    console.log(`✓ Synced bill: ${congressBill.title.substring(0, 60)}... (${topicIds.length} topics)`);
    return newBill.id;

  } catch (error) {
    console.error('Error syncing bill:', error);
    return null;
  }
}

export async function syncVotingRecords(congress: number = 118, limit: number = 10): Promise<{
  success: boolean;
  totalBills: number;
  totalRecords: number;
  errors: string[];
}> {
  const startTime = Date.now();
  console.log(`Starting voting records sync for Congress ${congress}...`);
  
  const errors: string[] = [];
  let totalBills = 0;
  let totalRecords = 0;

  try {
    // Get bills from Congress.gov
    console.log(`Fetching ${limit} bills from Congress ${congress}...`);
    const billsData = await fetchFromCongressApi(`/bill/${congress}`, {
      limit
    });

    if (!billsData.bills || !Array.isArray(billsData.bills)) {
      throw new Error('Invalid bills response format');
    }

    console.log(`Found ${billsData.bills.length} bills to process`);

    for (const bill of billsData.bills) {
      try {
        // Get detailed bill information
        const billDetailUrl = bill.url.replace('https://api.congress.gov/v3', '');
        const billDetail = await fetchFromCongressApi(billDetailUrl);
        
        if (!billDetail.bill) {
          console.warn(`No bill details found for ${bill.number}`);
          continue;
        }

        // Sync the bill to our database
        const billId = await syncBill(billDetail.bill);
        if (!billId) {
          console.warn(`Failed to sync bill ${bill.number}`);
          continue;
        }

        totalBills++;

        // Get actions for this bill if available
        if (billDetail.bill.actions?.url) {
          const actionsUrl = billDetail.bill.actions.url.replace('https://api.congress.gov/v3', '');
          
          try {
            const actionsData = await fetchFromCongressApi(actionsUrl);
            
            if (actionsData.actions && Array.isArray(actionsData.actions)) {
              // Look for vote-related actions
              const voteActions = actionsData.actions.filter((action: BillAction) =>
                action.text?.toLowerCase().includes('vote') ||
                action.text?.toLowerCase().includes('passed') ||
                action.text?.toLowerCase().includes('roll') ||
                (action.recordedVotes && action.recordedVotes.length > 0)
              );

              if (voteActions.length > 0) {
                console.log(`Found ${voteActions.length} vote actions for bill ${bill.number}`);
                // For now, just log what we found
                // TODO: In the future, we would extract individual member votes from recordedVotes
                totalRecords += voteActions.length;
              }
            }
          } catch (actionsError) {
            console.warn(`Could not get actions for bill ${bill.number}:`, actionsError);
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (billError) {
        const errorMsg = `Failed to process bill ${bill.number}: ${billError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Voting records sync completed in ${duration}ms. Bills: ${totalBills}, Vote Actions: ${totalRecords}, Errors: ${errors.length}`);

    return {
      success: errors.length === 0 || totalBills > 0,
      totalBills,
      totalRecords,
      errors
    };

  } catch (error) {
    const errorMsg = `Voting records sync failed: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    
    return {
      success: false,
      totalBills,
      totalRecords,
      errors
    };
  }
} 