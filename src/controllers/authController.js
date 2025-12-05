import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import dotenv from 'dotenv';
import Otp from '../models/Otp.js';
import axios from 'axios';

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

// Send OTP to email (can be called client-side first)
export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  // Check if the user already exists
  const user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await Otp.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    const emailHTML = `
      <html>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #28443F; color: #fff; text-align: center; padding: 30px;">
                      <h1 style="margin:0; font-size: 28px;">ProjectHub</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px; color: #333; line-height: 1.6;">
                      <p style="font-size: 16px;">
                        Your OTP code to complete signup is:
                      </p>
                      <p style="text-align:center; margin: 30px 0; font-size: 24px; font-weight: bold; color: #28443F;">
                        ${otp}
                      </p>
                      <p style="font-size: 14px; color: #777;">
                        This OTP will expire in 10 minutes. If you did not request this, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f0f0f0; text-align: center; padding: 20px; font-size: 12px; color: #555;">
                      &copy; ${new Date().getFullYear()} ProjectHub. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'ProjectHub',
          email: 'cloudsynktech@gmail.com', // Verified sender
        },
        to: [
          {
            email: email,
            name: email.split('@')[0] || 'User', // Use part before @ as placeholder
          }
        ],
        subject: 'Your OTP Code for ProjectHub Signup',
        htmlContent: emailHTML
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        }
      }
    );
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};




// Verify OTP - called prior to registration
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

  try {
    const record = await Otp.findOne({ email });
    if (!record) return res.status(400).json({ message: 'OTP not found' });

    if (record.expiresAt < Date.now()) {
      await Otp.deleteOne({ email });
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP verified, delete from DB
    await Otp.deleteOne({ email });

    res.json({ message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
};

// Register user after OTP verified
export const registerUser = async (req, res) => {
  try {
    let { name, email, password, confirmPassword } = req.body || {};
    if (!name || !email || !password || password !== confirmPassword) {
      return res.status(400).json({ message: 'Invalid signup data' });
    }

    email = email.toLowerCase();

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(409).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, password: hash, authentication: 'email' });

    const token = sign(user);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, authentication: user.authentication },
    });
  } catch (error) {
    console.error('[signup] error:', error);
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = (email || '').toLowerCase();

    const user = await User.findOne({ email });
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
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email ,authentication: user.authentication} });
  } catch (e) {
    console.error('[login] error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential || !oAuthClient) return res.status(400).json({ message: 'Missing Google credential' });

    const ticket = await oAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();
    const name = payload.name || (email && email.split('@')[0]);
    const authentication = 'google'

    let user = await User.findOne({ email });
    if (!user) user = await User.create({ name, email, password: '', authentication }); // Google-only user

    const token = sign(user);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, authentication: user.authentication } });
  } catch (e) {
    console.error('[google] error:', e);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

export const getMe = (req, res) => {
  const user = req.user;

  console.log("Authenticated user info:", user);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Safely respond with user info excluding sensitive data
  return res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    authentication: user.authentication
  });
};
