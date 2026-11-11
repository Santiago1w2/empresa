import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api, valorQr } from "../api";
import { Boton, Cargando, Campo, Encabezado, Pantalla, colores, estilos } from "../componentes/basicos";
import { Selector } from "../componentes/selector";
import { fmtFecha, hoyISO, isoDe, nombreTipoDoc } from "../util";

const NOMBRE_TIPO = { evento: "Actividad", anuncio: "Anuncio", documento: "Material" };

export default function GenerarQr({ navigation, route }) {
  const [tipo, setTipo] = useState(route.params?.tipo || "evento");
  const [opciones, setOpciones] = useState([]);
  const [refId, setRefId] = useState("");
  const [expiraEn, setExpira] = useState("");
  const [cargandoOpciones, setCargando] = useState(false);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const cargarOpciones = async () => {
      setCargando(true);
      setRefId("");
      setQr(null);
      try {
        if (tipo === "evento") {
          const hoy = new Date();
          const fin = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
          const datos = await api(
            "/eventos?desde=" + hoyISO() + "&hasta=" + isoDe(fin) + "&capas=ACTIVIDAD,REUNION,INSTITUCIONAL,CLASE,EVALUACION,FERIADO"
          );
          setOpciones(datos.map((e) => ({ valor: e.eventoId, etiqueta: e.titulo + (e.fecha ? " · " + fmtFecha(e.fecha) : "") })));
        } else if (tipo === "anuncio") {
          const datos = await api("/anuncios");
          setOpciones(datos.map((a) => ({ valor: a.anuncioId, etiqueta: a.titulo })));
        } else {
          const datos = await api("/documentos");
          setOpciones(datos.map((d) => ({ valor: d.documentoId, etiqueta: d.nombre + " · " + nombreTipoDoc(d.tipo) })));
        }
      } catch (e) {
        setError(e.message);
        setOpciones([]);
      }
      setCargando(false);
    };
    cargarOpciones();
  }, [tipo]);

  const crear = async () => {
    if (!refId) {
      setError("Elige el contenido a compartir");
      return;
    }
    setCreando(true);
    setError("");
    try {
      const mios = await api("/qrs");
      const existente = mios.find((q) => q.tipo === tipo && q.refId === refId && !q.expiraEn);
      if (existente && !expiraEn) {
        setQr(existente);
      } else {
        setQr(await api("/qrs", { metodo: "POST", cuerpo: { tipo, refId, expiraEn } }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  };

  if (cargandoOpciones && !qr) return <Cargando />;

  return (
    <Pantalla>
      <Encabezado titulo="Nuevo código QR" sub="Comparte con la comunidad del colegio" />
      {qr ? (
        <>
          <View style={[estilos.tarjeta, { alignItems: "center" }]}>
            <Text style={estilos.filaTitulo}>{qr.titulo}</Text>
            <View style={estilosGen.marco}>
              <QRCode value={valorQr(qr.codigo)} size={230} color={colores.texto} backgroundColor="#fff" />
            </View>
            <Text style={estilosGen.codigo}>{qr.codigo}</Text>
            <Text style={estilos.nota}>
              {NOMBRE_TIPO[qr.tipo]}
              {qr.expiraEn ? " · expira " + fmtFecha(qr.expiraEn) : ""}
            </Text>
            <Text style={[estilos.nota, { textAlign: "center" }]}>
              Muestra este código para que otros lo escaneen con la app móvil.
            </Text>
            <Boton titulo="Ver mis códigos" estilo={{ marginTop: 12, alignSelf: "stretch" }} alPresionar={() => navigation.navigate("MisQrs")} />
            <Boton titulo="Generar otro" estilo={{ marginTop: 10, alignSelf: "stretch" }} alPresionar={() => setQr(null)} />
          </View>
        </>
      ) : (
        <View style={estilos.tarjeta}>
          {error ? <Text style={[estilos.nota, { color: colores.peligro }]}>{error}</Text> : null}
          <Selector
            etiqueta="Qué vas a compartir"
            valor={tipo}
            alCambiar={setTipo}
            opciones={[
              { valor: "evento", etiqueta: "Actividad (entrada con registro)" },
              { valor: "anuncio", etiqueta: "Anuncio" },
              { valor: "documento", etiqueta: "Material o documento" },
            ]}
          />
          <Selector
            etiqueta="Contenido"
            valor={refId}
            alCambiar={setRefId}
            marcador={cargandoOpciones ? "Cargando…" : "Selecciona…"}
            opciones={opciones}
          />
          <Campo etiqueta="Expira (opcional)">
            <Selector
              etiqueta=""
              valor={expiraEn}
              alCambiar={setExpira}
              marcador="Sin expiración"
              opciones={vencimientos()}
            />
          </Campo>
          <Text style={estilos.nota}>
            Para actividades, quienes escaneen el código podrán registrar su entrada. Para anuncios y materiales, el
            código los lleva directo al contenido.
          </Text>
          <Boton titulo={creando ? "Generando…" : "Generar código"} primario deshabilitado={creando} estilo={{ marginTop: 12 }} alPresionar={crear} />
        </View>
      )}
    </Pantalla>
  );
}

function vencimientos() {
  const lista = [{ valor: "", etiqueta: "Sin expiración" }];
  const hoy = new Date();
  [1, 7, 30].forEach((dias) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
    lista.push({ valor: isoDe(d), etiqueta: fmtFecha(isoDe(d)) });
  });
  return lista;
}

const estilosGen = StyleSheet.create({
  marco: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginTop: 10 },
  codigo: { fontFamily: "monospace", fontSize: 15, letterSpacing: 1, color: colores.texto, marginTop: 8 },
});
