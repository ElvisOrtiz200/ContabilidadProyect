import { sunatLogin } from "../services/sunatLogin.js";
import { descargarConstancias } from "../services/sunatDescarga.js";

export const SunatController = {
  login: async (req, res) => {
    try {
      const { ruc, usuario, clave } = req.body;
      await sunatLogin(ruc, usuario, clave);
      res.json({ message: "Sesion iniciada correctamente" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error en inicio de sesión" });
    }
  },

  descargar: async (req, res) => {
    try {
      await descargarConstancias();
      res.json({ message: "Excel descargado correctamente" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al descargar Excel" });
    }
  },
};
