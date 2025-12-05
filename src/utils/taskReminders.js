import cron from 'node-cron';
import Task from '../models/Task.js';
import User from '../models/User.js';
import axios from 'axios';

// Run every day at 8am server time
cron.schedule('0 10 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find tasks due tomorrow and not completed
    const tasks = await Task.find({
      dueDate: { $gte: tomorrow, $lt: dayAfter },
      completed: false
    }).populate('assignedTo');

    for (const task of tasks) {
      if (!task.assignedTo?.email) continue;
      // Send a reminder
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'ProjectHub',
            email: 'cloudsynktech@gmail.com'
          },
          to: [
            {
              email: task.assignedTo.email,
              name: task.assignedTo.name || 'User'
            }
          ],
          subject: `⏰ Reminder: "${task.title}" is due tomorrow!`,
          htmlContent: `
            <p>Hello ${task.assignedTo.name || ''},</p>
            <p>This is a reminder that your assigned task <b>${task.title}</b> is due on <b>${new Date(task.dueDate).toLocaleDateString()}</b>.</p>
            <p>Please log in to ProjectHub to view or update your task.</p>
            <br>
            <small>This is an automated reminder from ProjectHub.</small>
          `
        },
        {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': process.env.BREVO_API_KEY
          }
        }
      );
    }
    console.log(`[Reminders] Sent reminder for ${tasks.length} task(s)`);
  } catch (err) {
    console.error('[Reminders] Error:', err.message);
  }
});
