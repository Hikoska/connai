import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../supabase';

const interviewApi = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { stakeholderEmail, organisation } = req.body;
    const { data, error } = await supabase.from('interviews').insert([
      { stakeholder_email: stakeholderEmail, organisation },
    ]);
    if (error) {
      return res.status(400).json({
        error: 'Failed to create interview',
        message: error.message,
      });
    }
    return res.json({ interviewId: data[0].id });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

export default interviewApi;
