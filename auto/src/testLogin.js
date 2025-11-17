import { sunatLogin } from './services/sunat/sunatLogin.js';
import { config } from './config/index.js';

await sunatLogin(config.sunat.ruc, config.sunat.usuario, config.sunat.clave);
