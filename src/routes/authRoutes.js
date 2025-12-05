import express from 'express';
import { registerUser, loginUser, googleLogin, getMe, sendOtp, verifyOtp } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/me',authMiddleware, getMe); 
router.post('/send-otp', sendOtp); 
router.post('/verify-otp', verifyOtp); 


export default router;

