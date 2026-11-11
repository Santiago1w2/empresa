App.vistas.proyectos = {
  async lista(cont) {
    cont.innerHTML = cargando();
    const proyectos = await api("/proyectos");
    const rol = App.usuario.rol;
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>' + (rol === "docente" ? "Mis proyectos" : "Proyectos") + "</h2></div>" +
      (proyectos.length === 0
        ? vacio("Aún no hay proyectos. Las solicitudes aprobadas se convierten en proyectos al ejecutarse.")
        : '<div class="rejilla-proyectos">' +
          proyectos.map((p) => this.tarjetaProyecto(p)).join("") +
          "</div>");
  },

  tarjetaProyecto(p) {
    const equipo = p.equipo || [];
    const hitos = p.hitos || [];
    const cumplidos = hitos.filter((h) => h.cumplido).length;
    const avance = hitos.length ? Math.round((cumplidos * 100) / hitos.length) : 0;
    return (
      '<a class="tarjeta proyecto-tarjeta" href="#/proyectos/' + p.proyectoId + '">' +
      '<div class="tarjeta-encabezado"><h3>' + esc(p.nombre) + "</h3>" + badge(p.estado) + "</div>" +
      "<p>" + esc(p.descripcion || p.objetivo || "Sin descripción") + "</p>" +
      '<p class="nota">' + esc(nombreRol(p.categoria) === p.categoria ? p.categoria : p.categoria || "") +
      " · Responsable: " + esc(p.responsableNombre || "—") + " · Equipo: " + equipo.length + "</p>" +
      (hitos.length ? '<div class="barra-pista"><div class="barra-relleno" style="width:' + avance + '%"></div></div><p class="nota">Avance ' + avance + "% (" + cumplidos + "/" + hitos.length + " hitos)</p>" : "") +
      (p.alertaInactividad ? '<p class="nota alerta-texto">Sin movimientos por más de 30 días</p>' : "") +
      "</a>"
    );
  },

  async explorar(cont) {
    cont.innerHTML = cargando();
    const [proyectos, usuario] = [await api("/proyectos?explorar=1"), App.usuario];
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Explorar iniciativas</h2><p>Proyectos activos que aceptan nuevos miembros</p></div>' +
      (proyectos.length === 0
        ? vacio("No hay iniciativas abiertas por ahora. ¡Puedes proponer la tuya!")
        : '<div class="rejilla-proyectos">' +
          proyectos
            .map((p) => {
              const miembro = (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId);
              return (
                '<div class="tarjeta proyecto-tarjeta">' +
                '<div class="tarjeta-encabezado"><h3><a href="#/proyectos/' + p.proyectoId + '">' + esc(p.nombre) + "</a></h3>" + badge(p.estado) + "</div>" +
                "<p>" + esc(p.descripcion || p.objetivo || "") + "</p>" +
                '<p class="nota">Lidera: ' + esc(p.responsableNombre || "—") + (p.docenteAsesorId ? " · Con asesoría docente" : "") + "</p>" +
                (usuario.rol === "estudiante"
                  ? miembro
                    ? '<span class="btn chico" disabled>Ya eres miembro</span>'
                    : '<button class="btn primario chico" data-unirse="' + p.proyectoId + '">Unirme</button>'
                  : "") +
                "</div>"
              );
            })
            .join("") +
          "</div>");
    $$("[data-unirse]", cont).forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        b.textContent = "Uniéndote…";
        try {
          await api("/proyectos/" + b.dataset.unirse + "/unirse", { metodo: "POST", cuerpo: {} });
          toast("¡Te uniste al proyecto!");
          this.explorar(cont);
        } catch (e) {
          b.disabled = false;
          b.textContent = "Unirme";
          toast(e.message, "error");
        }
      };
    });
  },

  async detalle(cont, id) {
    cont.innerHTML = cargando();
    const datos = await api("/proyectos/" + id);
    const p = datos.proyecto;
    const puedeEditar = datos.puedeEditar;
    const usuario = App.usuario;
    const esMiembro = (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId);
    const puedeUnirse = usuario.rol === "estudiante" && p.abiertoUnirse && p.estado === "ACTIVA" && !esMiembro;
    const hitos = p.hitos || [];
    const cumplidos = hitos.filter((h) => h.cumplido).length;
    const avance = hitos.length ? Math.round((cumplidos * 100) / hitos.length) : 0;
    cont.innerHTML =
      '<div class="encabezado-vista"><div><h2>' + esc(p.nombre) + "</h2><p>" +
      esc(p.categoria || "") + " · Responsable: " + esc(p.responsableNombre || "—") +
      (p.solicitudId ? ' · <a href="#/solicitudes/' + p.solicitudId + '">solicitud de origen</a>' : "") +
      "</p></div>" +
      (puedeEditar
        ? '<select id="proy-estado" class="selector-estado">' +
          ["ACTIVA", "EN_PAUSA", "SIN_RESPONSABLE", "FINALIZADA"].map((e) => '<option value="' + e + '"' + (p.estado === e ? " selected" : "") + ">" + nombreEstado(e) + "</option>").join("") +
          "</select>"
        : badge(p.estado)) +
      "</div>" +
      '<div class="rejilla-detalle">' +
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Tablero de tareas</h3>' +
      (puedeEditar ? '<button class="btn chico" id="btn-tarea">Nueva tarea</button>' : "") +
      "</div>" +
      '<div class="kanban">' +
      ["POR_HACER", "EN_CURSO", "HECHO"].map(
        (col) =>
          '<div class="kanban-col"><h4>' + nombreEstado(col) + " (" + datos.tareas.filter((t) => t.estado === col).length + ")</h4>" +
          datos.tareas
            .filter((t) => t.estado === col)
            .map((t) => this.tarjetaTarea(t, puedeEditar))
            .join("") +
          "</div>"
      ).join("") +
      "</div></section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Hitos</h3>' + (puedeEditar ? '<button class="btn chico" id="btn-hito">Agregar</button>' : "") + "</div>" +
      '<div class="barra-pista"><div class="barra-relleno" style="width:' + avance + '%"></div></div>' +
      '<p class="nota">' + avance + "% · " + cumplidos + " de " + hitos.length + " hitos cumplidos</p>" +
      '<ul class="hitos">' +
      (hitos.length === 0 ? '<li class="nota">Sin hitos definidos</li>' : hitos.map((h, i) => this.filaHito(h, i, puedeEditar)).join("")) +
      "</ul></section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Equipo</h3>' +
      (puedeUnirse ? '<button class="btn chico primario" id="btn-unirse">Unirme</button>' : "") + "</div>" +
      ((p.equipo || []).length === 0
        ? vacio("Sin miembros aún")
        : '<ul class="equipo">' +
          p.equipo.map((m) => "<li><strong>" + esc(m.nombre || m.usuarioId) + "</strong><span>" + esc(m.cargo === "lider" ? "Líder" : "Miembro") + "</span></li>").join("") +
          "</ul>") +
      (p.docenteAsesorId ? '<p class="nota">Docente asesor vinculado</p>' : "") +
      '<a class="btn" href="#/mensajes?hilo=' + encodeURIComponent("PROY#" + id) + '">Consultas del proyecto</a>' +
      "</section>" +
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Bitácora</h3>' +
      (puedeEditar ? '<button class="btn chico" id="btn-bitacora">Registrar avance</button>' : "") +
      "</div>" +
      (datos.bitacora.length === 0
        ? vacio("Aún no hay registros en la bitácora")
        : datos.bitacora.map((b) => this.entradaBitacora(b)).join("")) +
      "</section>" +
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Legado</h3>' +
      (puedeEditar ? '<button class="btn chico" id="btn-legado">Editar legado</button>' : "") + "</div>" +
      this.htmlLegado(p.legado || {}) +
      "</section>" +
      "</div>";
    this.wireDetalle(cont, datos);
  },

  tarjetaTarea(t, puedeEditar) {
    const mover =
      puedeEditar
        ? '<div class="tarea-mover">' +
          (t.estado !== "POR_HACER" ? '<button class="btn-icono" data-mover="' + t.tareaId + '" data-estado="' + (t.estado === "HECHO" ? "EN_CURSO" : "POR_HACER") + '" title="Mover a la izquierda">&larr;</button>' : "") +
          (t.estado !== "HECHO" ? '<button class="btn-icono" data-mover="' + t.tareaId + '" data-estado="' + (t.estado === "POR_HACER" ? "EN_CURSO" : "HECHO") + '" title="Mover a la derecha">&rarr;</button>' : "") +
          "</div>"
        : "";
    return (
      '<div class="kanban-tarjeta' + (t.estado === "HECHO" ? " hecha" : "") + '">' +
      "<div><strong>" + esc(t.titulo) + "</strong>" +
      (t.descripcion ? "<p>" + esc(t.descripcion) + "</p>" : "") +
      '<p class="nota">' + esc(t.responsableNombre || "Sin responsable") +
      (t.vence ? " · vence " + fmtFecha(t.vence) : "") + "</p></div>" + mover +
      "</div>"
    );
  },

  filaHito(h, i, puedeEditar) {
    return (
      '<li class="hito' + (h.cumplido ? " ok" : "") + '">' +
      (puedeEditar
        ? '<input type="checkbox" data-hito="' + i + '"' + (h.cumplido ? " checked" : "") + ' title="Marcar hito">'
        : '<span class="dot ' + (h.cumplido ? "ok" : "") + '">&middot;</span>') +
      "<div><strong>" + esc(h.titulo || h.texto || "Hito") + "</strong>" +
      (h.fecha ? "<span> · " + fmtFecha(h.fecha) + "</span>" : "") + "</div></li>"
    );
  },

  entradaBitacora(b) {
    return (
      '<div class="bitacora-entrada"><div class="comentario-cab"><strong>' + esc(b.autorNombre) + "</strong><time>" + fmtFechaHora(b.creadoEn__id) + "</time></div>" +
      "<p>" + esc(b.texto) + "</p>" +
      ((b.evidencias || []).length
        ? '<div class="etiquetas">' + b.evidencias.map((e, i) => '<button class="etiqueta" data-ev="' + i + '" data-key="' + esc(e.key) + '">' + esc(e.nombre) + "</button>").join("") + "</div>"
        : "") +
      "</div>"
    );
  },

  htmlLegado(legado) {
    const documentos = legado.documentos || [];
    const contactos = legado.contactos || [];
    return (
      '<p class="nota">Lo que queda para las próximas generaciones del proyecto.</p>' +
      "<h4>Aprendizajes</h4><p>" + esc(legado.aprendizajes || "Sin aprendizajes registrados") + "</p>" +
      "<h4>Documentos de legado</h4>" +
      (documentos.length === 0 ? '<p class="nota">Ninguno</p>' : documentos.map((d, i) => '<button class="btn chico" data-legado="' + i + '" data-key="' + esc(d.key) + '">Descargar ' + esc(d.nombre) + "</button>").join("")) +
      "<h4>Contactos útiles</h4>" +
      (contactos.length === 0 ? '<p class="nota">Ninguno</p>' : "<ul>" + contactos.map((c) => "<li>" + esc(typeof c === "string" ? c : c.nombre + (c.detalle ? " · " + c.detalle : "")) + "</li>").join("") + "</ul>")
    );
  },

  async wireDetalle(cont, datos) {
    const p = datos.proyecto;
    const id = p.proyectoId;
    const equipo = (p.equipo || []).map((m) => ({ usuarioId: m.usuarioId, nombre: m.nombre }));

    const selector = $("#proy-estado");
    selector &&
      (selector.onchange = async () => {
        try {
          await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { estado: selector.value } });
          toast("Estado actualizado");
          this.detalle(cont, id);
        } catch (e) {
          toast(e.message, "error");
        }
      });

    $("#btn-unirse") &&
      ($("#btn-unirse").onclick = async () => {
        try {
          await api("/proyectos/" + id + "/unirse", { metodo: "POST", cuerpo: {} });
          toast("¡Te uniste al proyecto!");
          this.detalle(cont, id);
        } catch (e) {
          toast(e.message, "error");
        }
      });

    $("#btn-tarea") &&
      ($("#btn-tarea").onclick = () => {
        promptDatos(
          "Nueva tarea",
          '<label class="campo"><span>Título</span><input id="tarea-titulo"></label>' +
          '<label class="campo"><span>Descripción</span><input id="tarea-desc"></label>' +
          '<label class="campo"><span>Responsable</span><select id="tarea-resp"><option value="">Sin asignar</option>' +
          equipo.map((m) => '<option value="' + m.usuarioId + '">' + esc(m.nombre) + "</option>").join("") +
          "</select></label>" +
          '<label class="campo"><span>Vence</span><input type="date" id="tarea-vence"></label>',
          async () => {
            const titulo = $("#tarea-titulo").value.trim();
            if (!titulo) {
              toast("El título es obligatorio", "error");
              return;
            }
            try {
              await api("/proyectos/" + id + "/tareas", {
                metodo: "POST",
                cuerpo: {
                  titulo,
                  descripcion: $("#tarea-desc").value,
                  responsableId: $("#tarea-resp").value,
                  vence: $("#tarea-vence").value,
                },
              });
              cerrarModal();
              toast("Tarea creada");
              this.detalle(cont, id);
            } catch (e) {
              toast(e.message, "error");
            }
          }
        );
      });

    $$("[data-mover]", cont).forEach((b) => {
      b.onclick = async () => {
        try {
          await api("/proyectos/" + id + "/tareas/" + b.dataset.mover, {
            metodo: "PUT",
            cuerpo: { estado: b.dataset.estado },
          });
          this.detalle(cont, id);
        } catch (e) {
          toast(e.message, "error");
        }
      };
    });

    $("#btn-hito") &&
      ($("#btn-hito").onclick = () => {
        promptDatos(
          "Nuevo hito",
          '<label class="campo"><span>Título</span><input id="hito-titulo"></label>' +
          '<label class="campo"><span>Fecha</span><input type="date" id="hito-fecha"></label>',
          async () => {
            const titulo = $("#hito-titulo").value.trim();
            if (!titulo) {
              toast("El título es obligatorio", "error");
              return;
            }
            const hitos = p.hitos || [];
            hitos.push({ titulo, fecha: $("#hito-fecha").value, cumplido: false });
            try {
              await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { hitos } });
              cerrarModal();
              toast("Hito agregado");
              this.detalle(cont, id);
            } catch (e) {
              toast(e.message, "error");
            }
          }
        );
      });

    $$('[data-hito]', cont).forEach((chk) => {
      chk.onchange = async () => {
        const hitos = p.hitos || [];
        hitos[+chk.dataset.hito].cumplido = chk.checked;
        try {
          await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { hitos } });
          this.detalle(cont, id);
        } catch (e) {
          toast(e.message, "error");
        }
      };
    });

    $("#btn-bitacora") &&
      ($("#btn-bitacora").onclick = () => {
        promptDatos(
          "Registrar avance",
          '<label class="campo"><span>¿Qué avanzó?</span><textarea id="bit-texto" rows="3"></textarea></label>' +
          '<label class="campo"><span>Evidencias (fotos o archivos)</span><input type="file" id="bit-archivos" multiple></label>' +
          '<div id="bit-lista" class="etiquetas"></div>',
          async () => {
            const texto = $("#bit-texto").value.trim();
            if (!texto) {
              toast("El texto es obligatorio", "error");
              return;
            }
            try {
              await api("/proyectos/" + id + "/bitacora", {
                metodo: "POST",
                cuerpo: { texto, evidencias: window._bitEvidencias || [] },
              });
              cerrarModal();
              toast("Avance registrado");
              this.detalle(cont, id);
            } catch (e) {
              toast(e.message, "error");
            }
          }
        );
        window._bitEvidencias = [];
        $("#bit-archivos").onchange = async (e) => {
          for (const archivo of Array.from(e.target.files || [])) {
            try {
              const key = await subirArchivo(archivo);
              window._bitEvidencias.push({ nombre: archivo.name, key });
            } catch (err) {
              toast(err.message, "error");
            }
          }
          $("#bit-lista").innerHTML = window._bitEvidencias.map((x) => '<span class="etiqueta">' + esc(x.nombre) + "</span>").join("");
        };
      });

    $("#btn-legado") &&
      ($("#btn-legado").onclick = () => {
        const legado = p.legado || {};
        window._legadoDocumentos = (legado.documentos || []).slice();
        promptDatos(
          "Editar legado",
          '<label class="campo"><span>Aprendizajes</span><textarea id="leg-aprend" rows="4">' + esc(legado.aprendizajes || "") + "</textarea></label>" +
          '<label class="campo"><span>Contactos útiles (uno por línea: nombre · detalle)</span><textarea id="leg-contactos" rows="3">' +
          esc((legado.contactos || []).map((c) => (typeof c === "string" ? c : c.nombre + (c.detalle ? " · " + c.detalle : ""))).join("\n")) +
          "</textarea></label>" +
          '<label class="campo"><span>Documentos de legado</span><input type="file" id="leg-archivos" multiple></label>' +
          '<div id="leg-lista" class="etiquetas">' +
          (legado.documentos || []).map((d) => '<span class="etiqueta">' + esc(d.nombre) + "</span>").join("") +
          "</div>",
          async () => {
            const contactos = $("#leg-contactos")
              .value.split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l) => {
                const partes = l.split("·");
                return { nombre: partes[0].trim(), detalle: (partes[1] || "").trim() };
              });
            try {
              await api("/proyectos/" + id + "/legado", {
                metodo: "PUT",
                cuerpo: { aprendizajes: $("#leg-aprend").value, contactos, documentos: window._legadoDocumentos },
              });
              cerrarModal();
              toast("Legado actualizado");
              this.detalle(cont, id);
            } catch (e) {
              toast(e.message, "error");
            }
          }
        );
        $("#leg-archivos").onchange = async (e) => {
          for (const archivo of Array.from(e.target.files || [])) {
            try {
              const key = await subirArchivo(archivo);
              window._legadoDocumentos.push({ nombre: archivo.name, key });
            } catch (err) {
              toast(err.message, "error");
            }
          }
          $("#leg-lista").innerHTML = window._legadoDocumentos.map((d) => '<span class="etiqueta">' + esc(d.nombre) + "</span>").join("");
        };
      });

    const descargar = async (btn) => {
      try {
        const url = await urlDescarga(btn.dataset.key);
        window.open(url, "_blank");
      } catch (e) {
        toast(e.message, "error");
      }
    };
    $$("[data-ev]", cont).forEach((b) => (b.onclick = () => descargar(b)));
    $$("[data-legado]", cont).forEach((b) => (b.onclick = () => descargar(b)));
  },
};
