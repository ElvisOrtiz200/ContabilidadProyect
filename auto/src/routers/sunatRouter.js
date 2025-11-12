import express from 'express';

import { SunatController } from '../controllers/sunatController.js';

const router = express.Router();

router.post('/login', SunatController.login);
router.post('/descargar', SunatController.descargar);

export default router;