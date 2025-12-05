import bcrypt from 'bcryptjs'; // or 'bcrypt' if correct
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

// Update profile
export const updateMe = async (req, res) => {
  const { name, email } = req.body;
  const id = req.user?._id;
  if (!id) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, select: '_id name email' }
    );
    return res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Error updating profile' });
  }
};

// Delete account
export const deleteMe = async (req, res) => {
  const id = req.user?._id;
  if (!id) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await User.findByIdAndDelete(id);
    // Optionally: remove all related data from other collections
    return res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: 'Could not delete account' });
  }
};

// Password reset (stub -- implement mailing logic)

export const resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};



export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    // Use Promise.all to count projects and tasks for each user in parallel
    const usersWithCounts = await Promise.all(users.map(async (u) => {
      // Projects where this user is the owner
      const projectsCount = await Project.countDocuments({ members: u._id });
      // Tasks where this user is assigned
      const tasksCount = await Task.countDocuments({ assignedTo: u._id });
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        projectsCount,
        tasksCount
      };
    }));
    res.json(usersWithCounts);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Internal server error" });
  }
};
