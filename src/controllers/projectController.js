import Project from '../models/Project.js';
import { logActivity } from './activityController.js';

// Create a new project
export const createProject = async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, members, tags } = req.body;

    const project = await Project.create({
      name,
      description: description || '',
      status: status || 'Planning',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      members: Array.isArray(members) ? members : [req.user._id],
      tags: Array.isArray(tags) ? tags : [],
      owner: req.user._id,
    });

    // Log activity
    await logActivity({
      type: 'project',
      action: 'created',
      targetType: 'Project',
      targetName: project.name,
      actorId: req.user._id,
      actorName: req.user.name,
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create project', error: String(err) });
  }
};

export const updateProject = async (req, res) => {
  console.log("updateProject",req.user, req)
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      startDate,
      endDate,
      members,
      tags,
    } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;
    if (startDate !== undefined) update.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) update.endDate = endDate ? new Date(endDate) : null;
    if (members !== undefined) update.members = Array.isArray(members) ? members : [];
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];

    const updated = await Project.findByIdAndUpdate(id, { $set: update }, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Log activity
    await logActivity({
      type: 'project',
      action: 'updated',
      targetType: 'Project',
      targetName: updated.name,
      actorId: req.user._id,
      actorName: req.user.name,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update project', error: String(err) });
  }
};

export const getProjects = async (req, res) => {
  try {
    const items = await Project.find({}).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list projects', error: String(err) });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get project', error: String(err) });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this project' });
    }

    await Project.findByIdAndDelete(id);

    // Log activity
    await logActivity({
      type: 'project',
      action: 'deleted',
      targetType: 'Project',
      targetName: project.name,
      actorId: req.user._id,
      actorName: req.user.name,
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project', error: String(err) });
  }
};
