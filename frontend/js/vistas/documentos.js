App.vistas.documentos = {
  async lista(cont) {
    cont.innerHTML = cargando();
    const [items, usuario] = [await api("/documentos"), App.usuario];
    const tipos = ["", "PLANTILLA", "INFORME", "EVIDENCIA", "OTRO"];
    let filtro = "";
    cont.innerHTML =
      '<div class="encabezado-vista"><h2>Documentos</h2><button class="btn primario" id="btn-subir">Subir documento</button></div>' +
      '<div class="tabs">' +
      tipos.map((t) => '<button class="tab' + (t === "" ? " activa" : "") + '" data-tipo="' + t + '">' + (t ? nombreTipoDoc(t) : "Todos") + "</button>").join("") +
      "</div>" +
      '<div id="lista-documentos"></div>';
    const pintar = () => {
      const docs = filtro ? items.filter((d) => d.tipo === filtro) : items;
      $("#lista-documentos").innerHTML =
        docs.length === 0
          ? vacio("No hay documentos en esta sección")
          : '<div class="tarjeta lista">' +
            docs.map((d) => this.tarjetaDocumento(d, usuario)).join("") +
            "</div>";
      $$("[data-descargar]", cont).forEach((b) => {
        b.onclick = async () => {
          const d = items.find((x) => x.documentoId === b.dataset.descargar);
          try {
            if (d.archivoKey) {
              window.open(await urlDescarga(d.archivoKey), "_blank");
            } else if (d.contenido) {
              const blob = new Blob([d.contenido], { type: "text/plain" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = (d.nombre || "documento") + ".txt";
              a.click();
            } else {
              toast("Este documento no tiene archivo", "error");
            }
          } catch (e) {
            toast(e.message, "error");
          }
        };
      });
      $$("[data-borrar]", cont).forEach((b) => {
        b.onclick = async () => {
          const seguro = await confirmar("¿Eliminar este documento?");
          if (!seguro) return;
          try {
            await api("/documentos/" + b.dataset.borrar, { metodo: "DELETE" });
            toast("Documento eliminado");
            this.lista(cont);
          } catch (e) {
            toast(e.message, "error");
          }
        };
      });
    };
    $$(".tab", cont).forEach((b) => {
      b.onclick = () => {
        $$(".tab", cont).forEach((x) => x.classList.remove("activa"));
        b.classList.add("activa");
        filtro = b.dataset.tipo;
        pintar();
      };
    });
    pintar();
    $("#btn-subir").onclick = () => this.subir(cont, usuario);
  },

  tarjetaDocumento(d, usuario) {
    const puedeBorrar = d.creadoPor === usuario.usuarioId || ["ti", "direccion"].includes(usuario.rol);
    return (
      '<div class="fila-lista doc-fila">' +
      '<span class="doc-icono">' + (d.tipo === "PLANTILLA" ? "P" : d.tipo === "EVIDENCIA" ? "E" : "D") + "</span>" +
      '<div class="fila-principal"><strong>' + esc(d.nombre) + "</strong>" +
      "<p>" + nombreTipoDoc(d.tipo) + (d.categoria ? " · " + esc(d.categoria) : "") + " · " + esc(d.creadoPorNombre || "") + " · " + fmtFechaHora(d.creadoEn) + "</p>" +
      (d.descripcion ? '<p class="nota">' + esc(d.descripcion) + "</p>" : "") +
      (d.contenido && !d.archivoKey ? '<p class="nota">Plantilla de texto descargable</p>' : "") +
      "</div>" +
      '<div class="columna-botones">' +
      '<button class="btn chico" data-descargar="' + d.documentoId + '">Descargar</button>' +
      (puedeBorrar ? '<button class="btn chico peligro" data-borrar="' + d.documentoId + '">Eliminar</button>' : "") +
      "</div></div>"
    );
  },

  subir(cont, usuario) {
    abrirModal(
      "Subir documento",
      '<label class="campo"><span>Nombre</span><input id="doc-nombre"></label>' +
      '<div class="fila">' +
      '<label class="campo"><span>Tipo</span><select id="doc-tipo">' +
      ["INFORME", "EVIDENCIA", "OTRO"].map((t) => "<option value='" + t + "'>" + nombreTipoDoc(t) + "</option>").join("") +
      (["ti", "direccion"].includes(usuario.rol) ? "<option value='PLANTILLA'>Plantilla institucional</option>" : "") +
      "</select></label>" +
      '<label class="campo"><span>Categoría</span><input id="doc-categoria" placeholder="Formatos, informes…"></label>' +
      "</div>" +
      '<label class="campo"><span>Descripción</span><input id="doc-desc"></label>' +
      '<label class="campo"><span>Archivo</span><input type="file" id="doc-archivo"></label>' +
      '<p class="nota">Sube el archivo o, si es una plantilla corta, puedes escribir su contenido y guardar sin archivo.</p>' +
      '<label class="campo"><span>Contenido (para plantillas de texto)</span><textarea id="doc-contenido" rows="3"></textarea></label>',
      '<button class="btn" onclick="cerrarModal()">Cancelar</button><button class="btn primario" id="doc-guardar">Guardar</button>'
    );
    $("#doc-guardar").onclick = async () => {
      const nombre = $("#doc-nombre").value.trim();
      if (!nombre) {
        toast("El nombre es obligatorio", "error");
        return;
      }
      const archivo = $("#doc-archivo").files[0];
      let archivoKey = "";
      if (archivo) {
        try {
          toast("Subiendo " + archivo.name + "…");
          archivoKey = await subirArchivo(archivo);
        } catch (e) {
          toast(e.message, "error");
          return;
        }
      }
      try {
        await api("/documentos", {
          metodo: "POST",
          cuerpo: {
            nombre,
            tipo: $("#doc-tipo").value,
            categoria: $("#doc-categoria").value,
            descripcion: $("#doc-desc").value,
            archivoKey,
            contenido: $("#doc-contenido").value,
          },
        });
        cerrarModal();
        toast("Documento guardado");
        this.lista(cont);
      } catch (e) {
        toast(e.message, "error");
      }
    };
  },
};

function nombreTipoDoc(tipo) {
  return { PLANTILLA: "Plantilla", INFORME: "Informe", EVIDENCIA: "Evidencia", OTRO: "Otro" }[tipo] || tipo;
}
