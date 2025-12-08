const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

jest.mock('../models/Activity');

const Activity = require('../models/Activity');
const activityController = require('../controllers/activityController');

const app = express();
app.use(express.json());

// Wire controller to a test route
app.get('/api/activities', activityController.getAllActivities);

describe('activityController', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllActivities', () => {
        it('should return activities sorted by timestamp desc (limit 100)', async () => {
            const mockActivities = [
                { _id: 'a1', type: 'project', action: 'created', timestamp: new Date() }
            ];

            const sortMock = jest.fn().mockReturnThis();
            const limitMock = jest.fn().mockResolvedValue(mockActivities);

            Activity.find.mockReturnValue({
                sort: sortMock,
                limit: limitMock
            });

            const res = await request(app).get('/api/activities');

            expect(Activity.find).toHaveBeenCalledWith();
            expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
            expect(limitMock).toHaveBeenCalledWith(100);
            expect(res.status).toBe(200);

            // Instead of deep equality on Date vs string, check fields individually:
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]._id).toBe('a1');
            expect(res.body[0].type).toBe('project');
            expect(res.body[0].action).toBe('created');
            expect(new Date(res.body[0].timestamp).toISOString()).toBe(
                mockActivities[0].timestamp.toISOString()
            );
        });

        it('should return 500 on error', async () => {
            const sortMock = jest.fn().mockReturnThis();
            const limitMock = jest.fn().mockRejectedValue(new Error('DB error'));

            Activity.find.mockReturnValue({
                sort: sortMock,
                limit: limitMock
            });

            const res = await request(app).get('/api/activities');

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Server error' });
        });
    });

    describe('logActivity', () => {
        it('should create and save Activity without throwing', async () => {
            const saveMock = jest.fn().mockResolvedValue(undefined);
            Activity.mockImplementation(function ActivityDoc(data) {
                this.type = data.type;
                this.action = data.action;
                this.targetType = data.targetType;
                this.targetName = data.targetName;
                this.actorId = data.actorId;
                this.actorName = data.actorName;
                this.save = saveMock;
            });

            const payload = {
                type: 'project',
                action: 'created',
                targetType: 'Project',
                targetName: 'ProjectHub',
                actorId: 'u1',
                actorName: 'User 1'
            };

            await activityController.logActivity(payload);

            expect(saveMock).toHaveBeenCalled();
        });

        it('should catch errors and not throw when save fails', async () => {
            const saveMock = jest.fn().mockRejectedValue(new Error('Save failed'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Activity.mockImplementation(function ActivityDoc(data) {
                this.type = data.type;
                this.action = data.action;
                this.targetType = data.targetType;
                this.targetName = data.targetName;
                this.actorId = data.actorId;
                this.actorName = data.actorName;
                this.save = saveMock;
            });

            const payload = {
                type: 'task',
                action: 'updated',
                targetType: 'Task',
                targetName: 'Task 1',
                actorId: 'u2',
                actorName: 'User 2'
            };

            await expect(activityController.logActivity(payload)).resolves.toBeUndefined();
            expect(saveMock).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});
