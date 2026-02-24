import { NextApiRequest, NextApiResponse } from 'next';
import { groq } from '@nuxtjs/groq';
import { sanityClient } from '../../sanity';

const reportApi = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { interviewId } = req.query;
    const query = groq`
      *[
        _type == 'interview' && 
        _id == $interviewId
      ]{
        'score': @score,
      }
    `;
    const params = { interviewId };
    const { data } = await sanityClient.fetch(query, params);
    const score = data[0].score;
    const llmScore = await getLlmScore(score);
    return res.json({ score: llmScore });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

const getLlmScore = async (score) => {
  // TO DO: implement LLM scoring API call
  // For now, return a placeholder score
  return score * 2;
};

export default reportApi;
