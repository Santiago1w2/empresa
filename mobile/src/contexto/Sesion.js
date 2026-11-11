import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const ContextoSesion = createContext(null);

export function SesionProveedor({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    const arranque = async () => {
      try {
        if (await AsyncStorage.getItem("sac-token")) {
          setUsuario(await api("/auth/yo"));
        }
      } catch (e) {
        setUsuario(null);
      }
      setCargando(false);
    };
    arranque();
  }, []);

  const refrescarCampana = useCallback(async () => {
    try {
      const datos = await api("/notificaciones");
      setNoLeidas(datos.noLeidas || 0);
    } catch (e) {}
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
    refrescarCampana();
    const temporizador = setInterval(refrescarCampana, 30000);
    return () => clearInterval(temporizador);
  }, [usuario, refrescarCampana]);

  const entrar = useCallback((token, u) => {
    AsyncStorage.setItem("sac-token", token);
    setUsuario(u);
  }, []);

  const salir = useCallback(() => {
    AsyncStorage.removeItem("sac-token");
    setUsuario(null);
    setCatalogo(null);
    setNoLeidas(0);
  }, []);

  return (
    <ContextoSesion.Provider value={{ usuario, catalogo, cargando, noLeidas, entrar, salir, setNoLeidas, refrescarCampana }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion() {
  return useContext(ContextoSesion);
}
