// src/__tests__/activityController.test.js
import { jest } from '@jest/globals';
import { getAllActivities, logActivity } from '../controllers/activityController.js';
import Activity from '../models/Activity.js';

// ESM-friendly manual mock: override methods on imported class/function
jest.mock('../models/Activity.js', () => {
  const saveMock = jest.fn().mockResolvedValue(undefined);
  const findMock = jest.fn();

  function ActivityMock(data) {
    if (data) {
      this.type = data.type;
      this.action = data.action;
      this.targetType = data.targetType;
      this.targetName = data.targetName;
      this.actorId = data.actorId;
      this.actorName = data.actorName;
      this.save = saveMock;
    }
  }

  ActivityMock.find = findMock;
  ActivityMock.__saveMock = saveMock;
  ActivityMock.__findMock = findMock;

  return {
    __esModule: true,
    default: ActivityMock
  };
});

describe('activityController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllActivities', () => {
    it('should return activities sorted by timestamp desc (limit 100)', async () => {
      const mockActivities = [
        { type: 'project', action: 'created', targetName: 'Test Project' }
      ];

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue(mockActivities);

      // After jest.mock, Activity is our mocked default export
      Activity.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock
      });

      const req = {};
      const res = { json: jest.fn() };

      await getAllActivities(req, res);

      expect(Activity.find).toHaveBeenCalled();
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 }); // or createdAt if controller uses that
      expect(limitMock).toHaveBeenCalledWith(100);
      expect(res.json).toHaveBeenCalledWith(mockActivities);
    });

    it('should return 500 on error', async () => {
      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockRejectedValue(new Error('DB error'));

      Activity.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock
      });

      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await getAllActivities(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('logActivity', () => {
    it('should create and save Activity without throwing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      Activity.__saveMock.mockResolvedValue(undefined);

      await logActivity({
        type: 'project',
        action: 'created',
        targetType: 'Project',
        targetName: 'Test Project',
        actorId: 'u1',
        actorName: 'User'
      });

      expect(Activity.__saveMock).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should catch errors and log them', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      Activity.__saveMock.mockRejectedValue(new Error('Save failed'));

      await logActivity({
        type: 'project',
        action: 'updated',
        targetType: 'Project',
        targetName: 'Test Project',
        actorId: 'u1',
        actorName: 'User'
      });

      expect(Activity.__saveMock).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Activity log failed'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
