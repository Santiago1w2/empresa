App.vistas.usuarios = {
  async lista(cont) {
    cont.innerHTML = cargando();
    const usuarios = await api("/usuarios");
    const estudiantes = usuarios.filter((u) => u.rol === "estudiante");
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Usuarios</h2>' +
      '<div><button class="btn" id="btn-catalogos">Catálogos</button> <button class="btn primario" id="btn-nuevo-usuario">Nuevo usuario</button></div>' +
      "</div>" +
      '<p class="nota">' + usuarios.length + " usuarios registrados · " + usuarios.filter((u) => u.activo === false).length + " desactivados</p>" +
      '<div class="tarjeta lista">' +
      usuarios
        .map(
          (u) =>
            '<div class="fila-lista usuario-fila">' +
            '<span class="avatar chico">' + esc((u.nombre || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()) + "</span>" +
            '<div class="fila-principal"><strong>' + esc(u.nombre) + (u.activo === false ? ' <span class="prioridad-tag">Desactivado</span>' : "") + "</strong>" +
            "<p>" + esc(u.email || "") + " · " + esc(nombreRol(u.rol)) +
            (u.nivel ? " · " + esc(u.nivel) + " " + esc(u.grado || "") + esc(u.seccion || "") : "") + "</p>" +
            (u.rol === "padre" && (u.hijos || []).length
              ? '<p class="nota">Hijos vinculados: ' + (u.hijos || []).map((id) => esc(nombreHijo(id, estudiantes))).join(", ") + "</p>"
              : "") +
            "</div>" +
            '<button class="btn chico" data-editar="' + u.usuarioId + '">Editar</button>' +
            "</div>"
        )
        .join("") +
      "</div>";
    $("#btn-nuevo-usuario").onclick = () => this.formularioUsuario(cont, null, estudiantes);
    $("#btn-catalogos").onclick = () => this.editorCatalogos(cont);
    $$("[data-editar]", cont).forEach((b) => {
      b.onclick = () => {
        const u = usuarios.find((x) => x.usuarioId === b.dataset.editar);
        this.formularioUsuario(cont, u, estudiantes);
      };
    });
  },

  async formularioUsuario(cont, usuario, estudiantes) {
    const esNuevo = !usuario;
    const campos = (n) => (usuario ? usuario[n] || "" : "");
    abrirModal(
      esNuevo ? "Nuevo usuario" : "Editar usuario",
      '<label class="campo"><span>Nombre completo</span><input id="usr-nombre" value="' + esc(campos("nombre")) + '"></label>' +
      '<label class="campo"><span>Correo</span><input type="email" id="usr-email" value="' + esc(campos("email")) + '"' + (esNuevo ? "" : " disabled") + "></label>" +
      (esNuevo ? '<label class="campo"><span>Clave inicial (mínimo 6)</span><input type="password" id="usr-clave"></label>' : "") +
      '<div class="fila">' +
      '<label class="campo"><span>Rol</span><select id="usr-rol">' +
      Object.keys(NOMBRES_ROL).map((r) => '<option value="' + r + '"' + (campos("rol") === r ? " selected" : "") + ">" + nombreRol(r) + "</option>").join("") +
      "</select></label>" +
      '<label class="campo"><span>Nivel</span><select id="usr-nivel"><option value="">—</option><option' + (campos("nivel") === "Primaria" ? " selected" : "") + '>Primaria</option><option' + (campos("nivel") === "Secundaria" ? " selected" : "") + ">Secundaria</option></select></label>" +
      "</div>" +
      '<div class="fila">' +
      '<label class="campo"><span>Grado</span><input id="usr-grado" value="' + esc(campos("grado")) + '" placeholder="5°"></label>' +
      '<label class="campo"><span>Sección</span><input id="usr-seccion" value="' + esc(campos("seccion")) + '" placeholder="A"></label>' +
      "</div>" +
      '<label class="campo"><span>Hijos vinculados (solo para padres)</span><div class="etiquetas">' +
      estudiantes
        .map(
          (e) =>
            '<label class="check"><input type="checkbox" data-hijo="' + e.usuarioId + '"' +
            ((usuario?.hijos || []).includes(e.usuarioId) ? " checked" : "") + "> " + esc(e.nombre) + "</label>"
        )
        .join("") +
      "</div></label>" +
      (esNuevo ? "" : '<label class="check"><input type="checkbox" id="usr-activo"' + (usuario.activo !== false ? " checked" : "") + "> Usuario activo</label>") +
      (esNuevo ? "" : '<label class="campo"><span>Nueva clave (dejar vacío para no cambiar)</span><input type="password" id="usr-clave"></label>'),
      '<button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primario" id="usr-guardar">' + (esNuevo ? "Crear" : "Guardar") + "</button>"
    );
    $("#usr-guardar").onclick = async () => {
      const cuerpo = {
        nombre: $("#usr-nombre").value,
        rol: $("#usr-rol").value,
        nivel: $("#usr-nivel").value,
        grado: $("#usr-grado").value,
        seccion: $("#usr-seccion").value,
        hijos: $$("[data-hijo]").filter((c) => c.checked).map((c) => c.dataset.hijo),
      };
      if ($("#usr-clave")?.value) cuerpo.clave = $("#usr-clave").value;
      if (!esNuevo) {
        cuerpo.activo = $("#usr-activo")?.checked ?? true;
        if (!cuerpo.clave) delete cuerpo.clave;
      }
      if (!cuerpo.nombre.trim()) {
        toast("El nombre es obligatorio", "error");
        return;
      }
      try {
        if (esNuevo) {
          if (!$("#usr-email").value.includes("@") || !cuerpo.clave || cuerpo.clave.length < 6) {
            toast("Correo válido y clave de al menos 6 caracteres", "error");
            return;
          }
          cuerpo.email = $("#usr-email").value;
          await api("/usuarios", { metodo: "POST", cuerpo });
        } else {
          await api("/usuarios/" + usuario.usuarioId, { metodo: "PUT", cuerpo });
        }
        cerrarModal();
        toast(esNuevo ? "Usuario creado" : "Usuario actualizado");
        this.lista(cont);
      } catch (e) {
        toast(e.message, "error");
      }
    };
  },

  async editorCatalogos(cont) {
    let cat;
    try {
      cat = App.catalogo || (await api("/catalogos"));
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    abrirModal(
      "Catálogos institucionales",
      '<p class="nota">Edita los tipos de solicitud, rutas de aprobación y SLA. JSON válido obligatorio.</p>' +
      '<label class="campo"><span>tiposSolicitud</span><textarea id="cat-tipos" rows="8">' + esc(JSON.stringify(cat.tiposSolicitud || {}, null, 1)) + "</textarea></label>" +
      '<label class="campo"><span>slaPorRol (días hábiles)</span><textarea id="cat-sla" rows="4">' + esc(JSON.stringify(cat.slaPorRol || {}, null, 1)) + "</textarea></label>",
      '<button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primario" id="cat-guardar">Guardar catálogos</button>'
    );
    $("#cat-guardar").onclick = async () => {
      let tipos, sla;
      try {
        tipos = JSON.parse($("#cat-tipos").value);
        sla = JSON.parse($("#cat-sla").value);
      } catch (e) {
        toast("JSON inválido: " + e.message, "error");
        return;
      }
      try {
        App.catalogo = await api("/catalogos", { metodo: "PUT", cuerpo: { tiposSolicitud: tipos, slaPorRol: sla } });
        cerrarModal();
        toast("Catálogos actualizados");
      } catch (e) {
        toast(e.message, "error");
      }
    };
  },
};

function nombreHijo(usuarioId, estudiantes) {
  const e = estudiantes.find((x) => x.usuarioId === usuarioId);
  return e ? e.nombre : usuarioId.slice(0, 8);
}
