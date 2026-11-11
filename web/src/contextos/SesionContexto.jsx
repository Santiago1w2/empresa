import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const SesionContexto = createContext(null);

export function SesionProveedor({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [noLeidas, setNoLeidas] = useState(0);

  const aplicarPreferencias = () => {
    document.documentElement.dataset.tema = localStorage.getItem("sac-tema") || "claro";
    document.documentElement.dataset.letra = localStorage.getItem("sac-letra") || "mediano";
  };

  useEffect(() => {
    aplicarPreferencias();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    const arranque = async () => {
      if (localStorage.getItem("sac-token")) {
        try {
          const u = await api("/auth/yo");
          setUsuario(u);
        } catch (e) {
          setUsuario(null);
        }
      }
      setCargando(false);
    };
    arranque();
    const alFallarToken = () => {
      setUsuario(null);
      setCatalogo(null);
    };
    window.addEventListener("sac-token-invalido", alFallarToken);
    return () => window.removeEventListener("sac-token-invalido", alFallarToken);
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;
    const cargarCatalogo = async () => {
      try {
        setCatalogo(await api("/catalogos"));
      } catch (e) {
        setCatalogo(null);
      }
    };
    cargarCatalogo();
    const sonarCampana = async () => {
      try {
        const datos = await api("/notificaciones");
        setNoLeidas(datos.noLeidas || 0);
      } catch (e) {}
    };
    sonarCampana();
    const temporizador = setInterval(sonarCampana, 30000);
    return () => clearInterval(temporizador);
  }, [usuario]);

  const entrar = useCallback((token, u) => {
    localStorage.setItem("sac-token", token);
    setUsuario(u);
  }, []);

  const salir = useCallback(() => {
    localStorage.removeItem("sac-token");
    setUsuario(null);
    setCatalogo(null);
    setNoLeidas(0);
  }, []);

  const cambiarTema = useCallback(() => {
    const nuevo = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
    localStorage.setItem("sac-tema", nuevo);
    document.documentElement.dataset.tema = nuevo;
  }, []);

  const cambiarLetra = useCallback((direccion) => {
    const orden = ["pequeno", "mediano", "grande"];
    let i = Math.min(2, Math.max(0, orden.indexOf(localStorage.getItem("sac-letra") || "mediano") + direccion));
    localStorage.setItem("sac-letra", orden[i]);
    document.documentElement.dataset.letra = orden[i];
  }, []);

  const sonarCampanaAhora = useCallback(async () => {
    try {
      const datos = await api("/notificaciones");
      setNoLeidas(datos.noLeidas || 0);
      return datos;
    } catch (e) {
      return null;
    }
  }, []);

  return (
    <SesionContexto.Provider
      value={{ usuario, catalogo, cargando, noLeidas, entrar, salir, cambiarTema, cambiarLetra, sonarCampanaAhora, setCatalogo }}
    >
      {children}
    </SesionContexto.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContexto);
}
