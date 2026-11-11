App.vistas.auditoria = {
  async lista(cont) {
    cont.innerHTML = cargando();
    const [items, usuarios] = await Promise.all([api("/auditoria"), api("/usuarios")]);
    const entidades = [...new Set(items.map((i) => i.entidad).filter(Boolean))].sort();
    let filtroUsuario = "";
    let filtroEntidad = "";
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Auditoría</h2><p>Registro de acciones del sistema (últimas ' + items.length + ")</p></div>" +
      '<div class="fila filtros-aud">' +
      '<label class="campo"><span>Usuario</span><select id="aud-usuario"><option value="">Todos</option>' +
      usuarios.map((u) => '<option value="' + u.usuarioId + '">' + esc(u.nombre) + "</option>").join("") +
      "</select></label>" +
      '<label class="campo"><span>Entidad</span><select id="aud-entidad"><option value="">Todas</option>' +
      entidades.map((e) => "<option>" + esc(e) + "</option>").join("") +
      "</select></label>" +
      "</div>" +
      '<div id="lista-auditoria"></div>';
    const pintar = () => {
      let filas = items;
      if (filtroUsuario) filas = filas.filter((i) => i.usuarioId === filtroUsuario);
      if (filtroEntidad) filas = filas.filter((i) => i.entidad === filtroEntidad);
      $("#lista-auditoria").innerHTML =
        filas.length === 0
          ? vacio("Sin registros con esos filtros")
          : '<div class="tarjeta tabla-scroll"><table class="tabla-datos tabla-aud"><tr><th>Cuándo</th><th>Quién</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr>' +
            filas
              .map(
                (i) =>
                  "<tr><td>" + fmtFechaHora(i.creadoEn__id) + "</td>" +
                  "<td><strong>" + esc(i.usuarioNombre || "") + "</strong><br><span class='nota'>" + esc(nombreRol(i.rol)) + "</span></td>" +
                  "<td>" + esc(i.accion) + "</td>" +
                  "<td>" + esc(i.entidad) + (i.entidadId ? " <span class='nota'>" + idCorto(i.entidadId) + "</span>" : "") + "</td>" +
                  "<td>" + esc(recortar(i.detalle, 60)) + "</td></tr>"
              )
              .join("") +
            "</table></div>";
    };
    $("#aud-usuario").onchange = (e) => {
      filtroUsuario = e.target.value;
      pintar();
    };
    $("#aud-entidad").onchange = (e) => {
      filtroEntidad = e.target.value;
      pintar();
    };
    pintar();

    function recortar(texto, n) {
      texto = texto || "";
      return texto.length > n ? texto.slice(0, n) + "…" : texto;
    }
  },
};
