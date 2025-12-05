const Activity = require('../models/Activity');

// Get all activities (latest first)
exports.getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 }).limit(100);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Log an activity (call this from your project/task controllers)
exports.logActivity = async ({ type, action, targetType, targetName, actorId, actorName }) => {
  try {
    const activity = new Activity({
      type,
      action,
      targetType,
      targetName,
      actorId,
      actorName,
    });
    await activity.save();
  } catch (err) {
    console.error('Activity log failed', err);
  }
};
