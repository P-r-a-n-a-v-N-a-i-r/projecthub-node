import {
  updateMe,
  deleteMe,
  resetPassword,
  getAllUsers,
} from "../controllers/usersController.js";

import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import bcrypt from "bcryptjs";

// Mock all models + bcrypt
jest.mock("../models/User.js");
jest.mock("../models/Project.js");
jest.mock("../models/Task.js");
jest.mock("bcryptjs");

describe("User Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: "user123" },
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  // ------------------------------------------------------
  // updateMe
  // ------------------------------------------------------
  describe("updateMe", () => {
    it("should return 401 when user is not logged in", async () => {
      await updateMe({ user: null, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should update user successfully", async () => {
      User.findByIdAndUpdate.mockResolvedValue({
        _id: "user123",
        name: "New Name",
        email: "new@test.com",
      });

      req.body = { name: "New Name", email: "new@test.com" };

      await updateMe(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { name: "New Name", email: "new@test.com" },
        { new: true, select: "_id name email" }
      );

      expect(res.json).toHaveBeenCalledWith({
        _id: "user123",
        name: "New Name",
        email: "new@test.com",
      });
    });

    it("should return error on update failure", async () => {
      User.findByIdAndUpdate.mockRejectedValue(new Error("DB Error"));

      await updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ------------------------------------------------------
  // deleteMe
  // ------------------------------------------------------
  describe("deleteMe", () => {
    it("should return 401 when user missing", async () => {
      await deleteMe({ user: null }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should delete user successfully", async () => {
      User.findByIdAndDelete.mockResolvedValue({ _id: "user123" });

      await deleteMe(req, res);

      expect(User.findByIdAndDelete).toHaveBeenCalledWith("user123");
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("should handle delete error", async () => {
      User.findByIdAndDelete.mockRejectedValue(new Error("DB Err"));

      await deleteMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ------------------------------------------------------
  // resetPassword
  // ------------------------------------------------------
  describe("resetPassword", () => {
    it("should return 404 if user not found", async () => {
      User.findById.mockResolvedValue(null);

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 if current password is incorrect", async () => {
      req.body = { currentPassword: "123", newPassword: "456" };
      User.findById.mockResolvedValue({ password: "oldhash" });

      bcrypt.compare.mockResolvedValue(false);

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should reset password successfully", async () => {
      const mockUser = {
        password: "oldhash",
        save: jest.fn(),
      };

      req.body = { currentPassword: "123", newPassword: "456" };

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue("newHash");

      await resetPassword(req, res);

      expect(mockUser.password).toBe("newHash");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Password updated successfully",
      });
    });
  });

  // ------------------------------------------------------
  // getAllUsers
  // ------------------------------------------------------
  describe("getAllUsers", () => {
    it("should return all users with project + task counts", async () => {
      const usersMock = [
        { _id: "u1", name: "User1", email: "u1@test.com" },
        { _id: "u2", name: "User2", email: "u2@test.com" },
      ];

      User.find.mockResolvedValue(usersMock);

      Project.countDocuments.mockResolvedValue(4);
      Task.countDocuments.mockResolvedValue(10);

      await getAllUsers(req, res);

      expect(User.find).toHaveBeenCalledWith({}, "-password");

      expect(res.json).toHaveBeenCalledWith([
        {
          id: "u1",
          name: "User1",
          email: "u1@test.com",
          projectsCount: 4,
          tasksCount: 10,
        },
        {
          id: "u2",
          name: "User2",
          email: "u2@test.com",
          projectsCount: 4,
          tasksCount: 10,
        },
      ]);
    });

    it("should return 500 on error", async () => {
      User.find.mockRejectedValue(new Error("DB Error"));

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
