App.vistas.anuncios = {
  async lista(cont) {
    cont.innerHTML = cargando();
    const [anuncios, cat] = await Promise.all([api("/anuncios"), App.catalogo ? Promise.resolve(App.catalogo) : api("/catalogos")]);
    const usuario = App.usuario;
    const puedePublicar = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol) || usuario.rol === "estudiante";
    const categorias = (cat.categoriasAnuncio || []).slice();
    let filtroCategoria = "";
    let soloNoLeidos = false;
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Anuncios</h2>' +
      (puedePublicar ? '<button class="btn primario" id="btn-nuevo-anuncio">Publicar</button>' : "") +
      "</div>" +
      '<div class="pastillas">' +
      '<button class="pastilla activa" data-cat="">Todos</button>' +
      '<button class="pastilla" data-cat="__no_leidos">No leídos (' + anuncios.filter((a) => !a.leido).length + ")</button>" +
      categorias.map((c) => '<button class="pastilla" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("") +
      "</div>" +
      '<div id="muro" class="muro"></div>';
    const pintar = () => {
      let items = anuncios;
      if (filtroCategoria === "__no_leidos") {
        items = items.filter((a) => !a.leido);
        soloNoLeidos = true;
      } else {
        soloNoLeidos = false;
        if (filtroCategoria) items = items.filter((a) => a.categoria === filtroCategoria);
      }
      $("#muro").innerHTML =
        items.length === 0
          ? vacio(soloNoLeidos ? "Estás al día: todo leído" : "No hay anuncios para ti")
          : items.map((a) => this.tarjetaAnuncio(a, usuario)).join("");
      $$(".anuncio", cont).forEach((el) => {
        el.onclick = () => this.abrirAnuncio(el.dataset.id, cont);
      });
      $$("[data-lecturas]", cont).forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          this.verLecturas(b.dataset.lecturas);
        };
      });
    };
    $$(".pastilla", cont).forEach((b) => {
      b.onclick = () => {
        $$(".pastilla", cont).forEach((x) => x.classList.remove("activa"));
        b.classList.add("activa");
        filtroCategoria = b.dataset.cat;
        pintar();
      };
    });
    pintar();
    $("#btn-nuevo-anuncio") && ($("#btn-nuevo-anuncio").onclick = () => this.crearAnuncio(cont));
  },

  tarjetaAnuncio(a, usuario) {
    const creador = a.creadoPor === usuario.usuarioId || ["ti", "direccion"].includes(usuario.rol);
    return (
      '<article class="anuncio' + (a.fija ? " fija" : "") + (a.leido ? "" : " no-leido") + " p-" + esc(a.prioridad || "normal") + '" data-id="' + a.anuncioId + '">' +
      '<div class="anuncio-encabezado">' +
      "<div><h3>" + esc(a.titulo) + "</h3>" +
      '<p class="nota">' + esc(a.categoria || "") + " · " + esc(a.creadoPorNombre || "") + " · " + fmtFechaHora(a.creadoEn) + "</p></div>" +
      '<div class="anuncio-tags">' +
      (a.fija ? '<span class="prioridad-tag">Fijado</span>' : "") +
      (a.prioridad !== "normal" ? '<span class="prioridad-tag ' + esc(a.prioridad) + '">' + esc(a.prioridad) + "</span>" : "") +
      (a.leido ? "" : '<span class="prioridad-tag nuevo">Nuevo</span>') +
      "</div></div>" +
      "<p>" + esc((a.contenido || "").slice(0, 160)) + ((a.contenido || "").length > 160 ? "…" : "") + "</p>" +
      (a.encuesta ? '<p class="nota">Incluye encuesta: ' + esc(a.encuesta.pregunta) + "</p>" : "") +
      (creador ? '<button class="btn chico" data-lecturas="' + a.anuncioId + '">Ver lecturas</button>' : "") +
      "</article>"
    );
  },

  async abrirAnuncio(id, cont) {
    let a;
    try {
      a = await api("/anuncios/" + id);
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    const usuario = App.usuario;
    const creador = a.creadoPor === usuario.usuarioId || ["ti", "direccion"].includes(usuario.rol);
    let encuestaHtml = "";
    if (a.encuesta) {
      const opciones = a.encuesta.opciones || [];
      const resultados = a.encuesta.resultados || {};
      const totalVotos = Object.values(resultados).reduce((x, y) => x + y, 0);
      encuestaHtml =
        '<div class="encuesta"><h4>' + esc(a.encuesta.pregunta) + "</h4>" +
        opciones
          .map((op) => {
            const votos = resultados[op] || 0;
            const porcentaje = totalVotos ? Math.round((votos * 100) / totalVotos) : 0;
            return (
              '<button class="encuesta-opcion" data-voto="' + esc(op) + '"' + (a.miVoto ? " disabled" : "") + ">" +
              '<span>' + esc(op) + (a.miVoto === op ? " (tu voto)" : "") + "</span>" +
              '<span class="encuesta-barra"><i style="width:' + porcentaje + '%"></i></span>' +
              "<b>" + votos + "</b></button>"
            );
          })
          .join("") +
        "<p class=\"nota\">" + totalVotos + " voto(s) registrados</p></div>";
    }
    abrirModal(
      a.titulo,
      '<p class="nota">' + esc(a.categoria || "") + " · " + esc(a.creadoPorNombre || "") + " · " + fmtFechaHora(a.creadoEn) +
      (a.caducaEn ? " · vence " + fmtFecha(a.caducaEn) : "") + "</p>" +
      "<p>" + esc(a.contenido || "") + "</p>" +
      ((a.adjuntos || []).length
        ? '<div class="etiquetas">' + a.adjuntos.map((x, i) => '<button class="etiqueta" data-adj="' + i + '" data-key="' + esc(x.key) + '">' + esc(x.nombre) + "</button>").join("") + "</div>"
        : "") +
      encuestaHtml,
      (!a.leido ? '<button class="btn primario" id="btn-leer-anuncio">Marcar como leído</button>' : '<span class="nota">Ya lo leíste</span>') +
      (creador ? '<button class="btn" id="btn-ver-lecturas">Ver lecturas</button>' : "")
    );
    $$("[data-adj]").forEach((b) => {
      b.onclick = async () => {
        try {
          window.open(await urlDescarga(b.dataset.key), "_blank");
        } catch (e) {
          toast(e.message, "error");
        }
      };
    });
    $$("[data-voto]").forEach((b) => {
      b.onclick = async () => {
        try {
          await api("/anuncios/" + id + "/leer", { metodo: "POST", cuerpo: { voto: b.dataset.voto } });
          cerrarModal();
          toast("Voto registrado");
          this.abrirAnuncio(id, cont);
        } catch (e) {
          toast(e.message, "error");
        }
      };
    });
    $("#btn-leer-anuncio") &&
      ($("#btn-leer-anuncio").onclick = async () => {
        try {
          await api("/anuncios/" + id + "/leer", { metodo: "POST", cuerpo: {} });
          cerrarModal();
          toast("Anuncio marcado como leído");
          this.lista(cont);
        } catch (e) {
          toast(e.message, "error");
        }
      });
    $("#btn-ver-lecturas") && ($("#btn-ver-lecturas").onclick = () => this.verLecturas(id));
  },

  async verLecturas(id) {
    let datos;
    try {
      datos = await api("/anuncios/" + id + "/lecturas");
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    abrirModal(
      "Confirmación de lectura",
      '<div class="kpis"><div class="kpi"><strong>' + datos.tasa + "%</strong><span>lectura</span></div>" +
      '<div class="kpi"><strong>' + datos.leidos.length + "/" + datos.total + "</strong><span>personas al día</span></div></div>" +
      (datos.faltan.length ? "<h4>Falta que lean</h4><p>" + datos.faltan.map(esc).join(", ") + "</p>" : "") +
      (datos.leidos.length ? "<h4>Ya leyeron</h4><ul class='lista-simple'>" + datos.leidos.map((l) => "<li>" + esc(l.nombre) + (l.voto ? " · voto: " + esc(l.voto) : "") + " · " + fmtFechaHora(l.leidoEn) + "</li>").join("") + "</ul>" : "")
    );
  },

  async crearAnuncio(cont) {
    const usuario = App.usuario;
    const cat = App.catalogo || (await api("/catalogos"));
    const categorias = cat.categoriasAnuncio || [];
    const niveles = cat.niveles || ["Primaria", "Secundaria"];
    const grados = cat.grados || [];
    const secciones = cat.secciones || [];
    let segmentoHtml = "";
    if (usuario.rol === "estudiante") {
      let proyectos = [];
      try {
        proyectos = await api("/proyectos");
      } catch (e) {}
      segmentoHtml =
        '<label class="campo"><span>Publicar en el mural de tu proyecto</span><select id="an-proyecto"><option value="">Selecciona…</option>' +
        proyectos
          .filter((p) => p.responsableId === usuario.usuarioId || (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId))
          .map((p) => '<option value="' + p.proyectoId + '">' + esc(p.nombre) + "</option>")
          .join("") +
        "</select></label>";
    } else if (usuario.rol === "docente") {
      segmentoHtml =
        '<p class="nota">Segmenta por tu aula (nivel, grado o sección).</p>' +
        '<label class="campo"><span>Nivel</span><select id="an-nivel"><option value="">Todos</option>' +
        niveles.map((n) => "<option>" + esc(n) + "</option>").join("") +
        "</select></label>" +
        '<div class="fila">' +
        '<label class="campo"><span>Grado</span><input id="an-grado" placeholder="5°"></label>' +
        '<label class="campo"><span>Sección</span><input id="an-seccion" placeholder="A"></label>' +
        "</div>";
    } else {
      segmentoHtml =
        '<p class="nota">Sin segmento el anuncio llega a todo el colegio. Puedes acotarlo:</p>' +
        '<label class="campo"><span>Nivel</span><select id="an-nivel"><option value="">Todos</option>' +
        niveles.map((n) => "<option>" + esc(n) + "</option>").join("") +
        "</select></label>" +
        '<div class="fila">' +
        '<label class="campo"><span>Grado</span><input id="an-grado" placeholder="5°"></label>' +
        '<label class="campo"><span>Sección</span><input id="an-seccion" placeholder="A"></label>' +
        "</div>";
    }
    abrirModal(
      "Publicar anuncio",
      '<label class="campo"><span>Título</span><input id="an-titulo"></label>' +
      '<label class="campo"><span>Contenido</span><textarea id="an-contenido" rows="4"></textarea></label>' +
      '<div class="fila">' +
      '<label class="campo"><span>Categoría</span><select id="an-categoria">' +
      categorias.map((c) => "<option>" + esc(c) + "</option>").join("") +
      "</select></label>" +
      '<label class="campo"><span>Prioridad</span><select id="an-prioridad"><option value="normal">Normal</option><option value="importante">Importante</option><option value="urgente">Urgente</option></select></label>' +
      "</div>" +
      segmentoHtml +
      '<label class="check"><input type="checkbox" id="an-fija"> Fijar arriba del muro</label>' +
      '<label class="campo"><span>Vence (opcional)</span><input type="date" id="an-caduca"></label>' +
      '<label class="check"><input type="checkbox" id="an-encuesta"> Incluir encuesta</label>' +
      '<div id="an-encuesta-campos" class="oculto">' +
      '<label class="campo"><span>Pregunta</span><input id="an-pregunta"></label>' +
      '<label class="campo"><span>Opciones (separadas por comas)</span><input id="an-opciones" placeholder="Sí, No, Tal vez"></label>' +
      "</div>",
      '<button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primario" id="an-publicar">Publicar</button>'
    );
    $("#an-encuesta").onchange = (e) => $("#an-encuesta-campos").classList.toggle("oculto", !e.target.checked);
    $("#an-publicar").onclick = async () => {
      const titulo = $("#an-titulo").value.trim();
      const contenido = $("#an-contenido").value.trim();
      if (!titulo || !contenido) {
        toast("Título y contenido son obligatorios", "error");
        return;
      }
      const cuerpo = {
        titulo,
        contenido,
        categoria: $("#an-categoria").value,
        prioridad: $("#an-prioridad").value,
        fija: $("#an-fija").checked,
        caducaEn: $("#an-caduca").value || "",
      };
      if (usuario.rol === "estudiante") {
        cuerpo.segmento = { proyectoId: $("#an-proyecto").value || "" };
        if (!cuerpo.segmento.proyectoId) {
          toast("Selecciona el proyecto donde publicar", "error");
          return;
        }
      } else {
        const segmento = {};
        if ($("#an-nivel")?.value) segmento.niveles = [$("#an-nivel").value];
        if ($("#an-grado")?.value.trim()) segmento.grados = [$("#an-grado").value.trim()];
        if ($("#an-seccion")?.value.trim()) segmento.secciones = [$("#an-seccion").value.trim()];
        cuerpo.segmento = segmento;
      }
      if ($("#an-encuesta").checked) {
        const opciones = $("#an-opciones").value.split(",").map((s) => s.trim()).filter(Boolean);
        if (!$("#an-pregunta").value.trim() || opciones.length < 2) {
          toast("La encuesta necesita pregunta y al menos 2 opciones", "error");
          return;
        }
        cuerpo.encuesta = { pregunta: $("#an-pregunta").value.trim(), opciones };
      }
      try {
        await api("/anuncios", { metodo: "POST", cuerpo });
        cerrarModal();
        toast("Anuncio publicado");
        this.lista(cont);
      } catch (e) {
        toast(e.message, "error");
      }
    };
  },
};
