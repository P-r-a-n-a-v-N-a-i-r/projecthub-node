import express from 'express';
import { sendInviteEmail } from '../controllers/inviteController.js';

const router = express.Router();

router.post('/', sendInviteEmail);

export default router;
 