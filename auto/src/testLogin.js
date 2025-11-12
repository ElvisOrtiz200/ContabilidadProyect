import { sunatLogin } from './services/sunatLogin.js';
import 'dotenv/config';

await sunatLogin(process.env.SUNAT_RUC, process.env.SUNAT_USER, process.env.SUNAT_PASS);
