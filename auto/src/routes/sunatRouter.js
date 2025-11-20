import express from 'express';
import { SunatController } from '../controllers/sunatController.js';
import { validateSunatLogin } from '../validators/sunatValidator.js';
import { authenticate } from '../middlewares/auth/authenticate.js';

const router = express.Router();

/**
 * Middleware para validar datos de login
 */
const validateLogin = (req, res, next) => {
  try {
    validateSunatLogin(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

// Todas las rutas de SUNAT requieren autenticación
router.use(authenticate);

router.post('/obtenerRentas', validateLogin, SunatController.obtenerRentaDeclaracionesYPagos);
router.post('/descargar', SunatController.descargar);

export default router;