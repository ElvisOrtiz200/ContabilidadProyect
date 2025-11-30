import express from 'express';
import { EmpresaController } from '../controllers/empresaController.js';
import { authenticate } from '../middlewares/auth/authenticate.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /empresas
 * @desc    Lista empresas
 * @access  Private
 */
router.get('/', EmpresaController.list);

/**
 * @route   GET /empresas/:empresaId/credenciales
 * @desc    Obtiene credenciales SUNAT de una empresa
 * @access  Private
 */
router.get('/:empresaId/credenciales', EmpresaController.getCredenciales);

/**
 * @route   GET /empresas/:empresaId
 * @desc    Obtiene empresa por ID
 * @access  Private
 */
router.get('/:empresaId', EmpresaController.getById);

/**
 * @route   POST /empresas
 * @desc    Crea una empresa
 * @access  Private
 */
router.post('/', EmpresaController.create);

/**
 * @route   PUT /empresas/:empresaId
 * @desc    Actualiza una empresa
 * @access  Private
 */
router.put('/:empresaId', EmpresaController.update);

/**
 * @route   PATCH /empresas/:empresaId
 * @desc    Actualiza parcialmente una empresa (compatible con Supabase)
 * @access  Private
 */
router.patch('/:empresaId', EmpresaController.update);

/**
 * @route   DELETE /empresas/:empresaId
 * @desc    Elimina una empresa
 * @access  Private
 */
router.delete('/:empresaId', EmpresaController.remove);

export default router;

