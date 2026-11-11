App.vistas.indicadores = {
  async vista(cont) {
    cont.innerHTML = cargando();
    const ind = await api("/indicadores");
    const barras = (dic) => {
      const entradas = Object.entries(dic || {});
      const total = entradas.reduce((a, [, v]) => a + v, 0);
      if (!entradas.length) return '<p class="nota">Sin datos aún</p>';
      return (
        '<div class="barras">' +
        entradas
          .map(
            ([k, v]) =>
              '<div class="barra-fila"><span>' + esc(k.includes("_") && nombreEstado(k) !== k ? nombreEstado(k) : nombreRol(k) !== k ? nombreRol(k) : k) +
              '</span><div class="barra-pista"><div class="barra-relleno" style="width:' + Math.min(100, (v * 100) / Math.max(1, total)) + '%"></div></div><b>' + v + "</b></div>"
          )
          .join("") +
        "</div>"
      );
    };
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Indicadores</h2><p>Tablero institucional en tiempo real</p></div>' +
      '<div class="kpis">' +
      '<div class="kpi"><strong>' + ind.totalSolicitudes + "</strong><span>solicitudes</span></div>" +
      '<div class="kpi"><strong>' + ind.tiempoPromedioRespuestaDias + '</strong><span>días promedio de respuesta</span></div>' +
      '<div class="kpi' + (ind.vencidas > 0 ? " alarma" : "") + '"><strong>' + ind.vencidas + "</strong><span>fuera de plazo (SLA)</span></div>" +
      '<div class="kpi"><strong>' + ind.tasaLecturaAnuncios + "%</strong><span>lectura de anuncios</span></div>" +
      "</div>" +
      ((ind.proyectosEnRiesgo || []).length
        ? '<section class="tarjeta alerta-tarjeta"><div class="tarjeta-encabezado"><h3>Proyectos sin movimientos (más de 30 días)</h3></div><ul>' +
          ind.proyectosEnRiesgo.map((n) => "<li>" + esc(n) + "</li>").join("") +
          "</ul></section>"
        : "") +
      '<div class="rejilla-detalle">' +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Solicitudes por estado</h3></div>' + barras(ind.solicitudesPorEstado) + "</section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Tiempo promedio por rol (días)</h3></div>' +
      (Object.keys(ind.tiempoPromedioPorRolDias || {}).length === 0
        ? '<p class="nota">Sin decisiones registradas aún</p>'
        : '<table class="tabla-datos"><tr><th>Rol</th><th>Días</th></tr>' +
          Object.entries(ind.tiempoPromedioPorRolDias).map(([r, v]) => "<tr><td>" + esc(nombreRol(r)) + "</td><td>" + v + "</td></tr>").join("") +
          "</table>") +
      "</section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Proyectos por estado</h3></div>' + barras(ind.proyectosPorEstado) + "</section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Comunidad por rol</h3></div>' + barras(ind.usuariosPorRol) + "</section>" +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Participación por nivel</h3></div>' + barras(ind.participacionPorNivel) + "</section>" +
      ((ind.detalleLecturas || []).length
        ? '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Confirmación de lectura de anuncios</h3></div>' +
          '<table class="tabla-datos"><tr><th>Anuncio</th><th>Lecturas</th><th>Tasa</th></tr>' +
          ind.detalleLecturas.map((d) => "<tr><td>" + esc(d.anuncio) + "</td><td>" + d.leidos + "/" + d.total + "</td><td>" + d.tasa + "%</td></tr>").join("") +
          "</table></section>"
        : "") +
      "</div>";
  },
};
