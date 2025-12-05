import express from "express";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

// GET all tasks for a project
router.get("/project/:projectId", listTasks);

// POST create task for a project
router.post("/project/:projectId", createTask);

// PUT update a task
router.put("/:taskId", updateTask);

// DELETE a task
router.delete("/:taskId", deleteTask);

export default router;
