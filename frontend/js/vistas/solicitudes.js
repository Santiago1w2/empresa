App.vistas.solicitudes = {
  filtros: { estado: "", bandeja: false },

  async lista(cont, bandeja) {
    const esBandeja = bandeja === true;
    cont.innerHTML = cargando();
    const usuario = App.usuario;
    let datos;
    if (esBandeja) {
      datos = await api("/solicitudes?bandeja=1");
    } else {
      datos = await api("/solicitudes");
    }
    const puedeCrear = ["estudiante", "docente", "coordinacion", "direccion", "administracion"].includes(usuario.rol);
    const estados = ["", "EN_REVISION", "OBSERVADA", "APROBADA", "APROBADA_CONDICIONES", "EN_AUTORIZACION_PADRES", "RECHAZADA", "EN_EJECUCION", "FINALIZADA", "ARCHIVADA"];
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>' + (esBandeja ? "Bandeja de revisión" : "Solicitudes") + "</h2>" +
      (puedeCrear ? '<a class="btn primario" href="#/solicitudes/nueva">Nueva solicitud</a>' : "") +
      "</div>" +
      '<div class="pastillas">' +
      estados.map((e) => '<button class="pastilla" data-estado="' + e + '">' + (e ? nombreEstado(e) : "Todas") + "</button>").join("") +
      "</div>" +
      '<div id="lista-solicitudes"></div>';
    const pintar = () => {
      const filtro = cont.dataset.filtroEstado || "";
      const items = filtro ? datos.filter((s) => s.estado === filtro) : datos;
      $("#lista-solicitudes").innerHTML =
        items.length === 0
          ? vacio(esBandeja ? "No tienes solicitudes pendientes de revisión" : "No hay solicitudes para mostrar")
          : '<div class="tarjeta lista">' +
            items
              .map(
                (s) =>
                  '<a class="fila-lista" href="#/solicitudes/' + s.solicitudId + '">' +
                  semaforo(s.estado) +
                  "<div class=\"fila-principal\"><strong>" + esc(s.titulo) + "</strong>" +
                  "<p>" + esc(s.tipoNombre || "") + " · " + esc(s.solicitanteNombre || "") +
                  (s.fecha ? " · " + fmtFecha(s.fecha) : "") + "</p>" +
                  (s.estado === "EN_REVISION" && s.revisorActualRol ? '<p class="nota">' + esc(nombreRol(s.revisorActualRol)) + " revisa ahora</p>" : "") +
                  (s.estado === "OBSERVADA" ? '<p class="nota alerta-texto">Observada: ' + esc((s.observacion || "").slice(0, 90)) + "</p>" : "") +
                  "</div>" + badge(s.estado) + "</a>"
              )
              .join("") +
            "</div>";
    };
    $$(".pastilla", cont).forEach((b) => {
      b.onclick = () => {
        $$(".pastilla", cont).forEach((x) => x.classList.remove("activa"));
        b.classList.add("activa");
        cont.dataset.filtroEstado = b.dataset.estado;
        pintar();
      };
    });
    $$(".pastilla", cont)[0]?.classList.add("activa");
    cont.dataset.filtroEstado = "";
    pintar();
  },

  async nueva(cont) {
    const cat = App.catalogo || (await api("/catalogos"));
    const docentes = (await api("/usuarios")).filter((u) => u.rol === "docente");
    const usuario = App.usuario;
    const pasos = ["Tipo", "Datos", "Fecha y lugar", "Equipo", "Adjuntos", "Revisión"];
    const estado = {
      tipo: "",
      titulo: "", objetivo: "", descripcion: "",
      fecha: "", horaInicio: "", horaFin: "", lugar: "", ambienteId: "",
      participantes: [], recursos: "", presupuesto: "", riesgos: "",
      docenteAsesorId: "", adjuntos: [], checklist: [], tipoVisto: "",
    };
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Nueva solicitud</h2><a class="btn" href="#/solicitudes">Cancelar</a></div>' +
      '<div class="tarjeta asistente">' +
      '<div class="asistente-pasos">' +
      pasos.map((p, i) => '<span class="paso-indicador" data-paso="' + i + '">' + (i + 1) + ". " + esc(p) + "</span>").join("") +
      "</div>" +
      '<div id="asistente-cuerpo"></div>' +
      "</div>";
    let actual = 0;
    const self = this;
    const retroceder = () => { actual = Math.max(0, actual - 1); pintar(); };
    const avanzar = () => { actual = Math.min(pasos.length - 1, actual + 1); pintar(); };
    const pintar = () => {
      $$(".paso-indicador", cont).forEach((el, i) => el.classList.toggle("activo", i === actual));
      $("#asistente-cuerpo").innerHTML =
        this.pantallaPaso(actual, estado, cat, docentes) +
        '<div class="asistente-nav">' +
        (actual > 0 ? '<button class="btn" id="as-ant">Anterior</button>' : "<span></span>") +
        (actual < pasos.length - 1 ? '<button class="btn primario" id="as-sig">Siguiente</button>' : "") +
        "</div>";
      this.wirePaso(
        actual, estado, cat, docentes, retroceder, avanzar,
        () => self.crearSolicitud(estado, false),
        () => self.crearSolicitud(estado, true)
      );
    };
    pintar();
  },

  pantallaPaso(n, estado, cat, docentes) {
    const tipos = Object.entries(cat.tiposSolicitud || {});
    const ambientes = cat.ambientes || [];
    const sla = cat.slaPorRol || {};
    if (n === 0) {
      const def = cat.tiposSolicitud && cat.tiposSolicitud[estado.tipo];
      return (
        '<label class="campo"><span>Tipo de solicitud</span><select id="as-tipo">' +
        '<option value="">Selecciona un tipo…</option>' +
        tipos.map(([k, v]) => '<option value="' + k + '"' + (estado.tipo === k ? " selected" : "") + ">" + esc(v.nombre) + "</option>").join("") +
        "</select></label>" +
        (def
          ? '<div class="ruta-preview"><h4>Ruta de aprobación</h4><p>' +
            def.ruta.map((r) => esc(nombreRol(r)) + " (" + (sla[r] || 2) + " días hábiles)").join(" → ") +
            "</p>" +
            (def.requierePadres ? '<p class="alerta-texto">Requiere autorización de los padres al aprobarse</p>' : "") +
            "<h4>Checklist de requisitos</h4><ul>" +
            def.checklist.map((c) => "<li>" + esc(c) + "</li>").join("") + "</ul></div>"
          : "")
      );
    }
    if (n === 1) {
      return (
        '<label class="campo"><span>Título</span><input id="as-titulo" value="' + esc(estado.titulo) + '" placeholder="MUN Santa Anita 2026"></label>' +
        '<label class="campo"><span>Objetivo</span><textarea id="as-objetivo" rows="2">' + esc(estado.objetivo) + "</textarea></label>" +
        '<label class="campo"><span>Descripción</span><textarea id="as-descripcion" rows="3">' + esc(estado.descripcion) + "</textarea></label>" +
        '<label class="campo"><span>Docente asesor</span><select id="as-docente"><option value="">Sin asesor asignado</option>' +
        docentes.map((d) => '<option value="' + d.usuarioId + '"' + (estado.docenteAsesorId === d.usuarioId ? " selected" : "") + ">" + esc(d.nombre) + "</option>").join("") +
        "</select></label>" +
        '<label class="campo"><span>Checklist</span><div>' +
        estado.checklist.map((c, i) => '<label class="check"><input type="checkbox" data-chk="' + i + '"' + (c.hecho ? " checked" : "") + "> " + esc(c.texto) + "</label>").join("") +
        "</div></label>"
      );
    }
    if (n === 2) {
      return (
        '<div class="fila">' +
        '<label class="campo"><span>Fecha</span><input type="date" id="as-fecha" value="' + esc(estado.fecha) + '"></label>' +
        '<label class="campo"><span>De</span><input type="time" id="as-hi" value="' + esc(estado.horaInicio) + '"></label>' +
        '<label class="campo"><span>A</span><input type="time" id="as-hf" value="' + esc(estado.horaFin) + '"></label>' +
        "</div>" +
        '<div class="fila">' +
        '<label class="campo"><span>Lugar</span><input id="as-lugar" value="' + esc(estado.lugar) + '" placeholder="Auditorio"></label>' +
        '<label class="campo"><span>Ambiente</span><select id="as-ambiente"><option value="">Ninguno</option>' +
        ambientes.map((a) => '<option value="' + esc(a.ambienteId) + '"' + (estado.ambienteId === a.ambienteId ? " selected" : "") + ">" + esc(a.nombre) + "</option>").join("") +
        "</select></label>" +
        "</div>"
      );
    }
    if (n === 3) {
      const estudiantes = window._estudiantesCache || [];
      return (
        '<label class="campo"><span>Participantes del equipo</span>' +
        '<select id="as-participante"><option value="">Agregar estudiante…</option>' +
        estudiantes.map((e) => '<option value="' + e.usuarioId + '">' + esc(e.nombre) + (e.grado ? " (" + esc(e.grado) + esc(e.seccion || "") + ")" : "") + "</option>").join("") +
        "</select></label>" +
        '<div id="as-equipo" class="etiquetas">' +
        estado.participantes.map((p) => '<span class="etiqueta">' + esc(p.nombre) + " <button data-quitar=\"" + esc(p.usuarioId) + '\">&times;</button></span>').join("") +
        "</div>" +
        '<label class="campo"><span>Recursos</span><input id="as-recursos" value="' + esc(estado.recursos) + '" placeholder="Micrófonos, aulas…"></label>' +
        '<div class="fila">' +
        '<label class="campo"><span>Presupuesto</span><input id="as-presupuesto" value="' + esc(estado.presupuesto) + '" placeholder="S/ 300"></label>' +
        '<label class="campo"><span>Riesgos</span><input id="as-riesgos" value="' + esc(estado.riesgos) + '"></label>' +
        "</div>"
      );
    }
    if (n === 4) {
      return (
        '<label class="campo"><span>Adjuntos</span><input type="file" id="as-archivo" multiple></label>' +
        '<div id="as-adjuntos" class="etiquetas">' +
        estado.adjuntos.map((a, i) => '<span class="etiqueta">' + esc(a.nombre) + "</span>").join("") +
        "</div>" +
        '<p class="nota">Los archivos se suben a un almacenamiento privado y solo son accesibles con enlaces firmados.</p>'
      );
    }
    const def = (cat.tiposSolicitud || {})[estado.tipo] || {};
    return (
      '<div class="ruta-preview"><h4>Resumen</h4>' +
      "<p><strong>" + esc(estado.titulo || "(sin título)") + "</strong><br>" + esc(estado.objetivo || "") + "</p>" +
      "<p>" + (estado.fecha ? fmtFecha(estado.fecha) + (estado.horaInicio ? " " + estado.horaInicio + "–" + estado.horaFin : "") : "Sin fecha") +
      (estado.lugar ? " · " + esc(estado.lugar) : "") + "</p>" +
      "<p>Participantes: " + (estado.participantes.length || 0) + " · Adjuntos: " + estado.adjuntos.length + "</p>" +
      "<p>Ruta: " + (def.ruta || []).map((r) => esc(nombreRol(r))).join(" → ") + (def.requierePadres ? " → Padres" : "") + "</p></div>" +
      '<div class="asistente-nav"><span></span><span>' +
      '<button class="btn" id="as-borrador">Guardar borrador</button> ' +
      '<button class="btn primario" id="as-enviar">Enviar a revisión</button></span></div>'
    );
  },

  wirePaso(n, estado, cat, docentes, retroceder, avanzar, guardarBorrador, enviar) {
    const leer = () => {
      const g = (id) => $(id)?.value ?? undefined;
      if (n === 0) {
        estado.tipo = g("#as-tipo");
        if (estado.tipo && estado.tipo !== estado.tipoVisto) {
          const def = (cat.tiposSolicitud || {})[estado.tipo] || {};
          estado.checklist = (def.checklist || []).map((c) => ({ texto: c, hecho: false }));
          estado.tipoVisto = estado.tipo;
          estado.requierePadres = !!def.requierePadres;
        }
      } else if (n === 1) {
        estado.titulo = g("#as-titulo");
        estado.objetivo = g("#as-objetivo");
        estado.descripcion = g("#as-descripcion");
        estado.docenteAsesorId = g("#as-docente");
        $$('[data-chk]').forEach((chk) => { estado.checklist[+chk.dataset.chk].hecho = chk.checked; });
      } else if (n === 2) {
        estado.fecha = g("#as-fecha");
        estado.horaInicio = g("#as-hi");
        estado.horaFin = g("#as-hf");
        estado.lugar = g("#as-lugar");
        estado.ambienteId = g("#as-ambiente");
      } else if (n === 3) {
        estado.recursos = g("#as-recursos");
        estado.presupuesto = g("#as-presupuesto");
        estado.riesgos = g("#as-riesgos");
      }
    };
    $("#as-sig") && ($("#as-sig").onclick = () => { leer(); avanzar(); });
    $("#as-ant") && ($("#as-ant").onclick = () => { leer(); retroceder(); });
    if (n === 3) {
      $("#as-participante") &&
        ($("#as-participante").onchange = (e) => {
          leer();
          const id = e.target.value;
          if (!id) return;
          if (!estado.participantes.some((p) => p.usuarioId === id)) {
            const u = (window._estudiantesCache || []).find((x) => x.usuarioId === id);
            estado.participantes.push({ usuarioId: id, nombre: u ? u.nombre : id });
          }
          e.target.value = "";
          $("#as-equipo").innerHTML = estado.participantes
            .map((p) => '<span class="etiqueta">' + esc(p.nombre) + ' <button data-quitar="' + esc(p.usuarioId) + '">&times;</button></span>')
            .join("");
          wireQuitar();
        });
      const wireQuitar = () => {
        $$("#as-equipo [data-quitar]").forEach((b) => {
          b.onclick = () => {
            estado.participantes = estado.participantes.filter((p) => p.usuarioId !== b.dataset.quitar);
            $("#as-equipo").innerHTML = estado.participantes
              .map((p) => '<span class="etiqueta">' + esc(p.nombre) + ' <button data-quitar="' + esc(p.usuarioId) + '">&times;</button></span>')
              .join("");
            wireQuitar();
          };
        });
      };
      wireQuitar();
      if (!window._estudiantesCache) {
        api("/usuarios").then((usuarios) => {
          window._estudiantesCache = usuarios.filter((u) => u.rol === "estudiante");
          const sel = $("#as-participante");
          if (sel) {
            sel.innerHTML =
              '<option value="">Agregar estudiante…</option>' +
              window._estudiantesCache.map((e) => '<option value="' + e.usuarioId + '">' + esc(e.nombre) + "</option>").join("");
          }
        });
      }
    }
    if (n === 4) {
      $("#as-archivo") &&
        ($("#as-archivo").onchange = async (e) => {
          const archivos = Array.from(e.target.files || []);
          for (const archivo of archivos) {
            try {
              toast("Subiendo " + archivo.name + "…");
              const key = await subirArchivo(archivo);
              estado.adjuntos.push({ nombre: archivo.name, key });
              $("#as-adjuntos").innerHTML = estado.adjuntos.map((a) => '<span class="etiqueta">' + esc(a.nombre) + "</span>").join("");
            } catch (err) {
              toast(err.message, "error");
            }
          }
        });
    }
    if (n === 5) {
      $("#as-borrador") && ($("#as-borrador").onclick = guardarBorrador);
      $("#as-enviar") && ($("#as-enviar").onclick = enviar);
    }
  },

  async crearSolicitud(estado, enviarAhora) {
    if (!estado.tipo) { toast("Selecciona el tipo de solicitud", "error"); return; }
    if (!estado.titulo || !estado.titulo.trim()) { toast("El título es obligatorio", "error"); return; }
    try {
      const solicitud = await api("/solicitudes", { metodo: "POST", cuerpo: estado });
      if (enviarAhora) {
        await api("/solicitudes/" + solicitud.solicitudId + "/accion", { metodo: "POST", cuerpo: { accion: "enviar" } });
        toast("Solicitud enviada a revisión");
      } else {
        toast("Borrador guardado");
      }
      location.hash = "#/solicitudes/" + solicitud.solicitudId;
    } catch (e) {
      toast(e.message, "error");
    }
  },

  async detalle(cont, id) {
    cont.innerHTML = cargando();
    if (!window._docentesCache) {
      try {
        window._docentesCache = (await api("/usuarios")).filter((u) => u.rol === "docente");
      } catch (e) {
        window._docentesCache = [];
      }
    }
    const datos = await api("/solicitudes/" + id);
    const s = datos.solicitud;
    const usuario = App.usuario;
    const acciones = datos.acciones || [];
    const puedeInterno = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol) && s.solicitanteId !== usuario.usuarioId;
    cont.innerHTML =
      '<div class="encabezado-vista"><div><h2>' + esc(s.titulo) + '</h2><p>' + esc(s.tipoNombre || "") + " · " + esc(s.solicitanteNombre || "") + (s.fecha ? " · " + fmtFecha(s.fecha) : "") + "</p></div>" + badge(s.estado) + "</div>" +
      '<div class="rejilla-detalle">' +
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Línea de tiempo</h3><span class="nota">' +
      (s.estado === "EN_REVISION" && s.revisorActualRol ? "Con " + esc(nombreRol(s.revisorActualRol)) + (s.revisorActualNombre ? " (" + esc(s.revisorActualNombre) + ")" : "") + " · vence " + fmtFecha((datos.pasos.find((p) => p.estado === "EN_REVISION") || {}).plazoVenceEn) : "") +
      "</span></div>" +
      '<div class="timeline">' +
      this.htmlPasoEnviado(s) +
      datos.pasos.map((p) => this.htmlPaso(p)).join("") +
      (["APROBADA", "APROBADA_CONDICIONES", "EN_EJECUCION", "FINALIZADA", "ARCHIVADA"].includes(s.estado) ? this.htmlPasoFinal(s) : "") +
      (datos.autorizaciones.length ? this.htmlAutorizaciones(datos.autorizaciones) : "") +
      "</div></section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Detalle</h3></div><dl class="datos-ficha">' +
      "<div><dt>Objetivo</dt><dd>" + esc(s.objetivo || "—") + "</dd></div>" +
      "<div><dt>Descripción</dt><dd>" + esc(s.descripcion || "—") + "</dd></div>" +
      "<div><dt>Fecha</dt><dd>" + (s.fecha ? fmtFecha(s.fecha) + (s.horaInicio ? " " + s.horaInicio + "–" + s.horaFin : "") : "—") + "</dd></div>" +
      "<div><dt>Lugar</dt><dd>" + esc(s.lugar || "—") + "</dd></div>" +
      "<div><dt>Recursos</dt><dd>" + esc(s.recursos || "—") + "</dd></div>" +
      "<div><dt>Presupuesto</dt><dd>" + esc(s.presupuesto || "—") + "</dd></div>" +
      "<div><dt>Riesgos</dt><dd>" + esc(s.riesgos || "—") + "</dd></div>" +
      "<div><dt>Docente asesor</dt><dd>" + esc(this.nombreDocente(s.docenteAsesorId)) + "</dd></div>" +
      "<div><dt>Participantes</dt><dd>" + ((s.participantes || []).map((p) => esc(p.nombre || p)).join(", ") || "—") + "</dd></div>" +
      "</dl>" +
      ((s.checklist || []).length ? '<div class="tarjeta-encabezado"><h3>Checklist</h3></div><ul class="checklist">' +
        s.checklist.map((c) => '<li class="' + (c.hecho ? "ok" : "") + '">' + (c.hecho ? "[X] " : "[ ] ") + esc(c.texto) + "</li>").join("") + "</ul>" : "") +
      ((s.adjuntos || []).length ? '<div class="tarjeta-encabezado"><h3>Adjuntos</h3></div>' +
        s.adjuntos.map((a, i) => '<button class="btn chico" data-adj="' + i + '">Descargar ' + esc(a.nombre) + "</button>").join("") : "") +
      (s.condiciones ? '<p class="nota alerta-texto">Condiciones: ' + esc(s.condiciones) + "</p>" : "") +
      (s.motivoRechazo ? '<p class="nota alerta-texto">Motivo del rechazo: ' + esc(s.motivoRechazo) + "</p>" : "") +
      (s.informeFinal ? '<p class="nota">Informe final: ' + esc(s.informeFinal) + "</p>" : "") +
      (datos.proyecto ? '<a class="btn" href="#/proyectos/' + datos.proyecto.proyectoId + '">Ver proyecto vinculado</a>' : "") +
      '<a class="btn" href="#/mensajes?hilo=' + encodeURIComponent("SOL#" + id) + '">Consultas sobre esta solicitud</a>' +
      "</section>" +
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Comentarios</h3></div>' +
      '<div id="comentarios">' +
      (datos.comentarios.length === 0
        ? vacio("Sin comentarios aún")
        : datos.comentarios.map((c) => this.htmlComentario(c)).join("")) +
      "</div>" +
      '<form id="form-comentario"><label class="campo"><span>Nuevo comentario</span><textarea id="com-texto" rows="2" required></textarea></label>' +
      (puedeInterno ? '<label class="check"><input type="checkbox" id="com-interno"> Interno (no visible para el solicitante)</label>' : "") +
      '<button class="btn primario">Comentar</button></form></section>' +
      "</div>" +
      (acciones.length ? '<div class="acciones-fijas tarjeta">' + acciones.map((a) => '<button class="btn acc-' + a + '" data-accion="' + a + '">' + this.textoAccion(a) + "</button>").join("") + "</div>" : "");
    this.wireDetalle(cont, datos);
  },

  nombreDocente(id) {
    const cache = window._docentesCache || [];
    const d = cache.find((x) => x.usuarioId === id);
    if (d) return d.nombre;
    return id ? "Docente asignado" : "—";
  },

  htmlPasoEnviado(s) {
    if (!s.enviadoEn) return "";
    return '<div class="paso-tl"><span class="dot ok"></span><div><strong>Enviada</strong><p>' + fmtFechaHora(s.enviadoEn) + "</p></div></div>";
  },

  htmlPaso(p) {
    const clase = { EN_REVISION: "actual", APROBADO: "ok", OBSERVADO: "alerta", RECHAZADO: "mal" }[p.estado] || "";
    const icono = { EN_REVISION: "·", APROBADO: "OK", OBSERVADO: "!", RECHAZADO: "X" }[p.estado] || "·";
    return (
      '<div class="paso-tl ' + clase + '"><span class="dot">' + icono + "</span><div>" +
      "<strong>" + esc(nombreRol(p.rol)) + (p.revisorNombre ? " · " + esc(p.revisorNombre) : "") + "</strong>" +
      "<p>" + esc(nombreEstado(p.estado)) +
      (p.iniciadoEn ? " · desde " + fmtFechaHora(p.iniciadoEn) : "") +
      (p.plazoVenceEn && p.estado === "EN_REVISION" ? " · vence " + fmtFecha(p.plazoVenceEn) : "") +
      (p.escalado ? " · escalado por vencimiento" : "") + "</p>" +
      (p.comentario ? '<p class="nota">' + esc(p.comentario) + "</p>" : "") +
      (p.condiciones ? '<p class="nota">Condiciones: ' + esc(p.condiciones) + "</p>" : "") +
      "</div></div>"
    );
  },

  htmlPasoFinal(s) {
    const mapa = {
      APROBADA: ["ok", "Aprobada"],
      APROBADA_CONDICIONES: ["ok", "Aprobada con condiciones"],
      EN_EJECUCION: ["ok", "En ejecución"],
      FINALIZADA: ["ok", "Finalizada"],
      ARCHIVADA: ["ok", "Archivada"],
    };
    const [clase, texto] = mapa[s.estado] || ["ok", s.estado];
    return '<div class="paso-tl"><span class="dot ' + clase + '">OK</span><div><strong>' + esc(texto) + "</strong><p>Decisión definitiva registrada</p></div></div>";
  },

  htmlAutorizaciones(auts) {
    return (
      '<div class="paso-tl"><span class="dot">F</span><div><strong>Autorización de padres</strong>' +
      auts.map((a) => "<p>" + esc(a.apoderadoNombre || "Apoderado") + " · " + esc(nombreEstado(a.estado)) + (a.firma ? " · firmado por " + esc(a.firma) : "") + "</p>").join("") +
      "</div></div>"
    );
  },

  htmlComentario(c) {
    return (
      '<div class="comentario' + (c.interno ? " interno" : "") + '"><div class="comentario-cab"><strong>' + esc(c.autorNombre) + "</strong>" +
      (c.interno ? '<span class="badge b-interno">Interno</span>' : "") +
      "<time>" + fmtFechaHora(c.creadoEn__id) + "</time></div><p>" + esc(c.texto) + "</p></div>"
    );
  },

  textoAccion(a) {
    return {
      enviar: "Enviar a revisión",
      responder_observacion: "Responder observación",
      aprobar: "Aprobar",
      aprobar_condiciones: "Aprobar con condiciones",
      observar: "Observar (pedir ajustes)",
      rechazar: "Rechazar",
      delegar: "Delegar revisión",
      ejecutar: "Pasar a ejecución",
      finalizar: "Finalizar",
      archivar: "Archivar",
    }[a] || a;
  },

  async wireDetalle(cont, datos) {
    const s = datos.solicitud;
    const id = s.solicitudId;
    $$('[data-adj]', cont).forEach((b) => {
      b.onclick = async () => {
        try {
          const url = await urlDescarga(s.adjuntos[+b.dataset.adj].key);
          window.open(url, "_blank");
        } catch (e) {
          toast(e.message, "error");
        }
      };
    });
    $("#form-comentario").onsubmit = async (e) => {
      e.preventDefault();
      const texto = $("#com-texto").value.trim();
      if (!texto) return;
      try {
        await api("/solicitudes/" + id + "/comentarios", {
          metodo: "POST",
          cuerpo: { texto, interno: $("#com-interno") ? $("#com-interno").checked : false },
        });
        this.detalle(cont, id);
      } catch (err) {
        toast(err.message, "error");
      }
    };
    $$('[data-accion]', cont).forEach((b) => {
      b.onclick = () => this.ejecutarAccion(cont, id, b.dataset.accion, s);
    });
  },

  async ejecutarAccion(cont, id, accion, s) {
    try {
      if (accion === "enviar") {
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion } });
        toast("Solicitud enviada");
        this.detalle(cont, id);
      } else if (accion === "responder_observacion") {
        const respuesta = await promptTexto("Responder observación", "Explica los ajustes realizados");
        if (respuesta === null) return;
        await api("/solicitudes/" + id + "/accion", {
          metodo: "POST",
          cuerpo: { accion, comentario: respuesta, titulo: s.titulo },
        });
        toast("Observación respondida");
        this.detalle(cont, id);
      } else if (accion === "aprobar") {
        const comentario = await promptTexto("Aprobar", "Comentario (opcional)");
        if (comentario === null) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario } });
        toast("Paso aprobado");
        this.detalle(cont, id);
      } else if (accion === "aprobar_condiciones") {
        const condiciones = await promptTexto("Aprobar con condiciones", "Condiciones obligatorias");
        if (condiciones === null || !condiciones.trim()) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, condiciones } });
        toast("Aprobada con condiciones");
        this.detalle(cont, id);
      } else if (accion === "observar") {
        const motivo = await promptTexto("Observar solicitud", "Motivo de la observación (visible para el solicitante)");
        if (motivo === null || !motivo.trim()) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario: motivo } });
        toast("Solicitud observada");
        this.detalle(cont, id);
      } else if (accion === "rechazar") {
        const motivo = await promptTexto("Rechazar solicitud", "Motivo del rechazo (obligatorio)");
        if (motivo === null || !motivo.trim()) return;
        const seguro = await confirmar("¿Seguro que deseas rechazar la solicitud?");
        if (!seguro) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario: motivo } });
        toast("Solicitud rechazada");
        this.detalle(cont, id);
      } else if (accion === "delegar") {
        const usuarios = (await api("/usuarios")).filter((u) => u.rol === App.usuario.rol && u.usuarioId !== App.usuario.usuarioId);
        if (usuarios.length === 0) {
          toast("No hay otros usuarios de tu rol para delegar", "error");
          return;
        }
        abrirModal(
          "Delegar revisión",
          '<label class="campo"><span>Delegar a</span><select id="dlg-usuario">' +
          usuarios.map((u) => '<option value="' + u.usuarioId + '">' + esc(u.nombre) + "</option>").join("") +
          "</select></label>",
          '<button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primario" id="dlg-ok">Delegar</button>'
        );
        $("#dlg-ok").onclick = async () => {
          try {
            await api("/solicitudes/" + id + "/accion", {
              metodo: "POST",
              cuerpo: { accion: "delegar", usuarioId: $("#dlg-usuario").value },
            });
            cerrarModal();
            toast("Revisión delegada");
            this.detalle(cont, id);
          } catch (e) {
            toast(e.message, "error");
          }
        };
      } else if (accion === "ejecutar") {
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion } });
        toast("Solicitud en ejecución, se creó el proyecto");
        this.detalle(cont, id);
      } else if (accion === "finalizar") {
        const informe = await promptTexto("Finalizar actividad", "Informe breve (quedará en el legado del proyecto)");
        if (informe === null) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, informe } });
        toast("Solicitud finalizada");
        this.detalle(cont, id);
      } else if (accion === "archivar") {
        const seguro = await confirmar("¿Archivar esta solicitud?");
        if (!seguro) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion } });
        toast("Solicitud archivada");
        this.detalle(cont, id);
      }
    } catch (e) {
      toast(e.message, "error");
    }
  },
};
