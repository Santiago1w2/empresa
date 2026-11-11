import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";

export default function Login() {
  const [registro, setRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { entrar } = useSesion();
  const { toast } = useUi();
  const navegar = useNavigate();

  const [form, setForm] = useState({
    nombre: "", email: "", clave: "", rol: "estudiante", nivel: "", grado: "", seccion: "",
  });
  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const datos = registro
        ? await api("/auth/registrar", { metodo: "POST", cuerpo: form })
        : await api("/auth/login", { metodo: "POST", cuerpo: { email: form.email, clave: form.clave } });
      entrar(datos.token, datos.usuario);
      navegar("/inicio");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-fondo">
      <div className="login-caja">
        <div className="logo-marca">
          <div className="logo-circulo">SA</div>
          <div>
            <h1>Santa Anita Conecta</h1>
            <p>La plataforma oficial del colegio</p>
          </div>
        </div>
        <form onSubmit={enviar}>
          {registro && (
            <>
              <label className="campo">
                <span>Nombre completo</span>
                <input value={form.nombre} onChange={set("nombre")} required />
              </label>
              <label className="campo">
                <span>Correo</span>
                <input type="email" value={form.email} onChange={set("email")} required />
              </label>
              <label className="campo">
                <span>Clave (mínimo 6)</span>
                <input type="password" value={form.clave} onChange={set("clave")} required minLength="6" />
              </label>
              <label className="campo">
                <span>Rol</span>
                <select value={form.rol} onChange={set("rol")}>
                  <option value="estudiante">Estudiante</option>
                  <option value="docente">Docente / Tutor</option>
                  <option value="padre">Padre / Apoderado</option>
                </select>
              </label>
              <label className="campo">
                <span>Nivel</span>
                <select value={form.nivel} onChange={set("nivel")}>
                  <option value="">—</option>
                  <option>Primaria</option>
                  <option>Secundaria</option>
                </select>
              </label>
              <div className="fila">
                <label className="campo">
                  <span>Grado</span>
                  <input value={form.grado} onChange={set("grado")} placeholder="5°" />
                </label>
                <label className="campo">
                  <span>Sección</span>
                  <input value={form.seccion} onChange={set("seccion")} placeholder="A" />
                </label>
              </div>
            </>
          )}
          {!registro && (
            <>
              <label className="campo">
                <span>Correo</span>
                <input type="email" value={form.email} onChange={set("email")} required placeholder="omar@santaanita.edu.pe" />
              </label>
              <label className="campo">
                <span>Clave</span>
                <input type="password" value={form.clave} onChange={set("clave")} required placeholder="••••••••" />
              </label>
            </>
          )}
          <button className="btn primario bloque" type="submit" disabled={cargando}>
            {cargando ? "Un momento…" : registro ? "Crear cuenta" : "Ingresar"}
          </button>
          <p className="login-pie">
            {registro ? (
              <a href="#" onClick={(e) => { e.preventDefault(); setRegistro(false); }}>Ya tengo cuenta</a>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); setRegistro(true); }}>Regístrate</a>
            )}
          </p>
          {!registro && (
            <div className="login-demo">
              <p>Cuentas demo (clave: demo1234)</p>
              <p>
                omar@santaanita.edu.pe (estudiante) · lucia@santaanita.edu.pe (docente)
                <br />
                carlos@santaanita.edu.pe (coordinación) · laura@santaanita.edu.pe (dirección)
                <br />
                jorge@santaanita.edu.pe (padre) · ti@santaanita.edu.pe (admin TI)
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
