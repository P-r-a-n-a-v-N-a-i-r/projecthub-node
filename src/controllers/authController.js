import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import dotenv from 'dotenv';
import Otp from '../models/Otp.js';
import axios from 'axios';
import validator from 'validator';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const oAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// helper to sanitize+validate email from any source
function normalizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!validator.isEmail(trimmed)) return null;
  return trimmed;
}

// Send OTP to email
export const sendOtp = async (req, res) => {
  const safeEmail = normalizeEmail(req.body?.email);
  if (!safeEmail) {
    return res.status(400).json({ message: 'Invalid email' });
  }

  try {
    const user = await User.findOne({ email: safeEmail });
    if (user) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Otp.findOneAndUpdate(
      { email: safeEmail },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    const emailHTML = `... use ${otp} here ...`;

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'ProjectHub',
          email: 'cloudsynktech@gmail.com',
        },
        to: [
          {
            email: safeEmail,
            name: safeEmail.split('@')[0] || 'User',
          }
        ],
        subject: 'Your OTP Code for ProjectHub Signup',
        htmlContent: emailHTML
      },
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        }
      }
    );
    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  const safeEmail = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : null;

  if (!safeEmail || !otp) {
    return res.status(400).json({ message: 'Email and OTP required' });
  }

  try {
    const record = await Otp.findOne({ email: safeEmail });
    if (!record) return res.status(400).json({ message: 'OTP not found' });

    if (record.expiresAt < Date.now()) {
      await Otp.deleteOne({ email: safeEmail });
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    await Otp.deleteOne({ email: safeEmail });
    return res.json({ message: 'OTP verified' });
  } catch (error) {
    console.error('[verifyOtp] error:', error);
    return res.status(500).json({ message: 'OTP verification failed' });
  }
};

// Register user
export const registerUser = async (req, res) => {
  try {
    let { name, email, password, confirmPassword } = req.body || {};

    const safeEmail = normalizeEmail(email);
    const safeName =
      typeof name === 'string' ? name.trim() : '';

    if (!safeName || !safeEmail || !password || password !== confirmPassword) {
      return res.status(400).json({ message: 'Invalid signup data' });
    }

    const userExists = await User.findOne({ email: safeEmail });
    if (userExists) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name: safeName,
      email: safeEmail,
      password: hash,
      authentication: 'email',
    });

    const token = sign(user);
    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        authentication: user.authentication,
      },
    });
  } catch (error) {
    console.error('[signup] error:', error);
    return res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};


// Login
export const loginUser = async (req, res) => {
  try {
    const safeEmail = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : null;

    if (!safeEmail || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email: safeEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials: user not found' });
    }
    if (!user.password) {
      return res.status(401).json({ message: 'Sign in with Google, this account has no password' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials: password incorrect' });
    }

    const token = sign(user);
    return res.json({ token, user: { _id: user._id, name: user.name, email: user.email, authentication: user.authentication } });
  } catch (e) {
    console.error('[login] error:', e);
    return res.status(500).json({ message: 'Login failed' });
  }
};

// Google login already uses Google-verified email; still normalize it
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential || !oAuthClient) return res.status(400).json({ message: 'Missing Google credential' });

    const ticket = await oAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const safeEmail = normalizeEmail(payload.email);
    if (!safeEmail) return res.status(400).json({ message: 'Invalid Google email' });

    const name = payload.name || safeEmail.split('@')[0];
    const authentication = 'google';

    let user = await User.findOne({ email: safeEmail });
    if (!user) user = await User.create({ name, email: safeEmail, password: '', authentication });

    const token = sign(user);
    return res.json({ token, user: { _id: user._id, name: user.name, email: user.email, authentication: user.authentication } });
  } catch (e) {
    console.error('[google] error:', e);
    return res.status(401).json({ message: 'Google authentication failed' });
  }
};

export const getMe = (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    authentication: user.authentication
  });
};
