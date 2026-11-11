import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { NOMBRES_ROL, nombreRol } from "../util";
import { Cargando, EncabezadoVista } from "../componentes/basicos";

export default function Usuarios() {
  const { catalogo, setCatalogo } = useSesion();
  const { toast, abrirModal, cerrarModal } = useUi();
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await api("/usuarios"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Usuarios" sub={error} />;
  if (!usuarios) return <Cargando />;

  const estudiantes = usuarios.filter((u) => u.rol === "estudiante");

  const editar = (u) =>
    abrirModal(u ? "Editar usuario" : "Nuevo usuario", <FormUsuario usuario={u} estudiantes={estudiantes} alGuardar={guardar} />, null);

  const guardar = async (u, cuerpo) => {
    if (!cuerpo.nombre.trim()) {
      toast("El nombre es obligatorio", "error");
      return;
    }
    try {
      if (!u) {
        await api("/usuarios", { metodo: "POST", cuerpo });
        toast("Usuario creado");
      } else {
        await api("/usuarios/" + u.usuarioId, { metodo: "PUT", cuerpo });
        toast("Usuario actualizado");
      }
      cerrarModal();
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const editorCatalogos = () => {
    abrirModal(
      "Catálogos institucionales",
      <FormCatalogos cat={catalogo} alGuardar={async (tiposSolicitud, slaPorRol) => {
        try {
          const nuevo = await api("/catalogos", { metodo: "PUT", cuerpo: { tiposSolicitud, slaPorRol } });
          setCatalogo(nuevo);
          cerrarModal();
          toast("Catálogos actualizados");
        } catch (e) {
          toast(e.message, "error");
        }
      }} />,
      null
    );
  };

  const iniciales = (nombre) =>
    (nombre || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <EncabezadoVista
        titulo="Usuarios"
        acciones={
          <div>
            <button className="btn" onClick={editorCatalogos}>Catálogos</button>{" "}
            <button className="btn primario" onClick={() => editar(null)}>Nuevo usuario</button>
          </div>
        }
      />
      <p className="nota">
        {usuarios.length} usuarios registrados · {usuarios.filter((u) => u.activo === false).length} desactivados
      </p>
      <div className="tarjeta lista">
        {usuarios.map((u) => (
          <div className="fila-lista usuario-fila" key={u.usuarioId}>
            <span className="avatar chico">{iniciales(u.nombre)}</span>
            <div className="fila-principal">
              <strong>
                {u.nombre} {u.activo === false && <span className="prioridad-tag">Desactivado</span>}
              </strong>
              <p>
                {u.email || ""} · {nombreRol(u.rol)}
                {u.nivel ? " · " + u.nivel + " " + (u.grado || "") + (u.seccion || "") : ""}
              </p>
              {u.rol === "padre" && (u.hijos || []).length > 0 && (
                <p className="nota">
                  Hijos vinculados: {(u.hijos || []).map((id) => nombreHijo(id, estudiantes)).join(", ")}
                </p>
              )}
            </div>
            <button className="btn chico" onClick={() => editar(u)}>Editar</button>
          </div>
        ))}
      </div>
    </>
  );
}

function nombreHijo(usuarioId, estudiantes) {
  const e = estudiantes.find((x) => x.usuarioId === usuarioId);
  return e ? e.nombre : usuarioId.slice(0, 8);
}

function FormUsuario({ usuario, estudiantes, alGuardar }) {
  const esNuevo = !usuario;
  const [nombre, setNombre] = useState(usuario ? usuario.nombre || "" : "");
  const [email, setEmail] = useState(usuario ? usuario.email || "" : "");
  const [clave, setClave] = useState("");
  const [rol, setRol] = useState(usuario ? usuario.rol || "estudiante" : "estudiante");
  const [nivel, setNivel] = useState(usuario ? usuario.nivel || "" : "");
  const [grado, setGrado] = useState(usuario ? usuario.grado || "" : "");
  const [seccion, setSeccion] = useState(usuario ? usuario.seccion || "" : "");
  const [hijos, setHijos] = useState(usuario ? (usuario.hijos || []).slice() : []);
  const [activo, setActivo] = useState(usuario ? usuario.activo !== false : true);
  const { toast } = useUi();

  const guardar = () => {
    const cuerpo = { nombre, rol, nivel, grado, seccion, hijos };
    if (clave) cuerpo.clave = clave;
    if (!esNuevo) {
      cuerpo.activo = activo;
      if (!cuerpo.clave) delete cuerpo.clave;
    }
    if (!nombre.trim()) {
      toast("El nombre es obligatorio", "error");
      return;
    }
    if (esNuevo && (!email.includes("@") || !cuerpo.clave || cuerpo.clave.length < 6)) {
      toast("Correo válido y clave de al menos 6 caracteres", "error");
      return;
    }
    if (esNuevo) cuerpo.email = email;
    alGuardar(usuario, cuerpo);
  };

  return (
    <>
      <label className="campo"><span>Nombre completo</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <label className="campo">
        <span>Correo</span>
        <input type="email" value={email} disabled={!esNuevo} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {esNuevo && (
        <label className="campo"><span>Clave inicial (mínimo 6)</span><input type="password" value={clave} onChange={(e) => setClave(e.target.value)} /></label>
      )}
      <div className="fila">
        <label className="campo">
          <span>Rol</span>
          <select value={rol} onChange={(e) => setRol(e.target.value)}>
            {Object.keys(NOMBRES_ROL).map((r) => (
              <option key={r} value={r}>{nombreRol(r)}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Nivel</span>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">—</option>
            <option value="Primaria">Primaria</option>
            <option value="Secundaria">Secundaria</option>
          </select>
        </label>
      </div>
      <div className="fila">
        <label className="campo"><span>Grado</span><input value={grado} placeholder="5°" onChange={(e) => setGrado(e.target.value)} /></label>
        <label className="campo"><span>Sección</span><input value={seccion} placeholder="A" onChange={(e) => setSeccion(e.target.value)} /></label>
      </div>
      <label className="campo">
        <span>Hijos vinculados (solo para padres)</span>
        <div className="etiquetas">
          {estudiantes.map((e) => (
            <label className="check" key={e.usuarioId}>
              <input
                type="checkbox"
                checked={hijos.includes(e.usuarioId)}
                onChange={(ev) =>
                  setHijos(ev.target.checked ? [...hijos, e.usuarioId] : hijos.filter((id) => id !== e.usuarioId))
                }
              />{" "}
              {e.nombre}
            </label>
          ))}
        </div>
      </label>
      {!esNuevo && (
        <label className="check">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Usuario activo
        </label>
      )}
      {!esNuevo && (
        <label className="campo"><span>Nueva clave (dejar vacío para no cambiar)</span><input type="password" value={clave} onChange={(e) => setClave(e.target.value)} /></label>
      )}
      <button className="btn primario" onClick={guardar}>{esNuevo ? "Crear" : "Guardar"}</button>
    </>
  );
}

function FormCatalogos({ cat, alGuardar }) {
  const [tipos, setTipos] = useState(JSON.stringify((cat && cat.tiposSolicitud) || {}, null, 1));
  const [sla, setSla] = useState(JSON.stringify((cat && cat.slaPorRol) || {}, null, 1));
  const { toast } = useUi();
  const guardar = () => {
    let tiposSolicitud, slaPorRol;
    try {
      tiposSolicitud = JSON.parse(tipos);
      slaPorRol = JSON.parse(sla);
    } catch (e) {
      toast("JSON inválido: " + e.message, "error");
      return;
    }
    alGuardar(tiposSolicitud, slaPorRol);
  };
  return (
    <>
      <p className="nota">Edita los tipos de solicitud, rutas de aprobación y SLA. JSON válido obligatorio.</p>
      <label className="campo"><span>tiposSolicitud</span><textarea rows="8" value={tipos} onChange={(e) => setTipos(e.target.value)} /></label>
      <label className="campo"><span>slaPorRol (días hábiles)</span><textarea rows="4" value={sla} onChange={(e) => setSla(e.target.value)} /></label>
      <button className="btn primario" onClick={guardar}>Guardar catálogos</button>
    </>
  );
}
