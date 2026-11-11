import { nombreEstado } from "../util";

export function Tarjeta({ className = "", como = "section", children, ...props }) {
  const Etiqueta = como;
  return (
    <Etiqueta className={"tarjeta " + className} {...props}>
      {children}
    </Etiqueta>
  );
}

export function EncabezadoVista({ titulo, sub, acciones }) {
  return (
    <div className="encabezado-vista">
      <div>
        <h2>{titulo}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {acciones && <div>{acciones}</div>}
    </div>
  );
}

export function Vacio({ mensaje, icono = "···" }) {
  return (
    <div className="vacio">
      <div className="vacio-icono">{icono}</div>
      <p>{mensaje}</p>
    </div>
  );
}

export function Cargando() {
  return (
    <div className="cargando">
      <div className="espiner"></div>
      <p>Cargando…</p>
    </div>
  );
}

export function Badge({ estado }) {
  return <span className={"badge b-" + estado}>{nombreEstado(estado)}</span>;
}

export function Semaforo({ estado }) {
  const colores = {
    BORRADOR: "gris", EN_REVISION: "amarillo", OBSERVADA: "amarillo",
    EN_AUTORIZACION_PADRES: "amarillo", APROBADA: "verde", APROBADA_CONDICIONES: "verde",
    EN_EJECUCION: "azul", FINALIZADA: "gris", ARCHIVADA: "gris", RECHAZADA: "rojo",
    ACTIVA: "verde", EN_PAUSA: "amarillo", SIN_RESPONSABLE: "rojo",
    PENDIENTE: "amarillo", ACEPTADA: "verde",
  };
  return <span className={"semaforo s-" + (colores[estado] || "gris")} title={nombreEstado(estado)}></span>;
}

export function FilaLista({ href, onClick, className = "", children }) {
  if (href) return <a className={"fila-lista " + className} href={href}>{children}</a>;
  return (
    <div className={"fila-lista " + className} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      {children}
    </div>
  );
}

export function Campo({ etiqueta, className = "", children }) {
  return (
    <label className={"campo " + className}>
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

export function Kpi({ valor, texto, alarma }) {
  return (
    <div className={"kpi" + (alarma ? " alarma" : "")}>
      <strong>{valor}</strong>
      <span>{texto}</span>
    </div>
  );
}

export function Barras({ datos, nombre = (k) => k }) {
  const entradas = Object.entries(datos || {});
  const total = entradas.reduce((a, [, v]) => a + v, 0);
  if (!entradas.length) return <p className="nota">Sin datos aún</p>;
  return (
    <div className="barras">
      {entradas.map(([k, v]) => (
        <div className="barra-fila" key={k}>
          <span>{nombre(k)}</span>
          <div className="barra-pista">
            <div className="barra-relleno" style={{ width: Math.min(100, (v * 100) / Math.max(1, total)) + "%" }}></div>
          </div>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}
