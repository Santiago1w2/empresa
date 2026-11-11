App.vistas.calendario = {
  capas: ["CLASE", "EVALUACION", "ACTIVIDAD", "REUNION", "FERIADO", "INSTITUCIONAL"],
  activas: ["CLASE", "EVALUACION", "ACTIVIDAD", "REUNION", "FERIADO", "INSTITUCIONAL"],
  anio: null,
  mes: null,

  async vista(cont) {
    if (this.anio === null) {
      const hoy = new Date();
      this.anio = hoy.getFullYear();
      this.mes = hoy.getMonth();
    }
    cont.innerHTML = cargando();
    const cat = App.catalogo || (await api("/catalogos"));
    const usuario = App.usuario;
    const puedeCrear = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol);
    const [anio, mes] = [this.anio, this.mes];
    const primero = new Date(anio, mes, 1);
    const ultimo = new Date(anio, mes + 1, 0);
    const isoDe = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const desde = isoDe(primero);
    const hasta = isoDe(ultimo);
    const eventos = await api("/eventos?desde=" + desde + "&hasta=" + hasta + "&capas=" + this.activas.join(","));
    const nombreMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"][mes];
    const hoyISOStr = hoyISO();
    const offset = (primero.getDay() + 6) % 7;
    const celdas = [];
    for (let i = 0; i < offset; i++) celdas.push(null);
    for (let d = 1; d <= ultimo.getDate(); d++) celdas.push(new Date(anio, mes, d));
    while (celdas.length % 7 !== 0) celdas.push(null);
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Calendario</h2>' +
      (puedeCrear ? '<button class="btn primario" id="btn-nuevo-evento">Nuevo evento</button>' : "") +
      "</div>" +
      '<div class="calendario-herramientas">' +
      '<button class="btn-icono" id="cal-ant">&larr;</button>' +
      '<strong>' + nombreMes + " " + anio + "</strong>" +
      '<button class="btn-icono" id="cal-sig">&rarr;</button>' +
      '<button class="btn chico" id="cal-hoy">Hoy</button>' +
      '<div class="capas">' +
      this.capas
        .map((c) => '<button class="capa-chip t-' + c + (this.activas.includes(c) ? " activa" : "") + '" data-capa="' + c + '">' + nombreCapa(c) + "</button>")
        .join("") +
      "</div></div>" +
      '<div class="calendario-malla">' +
      DIAS.map((d) => '<div class="cal-encabezado">' + d + "</div>").join("") +
      celdas
        .map((fecha) => {
          if (!fecha) return '<div class="cal-dia otro-mes"></div>';
          const iso = fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0") + "-" + String(fecha.getDate()).padStart(2, "0");
          const delDia = eventos.filter((e) => e.fecha === iso);
          return (
            '<div class="cal-dia' + (iso === hoyISOStr ? " hoy" : "") + '" data-dia="' + iso + '">' +
            "<span>" + fecha.getDate() + "</span>" +
            delDia.slice(0, 4).map((e) => '<div class="cal-evento t-' + esc(e.tipo) + '" title="' + esc(e.titulo) + " " + esc(e.horaInicio || "") + '">' + esc(e.titulo) + "</div>").join("") +
            (delDia.length > 4 ? '<div class="cal-evento mas">+' + (delDia.length - 4) + " más</div>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="leyenda-capas">' + this.capas.map((c) => '<span><i class="punto t-' + c + '"></i>' + nombreCapa(c) + "</span>").join("") + "</div>";
    $("#cal-ant").onclick = () => {
      this.mes -= 1;
      if (this.mes < 0) { this.mes = 11; this.anio -= 1; }
      this.vista(cont);
    };
    $("#cal-sig").onclick = () => {
      this.mes += 1;
      if (this.mes > 11) { this.mes = 0; this.anio += 1; }
      this.vista(cont);
    };
    $("#cal-hoy").onclick = () => {
      const h = new Date();
      this.anio = h.getFullYear();
      this.mes = h.getMonth();
      this.vista(cont);
    };
    $$("[data-capa]", cont).forEach((b) => {
      b.onclick = () => {
        const capa = b.dataset.capa;
        if (this.activas.includes(capa)) this.activas = this.activas.filter((c) => c !== capa);
        else this.activas.push(capa);
        this.vista(cont);
      };
    });
    $$("[data-dia]", cont).forEach((c) => {
      c.onclick = () => this.abrirDia(c.dataset.dia, eventos, cont);
    });
    $("#btn-nuevo-evento") && ($("#btn-nuevo-evento").onclick = () => this.crearEvento(cont, cat));
  },

  async abrirDia(iso, eventos, cont) {
    const delDia = eventos.filter((e) => e.fecha === iso);
    const usuario = App.usuario;
    abrirModal(
      fmtFecha(iso),
      delDia.length === 0
        ? vacio("Sin eventos este día")
        : delDia
            .map(
              (e) =>
                '<div class="evento-dia t-' + esc(e.tipo) + '">' +
                "<div><strong>" + esc(e.titulo) + "</strong>" +
                "<p>" + nombreCapa(e.tipo) +
                (e.horaInicio ? " · " + e.horaInicio + (e.horaFin ? "–" + e.horaFin : "") : "") +
                (e.ambienteId ? " · " + esc(nombreAmbiente(e.ambienteId)) : "") + "</p>" +
                (e.descripcion ? "<p class='nota'>" + esc(e.descripcion) + "</p>" : "") +
                '<p class="nota">Creado por ' + esc(e.creadoPorNombre || "") + "</p></div>" +
                (usuario.rol === "ti" || usuario.rol === "direccion" || e.creadoPor === usuario.usuarioId
                  ? '<button class="btn chico peligro" data-eliminar="' + e.eventoId + '">Eliminar</button>'
                  : "") +
                "</div>"
            )
            .join("")
    );
    $$("[data-eliminar]").forEach((b) => {
      b.onclick = async () => {
        const seguro = await confirmar("¿Eliminar este evento?");
        if (!seguro) return;
        try {
          await api("/eventos/" + b.dataset.eliminar, { metodo: "DELETE" });
          cerrarModal();
          toast("Evento eliminado");
          this.vista(cont);
        } catch (e) {
          toast(e.message, "error");
        }
      };
    });
  },

  async crearEvento(cont, cat) {
    const ambientes = (cat.ambientes || []);
    const niveles = cat.niveles || ["Primaria", "Secundaria"];
    abrirModal(
      "Nuevo evento o reserva",
      '<label class="campo"><span>Título</span><input id="ev-titulo"></label>' +
      '<label class="campo"><span>Descripción</span><input id="ev-desc"></label>' +
      '<div class="fila">' +
      '<label class="campo"><span>Tipo</span><select id="ev-tipo">' +
      this.capas.map((c) => '<option value="' + c + '"' + (c === "ACTIVIDAD" ? " selected" : "") + ">" + nombreCapa(c) + "</option>").join("") +
      "</select></label>" +
      '<label class="campo"><span>Fecha</span><input type="date" id="ev-fecha" value="' + hoyISO() + '"></label>' +
      "</div>" +
      '<div class="fila">' +
      '<label class="campo"><span>De</span><input type="time" id="ev-hi"></label>' +
      '<label class="campo"><span>A</span><input type="time" id="ev-hf"></label>' +
      '<label class="campo"><span>Ambiente</span><select id="ev-ambiente"><option value="">Ninguno</option>' +
      ambientes.map((a) => '<option value="' + esc(a.ambienteId) + '">' + esc(a.nombre) + "</option>").join("") +
      "</select></label>" +
      "</div>" +
      '<div class="fila">' +
      '<label class="campo"><span>Nivel (opcional)</span><select id="ev-nivel"><option value="">Todos</option>' +
      niveles.map((n) => "<option>" + esc(n) + "</option>").join("") +
      "</select></label>" +
      '<label class="campo"><span>Grado (opcional)</span><input id="ev-grado" placeholder="5°"></label>' +
      '<label class="campo"><span>Sección (opcional)</span><input id="ev-seccion" placeholder="A"></label>' +
      "</div>" +
      '<p class="nota">Al guardar se avisa si hay choque de ambiente o con evaluaciones.</p>',
      '<button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primario" id="ev-guardar">Guardar</button>'
    );
    $("#ev-guardar").onclick = async () => {
      const titulo = $("#ev-titulo").value.trim();
      const fecha = $("#ev-fecha").value;
      if (!titulo || !fecha) {
        toast("Título y fecha son obligatorios", "error");
        return;
      }
      try {
        const datos = await api("/eventos", {
          metodo: "POST",
          cuerpo: {
            titulo,
            descripcion: $("#ev-desc").value,
            tipo: $("#ev-tipo").value,
            fecha,
            horaInicio: $("#ev-hi").value || "",
            horaFin: $("#ev-hf").value || "",
            ambienteId: $("#ev-ambiente").value || "",
            nivel: $("#ev-nivel").value || "",
            grado: $("#ev-grado").value.trim() || "",
            seccion: $("#ev-seccion").value.trim() || "",
          },
        });
        cerrarModal();
        toast("Evento creado");
        if (datos.conflictos && datos.conflictos.length) {
          toast("Choques detectados: " + datos.conflictos.join(" | "), "error");
        }
        this.vista(cont);
      } catch (e) {
        toast(e.message, "error");
      }
    };
  },
};

function nombreCapa(tipo) {
  return {
    CLASE: "Clases",
    EVALUACION: "Evaluaciones",
    ACTIVIDAD: "Actividades",
    REUNION: "Reuniones",
    FERIADO: "Feriados",
    INSTITUCIONAL: "Institucional",
  }[tipo] || tipo;
}

function nombreAmbiente(ambienteId) {
  const ambientes = (App.catalogo && App.catalogo.ambientes) || [];
  const a = ambientes.find((x) => x.ambienteId === ambienteId);
  return a ? a.nombre : "Ambiente";
}
