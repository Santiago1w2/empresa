import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { fmtFechaHora, idCorto, nombreRol } from "../util";
import { Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

export default function Auditoria() {
  const [items, setItems] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroEntidad, setFiltroEntidad] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [it, us] = await Promise.all([api("/auditoria"), api("/usuarios")]);
        setItems(it);
        setUsuarios(us);
      } catch (e) {
        setError(e.message);
      }
    };
    cargar();
  }, []);

  const entidades = useMemo(
    () => [...new Set((items || []).map((i) => i.entidad).filter(Boolean))].sort(),
    [items]
  );

  if (error) return <EncabezadoVista titulo="Auditoría" sub={error} />;
  if (!items) return <Cargando />;

  const recortar = (texto, n) => {
    texto = texto || "";
    return texto.length > n ? texto.slice(0, n) + "…" : texto;
  };

  let filas = items;
  if (filtroUsuario) filas = filas.filter((i) => i.usuarioId === filtroUsuario);
  if (filtroEntidad) filas = filas.filter((i) => i.entidad === filtroEntidad);

  return (
    <>
      <EncabezadoVista titulo="Auditoría" sub={"Registro de acciones del sistema (últimas " + items.length + ")"} />
      <div className="fila filtros-aud">
        <label className="campo">
          <span>Usuario</span>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.usuarioId} value={u.usuarioId}>{u.nombre}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Entidad</span>
          <select value={filtroEntidad} onChange={(e) => setFiltroEntidad(e.target.value)}>
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
      </div>
      {filas.length === 0 ? (
        <Vacio mensaje="Sin registros con esos filtros" />
      ) : (
        <div className="tarjeta tabla-scroll">
          <table className="tabla-datos tabla-aud">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((i, idx) => (
                <tr key={idx}>
                  <td>{fmtFechaHora(i.creadoEn__id)}</td>
                  <td>
                    <strong>{i.usuarioNombre || ""}</strong>
                    <br />
                    <span className="nota">{nombreRol(i.rol)}</span>
                  </td>
                  <td>{i.accion}</td>
                  <td>
                    {i.entidad}
                    {i.entidadId ? " " : ""}
                    {i.entidadId && <span className="nota">{idCorto(i.entidadId)}</span>}
                  </td>
                  <td>{recortar(i.detalle, 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
