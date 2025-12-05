import Task from "../models/Task.js";
import { logActivity } from "./activityController.js";

// List all tasks for a project
export const listTasks = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const tasks = await Task.find({ project: projectId })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to load tasks" });
  }
};

// Create task
export const createTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: user not authenticated" });
  }
  try {
    const {
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate,
    } = req.body;

    const taskData = {
      title,
      description,
      status,
      priority,
      dueDate,
      project: req.params.projectId,
    };

    if (assignedTo && assignedTo.trim() !== '') {
      taskData.assignedTo = assignedTo;
    }

    const newTask = new Task(taskData);
    await newTask.save();

    // Log activity
    await logActivity({
      type: "task",
      action: "created",
      targetType: "Task",
      targetName: newTask.title,
      actorId: req.user._id,
      actorName: req.user.name,
    });

    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: "Failed to create task", error: err.message });
  }
};

// Update task
export const updateTask = async (req, res) => {
  console.log("updateTask", req)
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: user not authenticated" });
  }
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      req.body,
      { new: true }
    );
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });

    // Log activity
    await logActivity({
      type: "task",
      action: "updated",
      targetType: "Task",
      targetName: updatedTask.title,
      actorId: req.user._id,
      actorName: req.user.name,
    });

    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: "Failed to update task", error: err.message });
  }
};

// Delete task
export const deleteTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: user not authenticated" });
  }
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.taskId);
    if (!deletedTask) return res.status(404).json({ message: "Task not found" });

    // Log activity
    await logActivity({
      type: "task",
      action: "deleted",
      targetType: "Task",
      targetName: deletedTask.title,
      actorId: req.user._id,
      actorName: req.user.name,
    });

    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete task", error: err.message });
  }
};
