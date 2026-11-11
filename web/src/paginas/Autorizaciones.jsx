import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, fmtFechaHora } from "../util";
import { Badge, Cargando, EncabezadoVista, Semaforo, Vacio } from "../componentes/basicos";

export default function Autorizaciones() {
  const { usuario } = useSesion();
  const { toast, abrirModal, cerrarModal } = useUi();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/autorizaciones"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Autorizaciones" sub={error} />;
  if (!items) return <Cargando />;

  const esPadre = usuario.rol === "padre";

  const decidir = (decision, id) =>
    abrirModal(
      decision === "aceptar" ? "Aceptar autorización" : "Rechazar autorización",
      <FormFirma decision={decision} nombre={usuario.nombre} alConfirmar={async (firma) => {
        if (!firma) {
          toast("Escribe tu nombre completo como firma", "error");
          return;
        }
        try {
          await api("/autorizaciones/" + id + "/decidir", { metodo: "POST", cuerpo: { decision, firma } });
          cerrarModal();
          toast(decision === "aceptar" ? "Autorización aceptada" : "Autorización rechazada");
          cargar();
        } catch (e) {
          toast(e.message, "error");
        }
      }} />,
      null
    );

  return (
    <>
      <EncabezadoVista titulo="Autorizaciones" />
      <p className="nota">
        {esPadre
          ? "Actividades de tu hijo(a) que requieren tu autorización con firma digital."
          : "Autorizaciones de padres para actividades que los involucran."}
      </p>
      {items.length === 0 ? (
        <Vacio mensaje={esPadre ? "No hay autorizaciones pendientes para ti" : "No hay autorizaciones registradas"} />
      ) : (
        <div className="tarjeta lista">
          {items.map((a) => (
            <div className="fila-lista autorizacion" key={a.autorizacionId}>
              <Semaforo estado={a.estado} />
              <div className="fila-principal">
                <strong>{a.solicitudTitulo}</strong>
                <p>
                  {a.fecha ? fmtFecha(a.fecha) : ""}
                  {a.horaInicio ? " " + a.horaInicio + (a.horaFin ? "–" + a.horaFin : "") : ""}
                  {a.lugar ? " · " + a.lugar : ""}
                </p>
                <p className="nota">
                  Estudiante responsable: {a.responsable || "—"}
                  {esPadre ? "" : " · Apoderado: " + (a.apoderadoNombre || "")}
                </p>
                {a.estado !== "PENDIENTE" && (
                  <p className="nota">
                    {(a.estado === "ACEPTADA" ? "Aceptada" : "Rechazada") + " por " + (a.firma || "") + " · " + fmtFechaHora(a.decididoEn)}
                  </p>
                )}
              </div>
              {esPadre && a.estado === "PENDIENTE" ? (
                <div className="columna-botones">
                  <button className="btn chico primario" onClick={() => decidir("aceptar", a.autorizacionId)}>Aceptar</button>
                  <button className="btn chico peligro" onClick={() => decidir("rechazar", a.autorizacionId)}>Rechazar</button>
                </div>
              ) : (
                <Badge estado={a.estado} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FormFirma({ decision, nombre, alConfirmar }) {
  const [firma, setFirma] = useState("");
  return (
    <>
      <p>La firma digital consiste en escribir tu nombre completo tal como figura en el documento.</p>
      <label className="campo">
        <span>Firma digital (nombre completo)</span>
        <input value={firma} placeholder={nombre || ""} onChange={(e) => setFirma(e.target.value)} />
      </label>
      <button className={"btn " + (decision === "aceptar" ? "primario" : "peligro")} onClick={() => alConfirmar(firma.trim())}>
        {decision === "aceptar" ? "Aceptar y firmar" : "Rechazar"}
      </button>
    </>
  );
}
