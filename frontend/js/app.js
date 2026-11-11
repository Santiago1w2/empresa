const App = {
  usuario: null,
  catalogo: null,
  noLeidas: 0,
  vistas: {},
  temporizador: null,

  menus: {
    estudiante: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "solicitudes", texto: "Solicitudes" },
      { ruta: "proyectos", texto: "Proyectos" },
      { ruta: "explorar", texto: "Explorar" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "calendario", texto: "Calendario" },
      { ruta: "documentos", texto: "Documentos" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    docente: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "bandeja", texto: "Por revisar" },
      { ruta: "proyectos", texto: "Mis proyectos" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "calendario", texto: "Calendario" },
      { ruta: "documentos", texto: "Documentos" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    coordinacion: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "bandeja", texto: "Bandeja" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "calendario", texto: "Calendario" },
      { ruta: "indicadores", texto: "Indicadores" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    direccion: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "bandeja", texto: "Aprobaciones" },
      { ruta: "solicitudes", texto: "Solicitudes" },
      { ruta: "proyectos", texto: "Proyectos" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "calendario", texto: "Calendario" },
      { ruta: "indicadores", texto: "Indicadores" },
      { ruta: "auditoria", texto: "Auditoría" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    administracion: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "bandeja", texto: "Trámites" },
      { ruta: "calendario", texto: "Reservas" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "documentos", texto: "Documentos" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    padre: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "autorizaciones", texto: "Autorizaciones" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "calendario", texto: "Calendario" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    promotor: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "indicadores", texto: "Indicadores" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "perfil", texto: "Perfil" },
    ],
    ti: [
      { ruta: "inicio", texto: "Inicio" },
      { ruta: "bandeja", texto: "Bandeja" },
      { ruta: "solicitudes", texto: "Solicitudes" },
      { ruta: "proyectos", texto: "Proyectos" },
      { ruta: "anuncios", texto: "Anuncios" },
      { ruta: "usuarios", texto: "Usuarios" },
      { ruta: "calendario", texto: "Calendario" },
      { ruta: "indicadores", texto: "Indicadores" },
      { ruta: "auditoria", texto: "Auditoría" },
      { ruta: "perfil", texto: "Perfil" },
    ],
  },

  async iniciar() {
    this.aplicarPreferencias();
    window.addEventListener("hashchange", () => this.enrutar());
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    const token = localStorage.getItem("sac-token");
    if (token) {
      try {
        this.usuario = await api("/auth/yo");
      } catch (e) {
        this.usuario = null;
      }
    }
    if (this.usuario) {
      this.iniciarSesion(this.usuario);
    } else {
      this.pantallaLogin();
    }
  },

  aplicarPreferencias() {
    const tema = localStorage.getItem("sac-tema") || "claro";
    const letra = localStorage.getItem("sac-letra") || "mediano";
    document.documentElement.dataset.tema = tema;
    document.documentElement.dataset.letra = letra;
  },

  cambiarTema() {
    const actual = document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro";
    const nuevo = actual === "oscuro" ? "claro" : "oscuro";
    localStorage.setItem("sac-tema", nuevo);
    document.documentElement.dataset.tema = nuevo;
  },

  cambiarLetra(direccion) {
    const orden = ["pequeno", "mediano", "grande"];
    let i = orden.indexOf(localStorage.getItem("sac-letra") || "mediano");
    i = Math.min(2, Math.max(0, i + direccion));
    localStorage.setItem("sac-letra", orden[i]);
    document.documentElement.dataset.letra = orden[i];
  },

  pantallaLogin(registro) {
    document.title = "Santa Anita Conecta";
    const app = $("#app");
    app.innerHTML =
      '<div class="login-fondo"><div class="login-caja">' +
      '<div class="logo-marca"><div class="logo-circulo">SA</div><div><h1>Santa Anita Conecta</h1><p>La plataforma oficial del colegio</p></div></div>' +
      (registro ? this.formularioRegistro() : this.formularioLogin()) +
      "</div></div>";
    this.wireLogin(registro);
  },

  formularioLogin() {
    return (
      '<form id="form-login">' +
      '<label class="campo"><span>Correo</span><input type="email" id="login-email" required placeholder="omar@santaanita.edu.pe"></label>' +
      '<label class="campo"><span>Clave</span><input type="password" id="login-clave" required placeholder="••••••••"></label>' +
      '<button class="btn primario bloque" type="submit">Ingresar</button>' +
      '<p class="login-pie">¿No tienes cuenta? <a href="#" id="ir-registro">Regístrate</a></p>' +
      '<div class="login-demo"><p>Cuentas demo (clave: demo1234)</p>' +
      "<p>omar@santaanita.edu.pe (estudiante) · lucia@santaanita.edu.pe (docente)<br>carlos@santaanita.edu.pe (coordinación) · laura@santaanita.edu.pe (dirección)<br>jorge@santaanita.edu.pe (padre) · ti@santaanita.edu.pe (admin TI)</p></div>" +
      "</form>"
    );
  },

  formularioRegistro() {
    return (
      '<form id="form-registro">' +
      '<label class="campo"><span>Nombre completo</span><input id="reg-nombre" required></label>' +
      '<label class="campo"><span>Correo</span><input type="email" id="reg-email" required></label>' +
      '<label class="campo"><span>Clave (mínimo 6)</span><input type="password" id="reg-clave" required minlength="6"></label>' +
      '<label class="campo"><span>Rol</span><select id="reg-rol"><option value="estudiante">Estudiante</option><option value="docente">Docente / Tutor</option><option value="padre">Padre / Apoderado</option></select></label>' +
      '<label class="campo"><span>Nivel</span><select id="reg-nivel"><option value="">—</option><option>Primaria</option><option>Secundaria</option></select></label>' +
      '<label class="fila"><label class="campo"><span>Grado</span><input id="reg-grado" placeholder="5°"></label>' +
      '<label class="campo"><span>Sección</span><input id="reg-seccion" placeholder="A"></label></label>' +
      '<button class="btn primario bloque" type="submit">Crear cuenta</button>' +
      '<p class="login-pie"><a href="#" id="ir-login">Ya tengo cuenta</a></p>' +
      "</form>"
    );
  },

  wireLogin(registro) {
    $("#ir-registro")?.addEventListener("click", (e) => { e.preventDefault(); this.pantallaLogin(true); });
    $("#ir-login")?.addEventListener("click", (e) => { e.preventDefault(); this.pantallaLogin(false); });
    const form = $(registro ? "#form-registro" : "#form-login");
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        let datos;
        if (registro) {
          datos = await api("/auth/registrar", {
            metodo: "POST",
            cuerpo: {
              nombre: $("#reg-nombre").value,
              email: $("#reg-email").value,
              clave: $("#reg-clave").value,
              rol: $("#reg-rol").value,
              nivel: $("#reg-nivel").value,
              grado: $("#reg-grado").value,
              seccion: $("#reg-seccion").value,
            },
          });
        } else {
          datos = await api("/auth/login", {
            metodo: "POST",
            cuerpo: { email: $("#login-email").value, clave: $("#login-clave").value },
          });
        }
        localStorage.setItem("sac-token", datos.token);
        this.iniciarSesion(datos.usuario);
      } catch (err) {
        toast(err.message, "error");
      }
    };
  },

  async iniciarSesion(usuario) {
    this.usuario = usuario;
    try {
      this.catalogo = await api("/catalogos");
    } catch (e) {
      this.catalogo = null;
    }
    this.dibujarShell();
    if (!location.hash || location.hash === "#/" || location.hash === "#/inicio") {
      location.hash = "#/inicio";
    }
    await this.enrutar();
    this.sonarCampana();
    this.temporizador = setInterval(() => this.sonarCampana(), 30000);
  },

  cerrarSesion() {
    localStorage.removeItem("sac-token");
    clearInterval(this.temporizador);
    this.usuario = null;
    this.pantallaLogin();
  },

  dibujarShell() {
    const rol = this.usuario.rol;
    const menu = this.menus[rol] || this.menus.estudiante;
    const iniciales = (this.usuario.nombre || "?")
      .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    $("#app").innerHTML =
      '<div class="shell">' +
      '<aside class="sidebar">' +
      '<div class="logo-marca"><div class="logo-circulo">SA</div><div><h1>Santa Anita</h1><p>Conecta</p></div></div>' +
      '<nav class="menu-lateral">' +
      menu.map((m) => '<a href="#/' + m.ruta + '" data-ruta="' + m.ruta + '">' + esc(m.texto) + "</a>").join("") +
      "</nav>" +
      '<div class="sidebar-pie"><span class="rol-etiqueta">' + esc(nombreRol(rol)) + "</span></div>" +
      "</aside>" +
      '<div class="principal">' +
      '<header class="barra">' +
      '<div class="barra-izq"><button class="btn-icono" onclick="App.cambiarTema()" title="Cambiar tema"><span class="icono-tema"></span></button>' +
      '<button class="btn-icono" onclick="App.cambiarLetra(-1)" title="Reducir letra">A-</button>' +
      '<button class="btn-icono" onclick="App.cambiarLetra(1)" title="Aumentar letra">A+</button></div>' +
      '<div class="barra-der">' +
      '<button class="btn-icono campana" onclick="App.abrirCampana()" title="Notificaciones"><span class="icono-campana"></span><span class="campana-conteo" id="campana-conteo" style="display:none">0</span></button>' +
      '<a href="#/perfil" class="avatar" title="' + esc(this.usuario.nombre) + '">' + esc(iniciales) + "</a>" +
      "</div></header>" +
      '<main class="contenido" id="vista"></main>' +
      "</div>" +
      '<nav class="nav-inferior">' +
      menu.slice(0, 5).map((m) => '<a href="#/' + m.ruta + '" data-ruta="' + m.ruta + '">' + esc(m.texto) + "</a>").join("") +
      "</nav>" +
      "</div>";
  },

  async sonarCampana() {
    if (!this.usuario) return;
    try {
      const datos = await api("/notificaciones");
      this.noLeidas = datos.noLeidas;
      const conteo = $("#campana-conteo");
      if (conteo) {
        conteo.textContent = this.noLeidas;
        conteo.style.display = this.noLeidas > 0 ? "flex" : "none";
      }
    } catch (e) {}
  },

  async abrirCampana() {
    let datos;
    try {
      datos = await api("/notificaciones");
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    const ultimas = datos.notificaciones.slice(0, 10);
    abrirModal(
      "Notificaciones",
      ultimas.length === 0
        ? vacio("No tienes notificaciones")
        : '<div class="lista-notif">' +
          ultimas
            .map(
              (n) =>
                '<div class="notif ' + (n.leida ? "" : "no-leida") + '" onclick="App.irANotificacion(\'' + esc(n.creadoEn__id) + '\',\'' + esc(n.enlace || "") + '\')">' +
                '<strong>' + esc(n.titulo) + "</strong><p>" + esc(n.mensaje) + "</p>" +
                "<time>" + fmtFechaHora(n.creadoEn__id) + "</time></div>"
            )
            .join("") +
          "</div>",
      '<a class="btn bloque" style="text-align:center" href="#/notificaciones" onclick="cerrarModal()">Ver todas</a>'
    );
  },

  async irANotificacion(id, enlace) {
    cerrarModal();
    try {
      await api("/notificaciones/" + encodeURIComponent(id) + "/leer", { metodo: "PUT" });
    } catch (e) {}
    this.sonarCampana();
    if (enlace) location.hash = "#" + enlace;
  },

  async enrutar() {
    if (!this.usuario) return;
    const hash = location.hash || "#/inicio";
    const camino = hash.split("?")[0].replace(/^#\//, "");
    const partes = camino.split("/").filter(Boolean);
    const params = urlParams(hash);
    const vista = $("#vista");
    if (!vista) {
      this.dibujarShell();
    }
    $$(".menu-lateral a, .nav-inferior a").forEach((a) => {
      a.classList.toggle("activa", a.dataset.ruta === (partes[0] || "inicio"));
    });
    document.title = "Santa Anita Conecta";
    const cont = $("#vista");
    cont.scrollTop = 0;
    try {
      if (partes.length === 0) await this.vistaInicio(cont);
      else if (partes[0] === "solicitudes" && partes[1] === "nueva") await this.vistas.solicitudes.nueva(cont);
      else if (partes[0] === "solicitudes" && partes[1]) await this.vistas.solicitudes.detalle(cont, partes[1]);
      else if (partes[0] === "solicitudes") await this.vistas.solicitudes.lista(cont);
      else if (partes[0] === "bandeja") await this.vistas.solicitudes.lista(cont, true);
      else if (partes[0] === "proyectos" && partes[1]) await this.vistas.proyectos.detalle(cont, partes[1]);
      else if (partes[0] === "proyectos") await this.vistas.proyectos.lista(cont);
      else if (partes[0] === "explorar") await this.vistas.proyectos.explorar(cont);
      else if (partes[0] === "anuncios") await this.vistas.anuncios.lista(cont);
      else if (partes[0] === "calendario") await this.vistas.calendario.vista(cont);
      else if (partes[0] === "autorizaciones") await this.vistas.autorizaciones.lista(cont);
      else if (partes[0] === "mensajes") await this.vistas.mensajes.vista(cont, params.hilo || "");
      else if (partes[0] === "documentos") await this.vistas.documentos.lista(cont);
      else if (partes[0] === "indicadores") await this.vistas.indicadores.vista(cont);
      else if (partes[0] === "usuarios") await this.vistas.usuarios.lista(cont);
      else if (partes[0] === "auditoria") await this.vistas.auditoria.lista(cont);
      else if (partes[0] === "notificaciones") await this.vistaNotificaciones(cont);
      else if (partes[0] === "perfil") await this.vistaPerfil(cont);
      else await this.vistaInicio(cont);
    } catch (e) {
      cont.innerHTML = '<div class="tarjeta">' + '<h2>Ocurrió un error</h2><p>' + esc(e.message) + "</p>" + '<a class="btn" href="#/inicio">Volver al inicio</a></div>';
    }
  },

  async vistaInicio(cont) {
    const rol = this.usuario.rol;
    cont.innerHTML = cargando();
    const saludo = "Hola, " + (this.usuario.nombre || "").split(" ")[0];
    let cuerpo = "";
    try {
      if (rol === "estudiante" || rol === "padre") {
        const [solicitudes, anuncios] = await Promise.all([
          api("/solicitudes"),
          api("/anuncios?noLeidos=1"),
        ]);
        const activas = solicitudes.filter((s) => ["EN_REVISION", "OBSERVADA", "EN_AUTORIZACION_PADRES", "EN_EJECUCION"].includes(s.estado));
        const tareas = rol === "estudiante" ? await this.tareasPendientes() : [];
        cuerpo =
          this.tarjetaSolicitudes(activas) +
          (rol === "estudiante" ? this.tarjetaTareas(tareas) : "") +
          this.tarjetaAnuncios(anuncios) +
          this.tarjetaAccesos(rol);
      } else if (rol === "docente") {
        const [bandeja, proyectos] = await Promise.all([
          api("/solicitudes?bandeja=1"),
          api("/proyectos"),
        ]);
        const asesorados = proyectos.filter((p) => p.docenteAsesorId === this.usuario.usuarioId);
        cuerpo =
          this.tarjetaBandeja(bandeja, "Por revisar") +
          this.tarjetaProyectos(asesorados, "Proyectos que asesoras") +
          this.tarjetaAccesos(rol);
      } else if (["coordinacion", "administracion", "direccion", "promotor", "ti"].includes(rol)) {
        const [bandeja, indicadores] = await Promise.all([
          rol === "promotor" ? Promise.resolve([]) : api("/solicitudes?bandeja=1"),
          api("/indicadores"),
        ]);
        cuerpo =
          (rol === "promotor" ? "" : this.tarjetaBandeja(bandeja, rol === "direccion" ? "Aprobaciones pendientes" : "Bandeja")) +
          this.tarjetaIndicadores(indicadores) +
          this.tarjetaAccesos(rol);
      }
    } catch (e) {
      cuerpo = '<div class="tarjeta"><p>' + esc(e.message) + "</p></div>";
    }
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>' + esc(saludo) + "</h2><p>" + this.fechaBonita() + "</p></div>" +
      '<div class="rejilla-inicio">' + cuerpo + "</div>";
  },

  async tareasPendientes() {
    try {
      const proyectos = await api("/proyectos");
      const mias = proyectos.filter((p) => (p.equipo || []).some((m) => m.usuarioId === this.usuario.usuarioId));
      const tareas = [];
      for (const p of mias.slice(0, 5)) {
        const datos = await api("/proyectos/" + p.proyectoId);
        tareas.push(...datos.tareas.filter((t) => t.estado !== "HECHO").map((t) => ({ ...t, proyecto: p.nombre, proyectoId: p.proyectoId })));
      }
      return tareas.slice(0, 6);
    } catch (e) {
      return [];
    }
  },

  tarjetaSolicitudes(solicitudes) {
    return (
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Mis solicitudes activas</h3><a href="#/solicitudes">Ver todas</a></div>' +
      (solicitudes.length === 0
        ? vacio("No tienes solicitudes en curso. ¡Propón una iniciativa!")
        : solicitudes
            .map(
              (s) =>
                '<a class="fila-lista" href="#/solicitudes/' + s.solicitudId + '">' +
                semaforo(s.estado) +
                "<div><strong>" + esc(s.titulo) + "</strong><p>" + esc(nombreEstado(s.estado)) +
                (s.revisorActualRol ? " · " + esc(nombreRol(s.revisorActualRol)) : "") + "</p></div>" +
                badge(s.estado) + "</a>"
            )
            .join("")) +
      "</section>"
    );
  },

  tarjetaTareas(tareas) {
    return (
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Mis tareas</h3></div>' +
      (tareas.length === 0
        ? vacio("Sin tareas pendientes en tus proyectos")
        : tareas
            .map(
              (t) =>
                '<a class="fila-lista" href="#/proyectos/' + t.proyectoId + '"><div><strong>' + esc(t.titulo) + "</strong><p>" +
                esc(t.proyecto || "") + (t.vence ? " · vence " + fmtFecha(t.vence) : "") + "</p></div>" +
                badge(t.estado === "HECHO" ? "HECHO" : t.estado) + "</a>"
            )
            .join("")) +
      "</section>"
    );
  },

  tarjetaAnuncios(anuncios) {
    return (
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Anuncios sin leer</h3><a href="#/anuncios">Ver todos</a></div>' +
      (anuncios.length === 0
        ? vacio("Estás al día con los anuncios")
        : anuncios.slice(0, 5).map((a) => '<div class="fila-lista"><div><strong>' + esc(a.titulo) + "</strong><p>" + esc(a.categoria) + "</p></div>" + badge("PENDIENTE") + "</div>").join("")) +
      "</section>"
    );
  },

  tarjetaBandeja(solicitudes, titulo) {
    return (
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>' + esc(titulo) + " (" + solicitudes.length + ")</h3><a href=\"#/bandeja\">Abrir bandeja</a></div>" +
      (solicitudes.length === 0
        ? vacio("Tu bandeja está vacía")
        : solicitudes.slice(0, 5).map((s) => '<a class="fila-lista" href="#/solicitudes/' + s.solicitudId + '"><div><strong>' + esc(s.titulo) + "</strong><p>" + esc(s.solicitanteNombre || "") + " · " + esc(s.tipoNombre || "") + "</p></div>" + badge(s.estado) + "</a>").join("")) +
      "</section>"
    );
  },

  tarjetaProyectos(proyectos, titulo) {
    return (
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>' + esc(titulo) + "</h3><a href=\"#/proyectos\">Ver todos</a></div>" +
      (proyectos.length === 0 ? vacio("Sin proyectos") : proyectos.slice(0, 5).map((p) => '<a class="fila-lista" href="#/proyectos/' + p.proyectoId + '"><div><strong>' + esc(p.nombre) + "</strong><p>" + esc(p.categoria || "") + "</p></div>" + badge(p.estado) + "</a>").join("")) +
      "</section>"
    );
  },

  tarjetaIndicadores(ind) {
    const estados = Object.entries(ind.solicitudesPorEstado || {});
    const total = estados.reduce((a, [k, v]) => a + v, 0);
    return (
      '<section class="tarjeta col-span-2"><div class="tarjeta-encabezado"><h3>Resumen institucional</h3><a href="#/indicadores">Ver indicadores</a></div>' +
      '<div class="kpis"><div class="kpi"><strong>' + ind.tiempoPromedioRespuestaDias + '</strong><span>días promedio de respuesta</span></div>' +
      '<div class="kpi ' + (ind.vencidas > 0 ? "alarma" : "") + '"><strong>' + ind.vencidas + "</strong><span>solicitudes vencidas</span></div>" +
      '<div class="kpi"><strong>' + total + "</strong><span>solicitudes totales</span></div>" +
      '<div class="kpi"><strong>' + ind.tasaLecturaAnuncios + "%</strong><span>lectura de anuncios</span></div></div>" +
      (estados.length
        ? '<div class="barras">' + estados.map(([k, v]) => '<div class="barra-fila"><span>' + esc(nombreEstado(k)) + "</span><div class=\"barra-pista\"><div class=\"barra-relleno\" style=\"width:" + Math.min(100, (v * 100) / Math.max(1, total)) + '%"></div></div><b>' + v + "</b></div>").join("") + "</div>"
        : "") +
      "</section>"
    );
  },

  tarjetaAccesos(rol) {
    const botones = [];
    if (["estudiante", "docente", "coordinacion", "direccion", "administracion"].includes(rol)) {
      botones.push('<a class="btn primario" href="#/solicitudes/nueva">Nueva solicitud</a>');
    }
    if (rol === "estudiante") botones.push('<a class="btn" href="#/explorar">Explorar iniciativas</a>');
    botones.push('<a class="btn" href="#/perfil">¿A quién acudo?</a>');
    return '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Accesos rápidos</h3></div><div class="columna-botones">' + botones.join("") + "</div></section>";
  },

  fechaBonita() {
    const d = new Date();
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return dias[d.getDay()] + ", " + d.getDate() + " de " + ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"][d.getMonth()] + " de " + d.getFullYear();
  },

  async vistaNotificaciones(cont) {
    cont.innerHTML = cargando();
    const datos = await api("/notificaciones");
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Notificaciones</h2></div>' +
      '<div class="tarjeta">' +
      (datos.notificaciones.length === 0
        ? vacio("No tienes notificaciones")
        : '<div class="lista-notif">' +
          datos.notificaciones
            .map(
              (n) =>
                '<div class="notif ' + (n.leida ? "" : "no-leida") + '">' +
                '<div><strong>' + esc(n.titulo) + "</strong><p>" + esc(n.mensaje) + "</p><time>" + fmtFechaHora(n.creadoEn__id) + "</time></div>" +
                (n.leida ? "" : '<button class="btn chico" onclick="marcarNotificacion(\'' + esc(n.creadoEn__id) + '\', this)">Marcar leída</button>') +
                (n.enlace ? '<a class="btn chico" href="#' + esc(n.enlace) + '">Abrir</a>' : "") +
                "</div>"
            )
            .join("") +
          "</div>") +
      "</div>";
  },

  async vistaPerfil(cont) {
    const u = this.usuario;
    let insignias = 0;
    let finalizadas = 0;
    try {
      const solicitudes = await api("/solicitudes");
      finalizadas = solicitudes.filter((s) => s.estado === "FINALIZADA" || s.estado === "ARCHIVADA").length;
      const proyectos = await api("/proyectos");
      insignias = proyectos.filter((p) => (p.equipo || []).some((m) => m.usuarioId === u.usuarioId) && p.estado === "FINALIZADA").length;
    } catch (e) {}
    let directorio = "";
    try {
      const usuarios = await api("/usuarios");
      const grupos = {};
      usuarios.forEach((x) => {
        if (["docente", "coordinacion", "direccion", "administracion"].includes(x.rol)) {
          grupos[x.rol] = grupos[x.rol] || [];
          grupos[x.rol].push(x);
        }
      });
      directorio =
        '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>¿A quién acudo?</h3></div>' +
        Object.entries(gruposSafe(grupos)).map(([rol, lista]) =>
          '<div class="fila-lista"><div><strong>' + esc(nombreRol(rol)) + "</strong><p>" + lista.map((x) => esc(x.nombre)).join(", ") + "</p></div></div>"
        ).join("") +
        "<p class='nota'>Solicitudes → docente asesor y revisores · Logística → Administración · Permisos y salidas → Coordinación · Aprobación final → Dirección</p>" +
        "</section>";
    } catch (e) {}
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Mi perfil</h2></div>' +
      '<div class="rejilla-inicio">' +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Datos</h3></div>' +
      "<p><strong>" + esc(u.nombre) + "</strong><br>" + esc(u.email) + "<br>" + esc(nombreRol(u.rol)) +
      (u.nivel ? " · " + esc(u.nivel) + " " + esc(u.grado || "") + esc(u.seccion || "") : "") + "</p>" +
      '<p class="nota">Insignias ganadas: <strong>' + insignias + "</strong> · Actividades finalizadas: <strong>" + finalizadas + "</strong></p>" +
      '<button class="btn peligro" onclick="App.cerrarSesion()">Cerrar sesión</button></section>' +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Preferencias</h3></div>' +
      '<div class="fila-opcion"><span>Tema oscuro</span><button class="btn chico" onclick="App.cambiarTema()">Alternar</button></div>' +
      '<div class="fila-opcion"><span>Tamaño de letra</span><span><button class="btn chico" onclick="App.cambiarLetra(-1)">A-</button> <button class="btn chico" onclick="App.cambiarLetra(1)">A+</button></span></div>' +
      '<div class="fila-opcion"><span>Consentimiento de datos (Ley 29733)</span><input type="checkbox" id="chk-consentimiento" ' + (u.consentimientoDatos ? "checked" : "") + "></div>" +
      '<button class="btn" id="btn-pref-guardar">Guardar preferencias</button></section>' +
      '<section class="tarjeta"><div class="tarjeta-encabezado"><h3>Mis datos (derechos ARCO)</h3></div>' +
      '<p class="nota">Puedes revisar y exportar la información que la plataforma guarda sobre ti.</p>' +
      '<button class="btn" id="btn-exportar">Descargar mis datos</button></section>' +
      directorio +
      "</div>";
    $("#btn-pref-guardar").onclick = async () => {
      try {
        await api("/usuarios/" + u.usuarioId, {
          metodo: "PUT",
          cuerpo: { consentimientoDatos: $("#chk-consentimiento").checked },
        });
        toast("Preferencias guardadas");
      } catch (e) {
        toast(e.message, "error");
      }
    };
    $("#btn-exportar").onclick = () => {
      const blob = new Blob([JSON.stringify(u, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mis-datos-santa-anita-conecta.json";
      a.click();
    };
  },
};

function gruposSafe(g) {
  return g || {};
}

async function marcarNotificacion(id, boton) {
  try {
    await api("/notificaciones/" + encodeURIComponent(id) + "/leer", { metodo: "PUT" });
    boton?.remove();
    App.sonarCampana();
  } catch (e) {
    toast(e.message, "error");
  }
}
