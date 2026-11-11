import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { fmtFecha, nombreEstado, nombreRol } from "../util";
import { Badge, EncabezadoVista, Semaforo, Tarjeta, Vacio } from "../componentes/basicos";

export default function Inicio() {
  const { usuario } = useSesion();
  const [cuerpo, setCuerpo] = useState(null);
  const [error, setError] = useState("");
  const navegar = useNavigate();

  useEffect(() => {
    if (window.location.hash.replace(/\?.*$/, "") === "#/") {
      navegar("/inicio", { replace: true });
    }
  }, [navegar]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const rol = usuario.rol;
        if (rol === "estudiante" || rol === "padre") {
          const [solicitudes, anuncios] = await Promise.all([api("/solicitudes"), api("/anuncios?noLeidos=1")]);
          const activas = solicitudes.filter((s) =>
            ["EN_REVISION", "OBSERVADA", "EN_AUTORIZACION_PADRES", "EN_EJECUCION"].includes(s.estado)
          );
          setCuerpo({ rol, solicitudes: activas, anuncios });
        } else if (rol === "docente") {
          const [bandeja, proyectos] = await Promise.all([api("/solicitudes?bandeja=1"), api("/proyectos")]);
          setCuerpo({ rol, bandeja, proyectos: proyectos.filter((p) => p.docenteAsesorId === usuario.usuarioId) });
        } else {
          const bandeja = rol === "promotor" ? [] : await api("/solicitudes?bandeja=1");
          const indicadores = await api("/indicadores");
          setCuerpo({ rol, bandeja, indicadores });
        }
      } catch (e) {
        setError(e.message);
      }
    };
    cargar();
  }, [usuario]);

  const saludo = "Hola, " + (usuario.nombre || "").split(" ")[0];
  return (
    <>
      <EncabezadoVista titulo={saludo} sub={fechaBonita()} />
      <div className="rejilla-inicio">
        {error && (
          <Tarjeta className="col-span-2">
            <p>{error}</p>
          </Tarjeta>
        )}
        {cuerpo && cuerpo.rol === "estudiante" && <TarjetaInicioEstudiante datos={cuerpo} />}
        {cuerpo && cuerpo.rol === "padre" && <TarjetaInicioPadre datos={cuerpo} />}
        {cuerpo && cuerpo.rol === "docente" && <TarjetaInicioDocente datos={cuerpo} />}
        {["coordinacion", "administracion", "direccion", "promotor", "ti"].includes(cuerpo?.rol) && (
          <TarjetaInicioInstitucional datos={cuerpo} />
        )}
      </div>
    </>
  );
}

function TarjetaSolicitudes({ solicitudes }) {
  return (
    <Tarjeta className="col-span-2">
      <div className="tarjeta-encabezado">
        <h3>Mis solicitudes activas</h3>
        <Link to="/solicitudes">Ver todas</Link>
      </div>
      {solicitudes.length === 0 ? (
        <Vacio mensaje="No tienes solicitudes en curso. ¡Propón una iniciativa!" />
      ) : (
        solicitudes.map((s) => (
          <Link className="fila-lista" to={"/solicitudes/" + s.solicitudId} key={s.solicitudId}>
            <Semaforo estado={s.estado} />
            <div className="fila-principal">
              <strong>{s.titulo}</strong>
              <p>
                {nombreEstado(s.estado)}
                {s.revisorActualRol ? " · " + nombreRol(s.revisorActualRol) : ""}
              </p>
            </div>
            <Badge estado={s.estado} />
          </Link>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaTareas({ tareas }) {
  return (
    <Tarjeta>
      <div className="tarjeta-encabezado">
        <h3>Mis tareas</h3>
      </div>
      {tareas.length === 0 ? (
        <Vacio mensaje="Sin tareas pendientes en tus proyectos" />
      ) : (
        tareas.map((t) => (
          <Link className="fila-lista" to={"/proyectos/" + t.proyectoId} key={t.tareaId}>
            <div className="fila-principal">
              <strong>{t.titulo}</strong>
              <p>
                {t.proyecto || ""}
                {t.vence ? " · vence " + fmtFecha(t.vence) : ""}
              </p>
            </div>
            <Badge estado={t.estado} />
          </Link>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaAnuncios({ anuncios }) {
  return (
    <Tarjeta>
      <div className="tarjeta-encabezado">
        <h3>Anuncios sin leer</h3>
        <Link to="/anuncios">Ver todos</Link>
      </div>
      {anuncios.length === 0 ? (
        <Vacio mensaje="Estás al día con los anuncios" />
      ) : (
        anuncios.slice(0, 5).map((a) => (
          <div className="fila-lista" key={a.anuncioId}>
            <div className="fila-principal">
              <strong>{a.titulo}</strong>
              <p>{a.categoria}</p>
            </div>
            <Badge estado="PENDIENTE" />
          </div>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaBandeja({ solicitudes, titulo }) {
  return (
    <Tarjeta className="col-span-2">
      <div className="tarjeta-encabezado">
        <h3>
          {titulo} ({solicitudes.length})
        </h3>
        <Link to="/bandeja">Abrir bandeja</Link>
      </div>
      {solicitudes.length === 0 ? (
        <Vacio mensaje="Tu bandeja está vacía" />
      ) : (
        solicitudes.slice(0, 5).map((s) => (
          <Link className="fila-lista" to={"/solicitudes/" + s.solicitudId} key={s.solicitudId}>
            <div className="fila-principal">
              <strong>{s.titulo}</strong>
              <p>
                {s.solicitanteNombre || ""} · {s.tipoNombre || ""}
              </p>
            </div>
            <Badge estado={s.estado} />
          </Link>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaProyectos({ proyectos, titulo }) {
  return (
    <Tarjeta>
      <div className="tarjeta-encabezado">
        <h3>{titulo}</h3>
        <Link to="/proyectos">Ver todos</Link>
      </div>
      {proyectos.length === 0 ? (
        <Vacio mensaje="Sin proyectos" />
      ) : (
        proyectos.slice(0, 5).map((p) => (
          <Link className="fila-lista" to={"/proyectos/" + p.proyectoId} key={p.proyectoId}>
            <div className="fila-principal">
              <strong>{p.nombre}</strong>
              <p>{p.categoria || ""}</p>
            </div>
            <Badge estado={p.estado} />
          </Link>
        ))
      )}
    </Tarjeta>
  );
}

function TarjetaIndicadores({ ind }) {
  const estados = Object.entries(ind.solicitudesPorEstado || {});
  const total = estados.reduce((a, [, v]) => a + v, 0);
  return (
    <Tarjeta className="col-span-2">
      <div className="tarjeta-encabezado">
        <h3>Resumen institucional</h3>
        <Link to="/indicadores">Ver indicadores</Link>
      </div>
      <div className="kpis">
        <div className="kpi">
          <strong>{ind.tiempoPromedioRespuestaDias}</strong>
          <span>días promedio de respuesta</span>
        </div>
        <div className={"kpi" + (ind.vencidas > 0 ? " alarma" : "")}>
          <strong>{ind.vencidas}</strong>
          <span>solicitudes vencidas</span>
        </div>
        <div className="kpi">
          <strong>{total}</strong>
          <span>solicitudes totales</span>
        </div>
        <div className="kpi">
          <strong>{ind.tasaLecturaAnuncios}%</strong>
          <span>lectura de anuncios</span>
        </div>
      </div>
      {estados.length > 0 && (
        <div className="barras">
          {estados.map(([k, v]) => (
            <div className="barra-fila" key={k}>
              <span>{nombreEstado(k)}</span>
              <div className="barra-pista">
                <div className="barra-relleno" style={{ width: Math.min(100, (v * 100) / Math.max(1, total)) + "%" }}></div>
              </div>
              <b>{v}</b>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

function TarjetaAccesos({ rol }) {
  const botones = [];
  if (["estudiante", "docente", "coordinacion", "direccion", "administracion"].includes(rol)) {
    botones.push(
      <Link className="btn primario" to="/solicitudes/nueva" key="nueva">
        Nueva solicitud
      </Link>
    );
  }
  if (rol === "estudiante") {
    botones.push(
      <Link className="btn" to="/explorar" key="explorar">
        Explorar iniciativas
      </Link>
    );
  }
  botones.push(
    <Link className="btn" to="/perfil" key="acudo">
      ¿A quién acudo?
    </Link>
  );
  return (
    <Tarjeta>
      <div className="tarjeta-encabezado">
        <h3>Accesos rápidos</h3>
      </div>
      <div className="columna-botones" style={{ alignItems: "stretch" }}>
        {botones}
      </div>
    </Tarjeta>
  );
}

function TarjetaInicioEstudiante({ datos }) {
  const [tareas, setTareas] = useState(null);
  useEffect(() => {
    const cargar = async () => {
      try {
        const proyectos = await api("/proyectos");
        const mias = proyectos.filter((p) => (p.equipo || []).some((m) => m.usuarioId === datos.usuarioId));
        const salida = [];
        for (const p of mias.slice(0, 5)) {
          const det = await api("/proyectos/" + p.proyectoId);
          salida.push(...det.tareas.filter((t) => t.estado !== "HECHO").map((t) => ({ ...t, proyecto: p.nombre, proyectoId: p.proyectoId })));
        }
        setTareas(salida.slice(0, 6));
      } catch (e) {
        setTareas([]);
      }
    };
    cargar();
  }, [datos.usuarioId]);
  return (
    <>
      <TarjetaSolicitudes solicitudes={datos.solicitudes} />
      <TarjetaTareas tareas={tareas || []} />
      <TarjetaAnuncios anuncios={datos.anuncios} />
      <TarjetaAccesos rol="estudiante" />
    </>
  );
}

function TarjetaInicioPadre({ datos }) {
  return (
    <>
      <TarjetaSolicitudes solicitudes={datos.solicitudes} />
      <TarjetaAnuncios anuncios={datos.anuncios} />
      <TarjetaAccesos rol="padre" />
    </>
  );
}

function TarjetaInicioDocente({ datos }) {
  return (
    <>
      <TarjetaBandeja solicitudes={datos.bandeja} titulo="Por revisar" />
      <TarjetaProyectos proyectos={datos.proyectos} titulo="Proyectos que asesoras" />
      <TarjetaAccesos rol="docente" />
    </>
  );
}

function TarjetaInicioInstitucional({ datos }) {
  return (
    <>
      {datos.rol !== "promotor" && (
        <TarjetaBandeja solicitudes={datos.bandeja} titulo={datos.rol === "direccion" ? "Aprobaciones pendientes" : "Bandeja"} />
      )}
      <TarjetaIndicadores ind={datos.indicadores} />
      <TarjetaAccesos rol={datos.rol} />
    </>
  );
}

function fechaBonita() {
  const d = new Date();
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
  return dias[d.getDay()] + ", " + d.getDate() + " de " + meses[d.getMonth()] + " de " + d.getFullYear();
}
