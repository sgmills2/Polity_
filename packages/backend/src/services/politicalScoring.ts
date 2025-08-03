import { supabase } from '../config/supabase';

interface TopicScore {
  politician_id: string;
  topic_id: string;
  score: number;
  vote_count: number;
  confidence: number;
}

/**
 * Calculate a politician's score on a specific topic based on their voting record
 */
async function calculateTopicScore(politicianId: string, topicId: string): Promise<TopicScore | null> {
  try {
    // Get all votes by this politician on bills related to this topic
    const { data: votes, error } = await supabase
      .from('voting_records')
      .select(`
        politician_id,
        vote_type,
        bills!inner (
          progressive_score,
          topic_ids
        )
      `)
      .eq('politician_id', politicianId)
      .contains('bills.topic_ids', [topicId])
      .not('bills.progressive_score', 'is', null);

    if (error) {
      console.error('Error fetching votes:', error);
      return null;
    }

    if (!votes || votes.length === 0) {
      return {
        politician_id: politicianId,
        topic_id: topicId,
        score: 0,
        vote_count: 0,
        confidence: 0
      };
    }

    let totalScore = 0;
    let validVotes = 0;

    // Calculate weighted score based on voting pattern
    for (const vote of votes) {
      const bill = vote.bills as any;
      const billProgressiveScore = bill.progressive_score;

      // Skip if no progressive score for the bill
      if (billProgressiveScore === null || billProgressiveScore === undefined) {
        continue;
      }

      let voteScore = 0;

      // Calculate how this vote aligns with bill's progressive/conservative nature
      switch (vote.vote_type) {
        case 'Yea':
          // Voting Yes on a progressive bill = progressive score
          // Voting Yes on a conservative bill = conservative score
          voteScore = billProgressiveScore;
          break;
        case 'Nay':
          // Voting No on a progressive bill = conservative score
          // Voting No on a conservative bill = progressive score
          voteScore = -billProgressiveScore;
          break;
        case 'Present':
        case 'Not Voting':
          // Neutral - doesn't contribute to score
          continue;
      }

      totalScore += voteScore;
      validVotes++;
    }

    if (validVotes === 0) {
      return {
        politician_id: politicianId,
        topic_id: topicId,
        score: 0,
        vote_count: 0,
        confidence: 0
      };
    }

    // Average score
    const averageScore = totalScore / validVotes;

    // Calculate confidence based on number of votes
    // More votes = higher confidence, capped at 1.0
    const confidence = Math.min(1.0, Math.sqrt(validVotes) / 10);

    return {
      politician_id: politicianId,
      topic_id: topicId,
      score: Math.max(-1, Math.min(1, averageScore)), // Clamp to [-1, 1]
      vote_count: validVotes,
      confidence
    };

  } catch (error) {
    console.error(`Error calculating topic score for politician ${politicianId}, topic ${topicId}:`, error);
    return null;
  }
}

/**
 * Calculate political scores for all politicians on all topics
 */
export async function calculatePoliticalScores(): Promise<{
  success: boolean;
  calculatedScores: number;
  errors: string[];
}> {
  console.log('Starting political score calculation...');
  const startTime = Date.now();
  
  const errors: string[] = [];
  let calculatedScores = 0;

  try {
    // Get all politicians
    const { data: politicians, error: politiciansError } = await supabase
      .from('politicians')
      .select('id, name');

    if (politiciansError) {
      throw new Error(`Failed to fetch politicians: ${politiciansError.message}`);
    }

    // Get all topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name');

    if (topicsError) {
      throw new Error(`Failed to fetch topics: ${topicsError.message}`);
    }

    console.log(`Calculating scores for ${politicians?.length || 0} politicians across ${topics?.length || 0} topics...`);

    // Calculate scores for each politician-topic combination
    for (const politician of politicians || []) {
      for (const topic of topics || []) {
        try {
          const score = await calculateTopicScore(politician.id, topic.id);
          
          if (score) {
            // Upsert the score
            const { error: upsertError } = await supabase
              .from('political_scores')
              .upsert({
                politician_id: score.politician_id,
                topic_id: score.topic_id,
                score: score.score,
                vote_count: score.vote_count,
                confidence: score.confidence,
                last_calculated: new Date().toISOString()
              }, {
                onConflict: 'politician_id,topic_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              const errorMsg = `Failed to save score for ${politician.name} on ${topic.name}: ${upsertError.message}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            } else {
              calculatedScores++;
              if (score.vote_count > 0) {
                console.log(`✓ ${politician.name} - ${topic.name}: ${score.score.toFixed(2)} (${score.vote_count} votes, ${(score.confidence * 100).toFixed(0)}% confidence)`);
              }
            }
          }

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 10));

        } catch (scoreError) {
          const errorMsg = `Error calculating score for ${politician.name} on ${topic.name}: ${scoreError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Political score calculation completed in ${duration}ms. Calculated ${calculatedScores} scores with ${errors.length} errors.`);

    return {
      success: errors.length === 0 || calculatedScores > 0,
      calculatedScores,
      errors
    };

  } catch (error) {
    const errorMsg = `Political scoring failed: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    
    return {
      success: false,
      calculatedScores,
      errors
    };
  }
}

/**
 * Get real political scores for a politician (replaces the sample data)
 */
export async function getPoliticianScores(politicianId: string): Promise<any[]> {
  try {
    const { data: scores, error } = await supabase
      .from('political_scores')
      .select(`
        score,
        vote_count,
        confidence,
        topics (
          id,
          name,
          description,
          category,
          color,
          icon
        )
      `)
      .eq('politician_id', politicianId);

    if (error) {
      console.error('Error fetching politician scores:', error);
      return [];
    }

    return scores?.map(scoreData => ({
      topic: scoreData.topics,
      score: {
        score: scoreData.score,
        voteCount: scoreData.vote_count,
        confidence: scoreData.confidence
      }
    })) || [];

  } catch (error) {
    console.error('Error getting politician scores:', error);
    return [];
  }
} 