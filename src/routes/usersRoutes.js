import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  updateMe,
  deleteMe,
  resetPassword,
  getAllUsers
} from '../controllers/usersController.js';

const router = express.Router();

router.put('/me', authMiddleware, updateMe); // update profile
router.delete('/me', authMiddleware, deleteMe); // delete account
router.post('/reset-password', resetPassword); // reset password request
router.get('/allUsers', authMiddleware, getAllUsers);

export default router;
