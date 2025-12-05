import Project from "../models/Project.js";
import Task from "../models/Task.js";

export const getMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Total projects owned or member of
    const totalProjects = await Project.countDocuments({
      $or: [{ owner: userId }, { members: userId }],
    });

    // Active projects (status not completed or cancelled)
    const activeProjects = await Project.countDocuments({
      $or: [{ owner: userId }, { members: userId }],
      status: { $nin: ["Completed", "Cancelled"] },
    });

    // Get user's projects list with names and ids
    const userProjects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).lean();

    // Calculate completion rates per project
    const projectsWithCompletion = await Promise.all(
      userProjects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({
          project: project._id,
          status: "done",
        });
        const completionRate = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
        return {
          _id: project._id,
          name: project.name,
          completionRate: Number(completionRate.toFixed(1)),
        };
      })
    );

    // Prepare project IDs for task queries
    const projectIdList = userProjects.map(p => p._id);

    const totalTasks = await Task.countDocuments({
      project: { $in: projectIdList },
    });

    const completedTasks = await Task.countDocuments({
      project: { $in: projectIdList },
      status: "done",
    });

    // Count distinct team members across all user's projects
    const membersAgg = await Project.aggregate([
      {
        $match: {
          $or: [{ owner: userId }, { members: userId }]
        }
      },
      {
        $project: {
          allMembers: { $setUnion: ['$members', ['$owner']] }
        }
      },
      { $unwind: '$allMembers' },
      {
        $group: {
          _id: null,
          distinctMembers: { $addToSet: '$allMembers' }
        }
      }
    ]);
    
    const teamMembers = membersAgg.length ? membersAgg[0].distinctMembers.length : 0;
    

    const completionRateOverall = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

    const metrics = {
      totalProjects,
      activeProjects,
      activeTasks: totalTasks - completedTasks,
      completedTasks,
      teamMembers,
      overallCompletionRate: Number(completionRateOverall.toFixed(1)),
      projectsWithCompletion,
    };

    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: "Failed to load metrics", error: err.message });
  }
};
