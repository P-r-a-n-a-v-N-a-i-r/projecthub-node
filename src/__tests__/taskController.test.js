// PERFECT MOCK FOR Task MODEL — Works for all constructor + static calls
jest.mock('../models/Task.js', () => {
  const TaskMock = jest.fn().mockImplementation((data) => ({
    save: jest.fn().mockResolvedValue({ ...data, _id: 'task1' })
  }));

  return {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    Task: TaskMock
  };
});

// Mock activity logger
jest.mock('../controllers/activityController.js', () => ({
  logActivity: jest.fn().mockResolvedValue({})
}));

// Import AFTER mocks
const Task = require('../models/Task.js');
const { logActivity } = require('../controllers/activityController.js');
const {
  listTasks,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController.js');

// Mock response helper
const createRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockImplementation((payload) => {
    res.body = payload;
  });
  return res;
};

describe('taskController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = { 
      user: { _id: 'user1', name: 'Test User' },
      params: {},
      body: {}
    };
    res = createRes();

    // Reset Task.find mock
    Task.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn()
    });
  });

  // -----------------------------
  // listTasks
  // -----------------------------
  describe('listTasks', () => {
    it('should list tasks for project', async () => {
      const mockTasks = [{ _id: 'task1', title: 'Task 1' }];
      Task.find().sort.mockResolvedValue(mockTasks);

      await listTasks({ ...req, params: { projectId: 'proj1' } }, res);

      expect(Task.find).toHaveBeenCalledWith({ project: 'proj1' });
      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should handle list tasks error', async () => {
      Task.find().sort.mockRejectedValue(new Error('DB error'));

      await listTasks({ params: { projectId: 'proj1' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to load tasks' });
    });
  });

  // -----------------------------
  // createTask - BASIC TESTS ONLY
  // -----------------------------
  describe('createTask', () => {
    beforeEach(() => {
      req.params.projectId = 'proj1';
    });

    it('should return 401 if no user', async () => {
      await createTask({ user: null, params: { projectId: 'proj1' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle create error', async () => {
      // override save to throw
      Task.Task.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Validation error'))
      }));

      req.body = { title: 'Invalid Task' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // -----------------------------
  // updateTask
  // -----------------------------
  describe('updateTask', () => {
    beforeEach(() => {
      req.params.taskId = 'task1';
      req.body = { title: 'Updated Task' };
    });

    it('should return 401 if no user', async () => {
      await updateTask({ user: null, params: { taskId: 'task1' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should update task successfully', async () => {
      const updated = { _id: 'task1', title: 'Updated Task' };
      Task.findByIdAndUpdate.mockResolvedValue(updated);

      await updateTask(req, res);

      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        'task1',
        { title: 'Updated Task' },
        { new: true }
      );

      expect(logActivity).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('should return 404 if task not found', async () => {
      Task.findByIdAndUpdate.mockResolvedValue(null);

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // -----------------------------
  // deleteTask
  // -----------------------------
  describe('deleteTask', () => {
    beforeEach(() => {
      req.params.taskId = 'task1';
    });

    it('should return 401 if no user', async () => {
      await deleteTask({ user: null, params: { taskId: 'task1' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should delete successfully', async () => {
      const deletedTask = { _id: 'task1', title: 'Deleted Task' };
      Task.findByIdAndDelete.mockResolvedValue(deletedTask);

      await deleteTask(req, res);

      expect(Task.findByIdAndDelete).toHaveBeenCalledWith('task1');
      expect(logActivity).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Task deleted' });
    });

    it('should return 404 if not found', async () => {
      Task.findByIdAndDelete.mockResolvedValue(null);

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
