App.vistas.autorizaciones = {
  async lista(cont) {
    cont.innerHTML = cargando();
    const items = await api("/autorizaciones");
    const usuario = App.usuario;
    const esPadre = usuario.rol === "padre";
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Autorizaciones</h2></div>' +
      '<p class="nota">' +
      (esPadre
        ? "Actividades de tu hijo(a) que requieren tu autorización con firma digital."
        : "Autorizaciones de padres para actividades que los involucran.") +
      "</p>" +
      (items.length === 0
        ? vacio(esPadre ? "No hay autorizaciones pendientes para ti" : "No hay autorizaciones registradas")
        : '<div class="tarjeta lista">' +
          items.map((a) => this.tarjetaAutorizacion(a, esPadre)).join("") +
          "</div>");
    $$("[data-decision]", cont).forEach((b) => {
      b.onclick = () => this.decidir(b.dataset.decision, b.dataset.id, cont);
    });
  },

  tarjetaAutorizacion(a, esPadre) {
    const pendiente = a.estado === "PENDIENTE";
    return (
      '<div class="fila-lista autorizacion">' +
      semaforo(a.estado) +
      '<div class="fila-principal"><strong>' + esc(a.solicitudTitulo) + "</strong>" +
      "<p>" +
      (a.fecha ? fmtFecha(a.fecha) : "") +
      (a.horaInicio ? " " + a.horaInicio + (a.horaFin ? "–" + a.horaFin : "") : "") +
      (a.lugar ? " · " + esc(a.lugar) : "") +
      "</p>" +
      '<p class="nota">Estudiante responsable: ' + esc(a.responsable || "—") +
      (esPadre ? "" : " · Apoderado: " + esc(a.apoderadoNombre || "")) + "</p>" +
      (pendiente
        ? ""
        : '<p class="nota">' + esc(a.estado === "ACEPTADA" ? "Aceptada" : "Rechazada") +
          " por " + esc(a.firma || "") + " · " + fmtFechaHora(a.decididoEn) + "</p>") +
      "</div>" +
      (esPadre && pendiente
        ? '<div class="columna-botones">' +
          '<button class="btn chico primario" data-decision="aceptar" data-id="' + a.autorizacionId + '">Aceptar</button>' +
          '<button class="btn chico peligro" data-decision="rechazar" data-id="' + a.autorizacionId + '">Rechazar</button>' +
          "</div>"
        : badge(a.estado)) +
      "</div>"
    );
  },

  decidir(decision, id, cont) {
    abrirModal(
      decision === "aceptar" ? "Aceptar autorización" : "Rechazar autorización",
      '<p>La firma digital consiste en escribir tu nombre completo tal como figura en el documento.</p>' +
      '<label class="campo"><span>Firma digital (nombre completo)</span><input id="aut-firma" placeholder="' + esc(App.usuario.nombre || "") + '"></label>',
      '<button class="btn" onclick="cerrarModal()">Cancelar</button>' +
      '<button class="btn ' + (decision === "aceptar" ? "primario" : "peligro") + '" id="aut-confirmar">' +
      (decision === "aceptar" ? "Aceptar y firmar" : "Rechazar") +
      "</button>"
    );
    $("#aut-confirmar").onclick = async () => {
      const firma = $("#aut-firma").value.trim();
      if (!firma) {
        toast("Escribe tu nombre completo como firma", "error");
        return;
      }
      try {
        await api("/autorizaciones/" + id + "/decidir", { metodo: "POST", cuerpo: { decision, firma } });
        cerrarModal();
        toast(decision === "aceptar" ? "Autorización aceptada" : "Autorización rechazada");
        this.lista(cont);
      } catch (e) {
        toast(e.message, "error");
      }
    };
  },
};
