const { pool: db } = require('../lib/Database');

const submitFeedback = async (req, res) => {
  const { category, message } = req.body;
  
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  const accountId = req.session?.accountId || req.session?.account_id || null;

  try {
    const query = `
      INSERT INTO platform_feedbacks (account_id, category, message)
      VALUES ($1, $2, $3)
      RETURNING feedback_id, created_at
    `;
    const values = [accountId, category || 'General Insight', message];
    
    const { rows } = await db.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while submitting feedback.',
    });
  }
};

const getUserRating = async (req, res) => {
  const accountId = req.session?.accountId || req.session?.account_id || null;
  if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const { rows } = await db.query('SELECT rating FROM platform_ratings WHERE account_id = $1', [accountId]);
    return res.status(200).json({
      success: true,
      rating: rows.length > 0 ? rows[0].rating : null,
    });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const upsertUserRating = async (req, res) => {
  const accountId = req.session?.accountId || req.session?.account_id || null;
  if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Invalid rating' });
  }

  try {
    const query = `
      INSERT INTO platform_ratings (account_id, rating, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (account_id) DO UPDATE SET rating = EXCLUDED.rating, updated_at = CURRENT_TIMESTAMP
      RETURNING rating
    `;
    const { rows } = await db.query(query, [accountId, rating]);
    return res.status(200).json({
      success: true,
      message: 'Rating updated successfully',
      rating: rows[0].rating,
    });
  } catch (error) {
    console.error('Error updating user rating:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  submitFeedback,
  getUserRating,
  upsertUserRating,
};
