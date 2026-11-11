App.vistas.mensajes = {
  async vista(cont, hilo) {
    if (!hilo) {
      await this.indice(cont);
      return;
    }
    cont.innerHTML = cargando();
    const [mensajes, titulo] = await Promise.all([api("/mensajes?hilo=" + encodeURIComponent(hilo)), this.tituloHilo(hilo)]);
    const usuario = App.usuario;
    cont.innerHTML =
      '<div class="encabezado-vista"><div><h2>Consultas</h2><p>' + esc(titulo) + '</p></div><a class="btn chico" href="#/mensajes">Otros hilos</a></div>' +
      '<section class="tarjeta chat">' +
      '<div class="chat-hilos" id="chat-hilos">' +
      (mensajes.length === 0
        ? vacio("Sin mensajes todavía. Escribe la primera consulta.")
        : mensajes.map((m) => this.burbuja(m, usuario.usuarioId)).join("")) +
      "</div>" +
      '<form class="chat-form" id="form-mensaje">' +
      '<input id="msg-texto" placeholder="Escribe tu mensaje…" autocomplete="off">' +
      '<button class="btn primario">Enviar</button>' +
      "</form></section>";
    const hilos = $("#chat-hilos");
    hilos.scrollTop = hilos.scrollHeight;
    $("#form-mensaje").onsubmit = async (e) => {
      e.preventDefault();
      const texto = $("#msg-texto").value.trim();
      if (!texto) return;
      try {
        await api("/mensajes", { metodo: "POST", cuerpo: { hiloId: hilo, texto } });
        this.vista(cont, hilo);
      } catch (err) {
        toast(err.message, "error");
      }
    };
  },

  burbuja(m, usuarioId) {
    const propia = m.autorId === usuarioId;
    return (
      '<div class="burbuja' + (propia ? " propia" : "") + '">' +
      '<div class="burbuja-cab"><strong>' + esc(m.autorNombre) + "</strong> · " + esc(nombreRol(m.autorRol)) + "</div>" +
      "<p>" + esc(m.texto) + "</p>" +
      "<time>" + fmtFechaHora(m.creadoEn__id) + "</time></div>"
    );
  },

  async tituloHilo(hilo) {
    try {
      if (hilo.startsWith("SOL#")) {
        const datos = await api("/solicitudes/" + hilo.slice(4));
        return "Solicitud: " + datos.solicitud.titulo;
      }
      if (hilo.startsWith("PROY#")) {
        const datos = await api("/proyectos/" + hilo.slice(5));
        return "Proyecto: " + datos.proyecto.nombre;
      }
    } catch (e) {}
    return "Hilo " + (hilo || "").slice(0, 12);
  },

  async indice(cont) {
    cont.innerHTML = cargando();
    const usuario = App.usuario;
    const hilos = [];
    try {
      if (usuario.rol === "padre") {
        cont.innerHTML =
          '<div class="encabezado-vista"><h2>Consultas</h2></div>' +
          vacio("Las consultas se abren desde una solicitud o un proyecto. No tienes hilos activos.");
        return;
      }
      const [solicitudes, proyectos] = await Promise.all([
        ["estudiante", "docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol) ? api("/solicitudes") : Promise.resolve([]),
        api("/proyectos").catch(() => []),
      ]);
      solicitudes
        .filter((s) => s.estado !== "BORRADOR")
        .slice(0, 30)
        .forEach((s) => hilos.push({ hilo: "SOL#" + s.solicitudId, titulo: s.titulo, detalle: nombreEstado(s.estado) + " · " + (s.solicitanteNombre || ""), href: "#/mensajes?hilo=" + encodeURIComponent("SOL#" + s.solicitudId) }));
      proyectos
        .filter((p) => (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId) || ["ti", "direccion"].includes(usuario.rol))
        .slice(0, 30)
        .forEach((p) => hilos.push({ hilo: "PROY#" + p.proyectoId, titulo: p.nombre, detalle: nombreEstado(p.estado) + " · " + (p.responsableNombre || ""), href: "#/mensajes?hilo=" + encodeURIComponent("PROY#" + p.proyectoId) }));
    } catch (e) {}
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Consultas</h2></div>' +
      (hilos.length === 0
        ? vacio("No tienes hilos de consulta. Se abren desde una solicitud o un proyecto.")
        : '<div class="tarjeta lista">' +
          hilos
            .map(
              (h) =>
                '<a class="fila-lista" href="' + h.href + '">' +
                '<span class="logo-circulo chico">C</span>' +
                '<div class="fila-principal"><strong>' + esc(h.titulo) + "</strong><p>" + esc(h.detalle) + "</p></div>" +
                "<span class='nota'>Abrir</span></a>"
            )
            .join("") +
          "</div>");
  },
};
