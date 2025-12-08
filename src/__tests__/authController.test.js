// src/__tests__/authController.test.js

// Mock external modules FIRST
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('axios');
jest.mock('google-auth-library');

// SIMPLE MOCK OBJECTS - EXACTLY matches Mongoose model structure
jest.mock('../models/User.js', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Otp.js', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn()
}));

// Require AFTER mocks are set
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User.js');
const Otp = require('../models/Otp.js');
const authController = require('../controllers/authController.js');

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

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES = '7d';
    process.env.BCRYPT_ROUNDS = '10';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.BREVO_API_KEY = 'brevo-key';
  });

  describe('sendOtp', () => {
    it('should return 400 if email missing/invalid', async () => {
      const req = { body: {} };
      const res = createRes();

      await authController.sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email' });
    });

    it('should reject if email already registered', async () => {
      const req = { body: { email: 'test@test.com' } };
      const res = createRes();

      User.findOne.mockResolvedValue({ _id: 'u1', email: 'test@test.com' });

      await authController.sendOtp(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email is already registered' });
    });

    it('should generate OTP, save it and call Brevo API', async () => {
      const req = { body: { email: 'new@test.com' } };
      const res = createRes();

      User.findOne.mockResolvedValue(null);
      Otp.findOneAndUpdate.mockResolvedValue({});
      axios.post.mockResolvedValue({ data: { messageId: '123' } });

      await authController.sendOtp(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'new@test.com' });
      expect(Otp.findOneAndUpdate).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { messageId: '123' }
      });
    });

    it('should handle Brevo error with 500', async () => {
      const req = { body: { email: 'new@test.com' } };
      const res = createRes();

      User.findOne.mockResolvedValue(null);
      Otp.findOneAndUpdate.mockResolvedValue({});
      axios.post.mockRejectedValue(new Error('SMTP down'));

      await authController.sendOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to send OTP'
      });
    });
  });

  describe('verifyOtp', () => {
    it('should require email and otp', async () => {
      const req = { body: {} };
      const res = createRes();

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and OTP required' });
    });

    it('should return 400 if OTP record not found', async () => {
      const req = { body: { email: 'a@test.com', otp: '123456' } };
      const res = createRes();

      Otp.findOne.mockResolvedValue(null);

      await authController.verifyOtp(req, res);

      expect(Otp.findOne).toHaveBeenCalledWith({ email: 'a@test.com' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'OTP not found' });
    });

    it('should return 400 if OTP expired', async () => {
      const req = { body: { email: 'a@test.com', otp: '123456' } };
      const res = createRes();

      Otp.findOne.mockResolvedValue({
        email: 'a@test.com',
        otp: '123456',
        expiresAt: new Date(Date.now() - 1000)
      });

      await authController.verifyOtp(req, res);

      expect(Otp.deleteOne).toHaveBeenCalledWith({ email: 'a@test.com' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'OTP expired' });
    });

    it('should return 400 if OTP does not match', async () => {
      const req = { body: { email: 'a@test.com', otp: '000000' } };
      const res = createRes();

      Otp.findOne.mockResolvedValue({
        email: 'a@test.com',
        otp: '123456',
        expiresAt: new Date(Date.now() + 1000)
      });

      await authController.verifyOtp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid OTP' });
    });

    it('should verify valid OTP and delete record', async () => {
      const req = { body: { email: 'a@test.com', otp: '123456' } };
      const res = createRes();

      Otp.findOne.mockResolvedValue({
        email: 'a@test.com',
        otp: '123456',
        expiresAt: new Date(Date.now() + 1000)
      });

      await authController.verifyOtp(req, res);

      expect(Otp.deleteOne).toHaveBeenCalledWith({ email: 'a@test.com' });
      expect(res.json).toHaveBeenCalledWith({ message: 'OTP verified' });
    });
  });

  describe('registerUser', () => {
    it('should reject invalid signup data', async () => {
      const req = { body: { name: '', email: '', password: '1', confirmPassword: '2' } };
      const res = createRes();

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid signup data' });
    });

    it('should reject if email already exists', async () => {
      const req = {
        body: { name: 'User', email: 'x@test.com', password: 'pass123', confirmPassword: 'pass123' }
      };
      const res = createRes();

      User.findOne.mockResolvedValue({ _id: 'u1' });

      await authController.registerUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'x@test.com' });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already in use' });
    });

    it('should create user and return token', async () => {
      const req = {
        body: { name: 'User', email: 'x@test.com', password: 'pass123', confirmPassword: 'pass123' }
      };
      const res = createRes();

      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed');
      const mockUser = { _id: 'u1', name: 'User', email: 'x@test.com', authentication: 'email' };
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('jwt-token');

      await authController.registerUser(req, res);

      expect(User.create).toHaveBeenCalledWith({
        name: 'User',
        email: 'x@test.com',
        password: 'hashed',
        authentication: 'email'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toEqual({
        token: 'jwt-token',
        user: {
          _id: 'u1',
          name: 'User',
          email: 'x@test.com',
          authentication: 'email'
        }
      });
    });
  });

  describe('loginUser', () => {
    it('should reject if user not found', async () => {
      const req = { body: { email: 'no@test.com', password: 'pass' } };
      const res = createRes();

      User.findOne.mockResolvedValue(null);

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials: user not found' });
    });

    it('should reject if user has no password (Google only)', async () => {
      const req = { body: { email: 'g@test.com', password: 'pass' } };
      const res = createRes();

      User.findOne.mockResolvedValue({ _id: 'u1', email: 'g@test.com', password: null });

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sign in with Google, this account has no password'
      });
    });

    it('should reject if password incorrect', async () => {
      const req = { body: { email: 'u@test.com', password: 'wrong' } };
      const res = createRes();

      User.findOne.mockResolvedValue({ _id: 'u1', email: 'u@test.com', password: 'hash' });
      bcrypt.compare.mockResolvedValue(false);

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid credentials: password incorrect'
      });
    });

    it('should return token and user on success', async () => {
      const req = { body: { email: 'u@test.com', password: 'pass123' } };
      const res = createRes();

      const mockUser = {
        _id: 'u1',
        email: 'u@test.com',
        password: 'hash',
        name: 'User',
        authentication: 'email'
      };
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('jwt-token');

      await authController.loginUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        token: 'jwt-token',
        user: {
          _id: 'u1',
          name: 'User',
          email: 'u@test.com',
          authentication: 'email'
        }
      });
    });
  });

  describe('getMe', () => {
    it('should return 401 if no user on req', () => {
      const req = { user: null };
      const res = createRes();

      authController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return user data if authenticated', () => {
      const req = {
        user: {
          _id: 'u1',
          name: 'User',
          email: 'u@test.com',
          authentication: 'email'
        }
      };
      const res = createRes();

      authController.getMe(req, res);

      expect(res.body).toEqual({
        _id: 'u1',
        name: 'User',
        email: 'u@test.com',
        authentication: 'email'
      });
    });
  });
});
