import express from 'express';
import { SunatCredencialesController } from '../controllers/sunatCredencialesController.js';
import { authenticate } from '../middlewares/auth/authenticate.js';

const router = express.Router();

// Todas estas rutas requieren token válido
router.use(authenticate);

/**
 * @route   GET /sunat-credenciales
 * @desc    Lista credenciales SUNAT (filtros opcionales: regimen, empresa_id)
 * @access  Private
 */
router.get('/', SunatCredencialesController.list);

/**
 * @route   GET /sunat-credenciales/empresa/:empresaId
 * @desc    Obtiene credenciales SUNAT de una empresa específica
 * @access  Private
 */
router.get('/empresa/:empresaId', SunatCredencialesController.getByEmpresaId);

/**
 * @route   GET /sunat-credenciales/:sunatId
 * @desc    Obtiene credencial por sunat_id
 * @access  Private
 */
router.get('/:sunatId', SunatCredencialesController.getById);

/**
 * @route   POST /sunat-credenciales
 * @desc    Crea credenciales SUNAT
 * @access  Private
 */
router.post('/', SunatCredencialesController.create);

/**
 * @route   PUT /sunat-credenciales/:sunatId
 * @desc    Actualiza credenciales SUNAT
 * @access  Private
 */
router.put('/:sunatId', SunatCredencialesController.update);

/**
 * @route   DELETE /sunat-credenciales/:sunatId
 * @desc    Elimina credenciales SUNAT
 * @access  Private
 */
router.delete('/:sunatId', SunatCredencialesController.remove);

export default router;


