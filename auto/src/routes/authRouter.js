import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth/authenticate.js';
import { validateAuthLogin, validateAuthRegister } from '../validators/authValidator.js';

const router = express.Router();

/**
 * @route   POST /auth/login
 * @desc    Inicia sesión con email y contraseña
 * @access  Public
 */
router.post('/login', validateAuthLogin, AuthController.login);

/**
 * @route   POST /auth/register
 * @desc    Registra un nuevo usuario
 * @access  Public
 */
router.post('/register', validateAuthRegister, AuthController.register);

/**
 * @route   POST /auth/refresh
 * @desc    Refresca el token de acceso
 * @access  Public
 */
router.post('/refresh', AuthController.refresh);

/**
 * @route   GET /auth/me
 * @desc    Obtiene información del usuario actual
 * @access  Private
 */
router.get('/me', authenticate, AuthController.me);

/**
 * @route   POST /auth/logout
 * @desc    Cierra sesión
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   POST /auth/resend-confirmation
 * @desc    Reenvía el email de confirmación
 * @access  Public
 */
router.post('/resend-confirmation', AuthController.resendConfirmation);

export default router;

