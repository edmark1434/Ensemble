const { pool: db } = require('../lib/Database');

const getAdminFeedbacks = async (req, res) => {
  try {
    const feedbacksQuery = `
      SELECT 
        fb.feedback_id as id,
        fb.category,
        fb.message,
        fb.created_at,
        fb.account_id,
        a.display_name AS username,
        u.email_address AS email,
        f.path AS profile_picture_url
      FROM platform_feedbacks fb
      LEFT JOIN accounts a ON fb.account_id = a.account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      ORDER BY fb.created_at DESC
    `;
    const ratingsQuery = `
      SELECT 
        pr.rating,
        pr.updated_at,
        pr.account_id,
        a.display_name AS username,
        u.email_address AS email,
        f.path AS profile_picture_url
      FROM platform_ratings pr
      LEFT JOIN accounts a ON pr.account_id = a.account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      ORDER BY pr.updated_at DESC
    `;

    const feedbacksRes = await db.query(feedbacksQuery);
    const ratingsRes = await db.query(ratingsQuery);

    return res.status(200).json({
      success: true,
      message: 'Feedbacks retrieved successfully',
      data: {
        feedbacks: feedbacksRes.rows,
        ratings: ratingsRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching admin feedbacks:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching feedbacks.',
    });
  }
};

module.exports = {
  getAdminFeedbacks,
};