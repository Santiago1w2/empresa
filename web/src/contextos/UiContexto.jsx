import { createContext, useCallback, useContext, useRef, useState } from "react";

const UiContexto = createContext(null);

function EntradaTexto({ inicial, alCambiar }) {
  const [valor, setValor] = useState(inicial || "");
  return (
    <label className="campo">
      <textarea
        rows="4"
        value={valor}
        autoFocus
        onChange={(e) => {
          setValor(e.target.value);
          alCambiar(e.target.value);
        }}
      />
    </label>
  );
}

export function UiProveedor({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const contador = useRef(0);

  const toast = useCallback((mensaje, tipo) => {
    contador.current += 1;
    const id = contador.current;
    setToasts((t) => [...t, { id, mensaje, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const cerrarModal = useCallback(() => setModal(null), []);

  const abrirModal = useCallback((titulo, cuerpo, pie) => {
    setModal({ titulo, cuerpo, pie });
  }, []);

  const confirmar = useCallback(
    (mensaje) =>
      new Promise((resolver) => {
        const decidir = (valor) => {
          setModal(null);
          resolver(valor);
        };
        setModal({
          titulo: "Confirmar",
          cuerpo: <p>{mensaje}</p>,
          pie: (
            <>
              <button className="btn" onClick={() => decidir(false)}>
                Cancelar
              </button>
              <button className="btn primario" onClick={() => decidir(true)}>
                Aceptar
              </button>
            </>
          ),
        });
      }),
    []
  );

  const promptTexto = useCallback(
    (titulo, etiqueta, valorInicial = "") =>
      new Promise((resolver) => {
        const caja = { valor: valorInicial || "" };
        const decidir = (valor) => {
          setModal(null);
          resolver(valor);
        };
        setModal({
          titulo,
          cuerpo: (
            <label className="campo">
              <span>{etiqueta}</span>
              <EntradaTexto inicial={valorInicial} alCambiar={(v) => (caja.valor = v)} />
            </label>
          ),
          pie: (
            <>
              <button className="btn" onClick={() => decidir(null)}>
                Cancelar
              </button>
              <button className="btn primario" onClick={() => decidir(caja.valor)}>
                Aceptar
              </button>
            </>
          ),
        });
      }),
    []
  );

  return (
    <UiContexto.Provider value={{ toast, abrirModal, cerrarModal, confirmar, promptTexto }}>
      {children}
      {modal && (
        <div className="modal-fondo" onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-caja">
            <div className="modal-titulo">
              <h3>{modal.titulo}</h3>
              <button className="modal-x" onClick={cerrarModal}>&times;</button>
            </div>
            <div className="modal-cuerpo">{modal.cuerpo}</div>
            {modal.pie && <div className="modal-pie">{modal.pie}</div>}
          </div>
        </div>
      )}
      <div id="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={"toast visible " + (t.tipo || "exito")}>
            {t.mensaje}
          </div>
        ))}
      </div>
    </UiContexto.Provider>
  );
}

export function useUi() {
  return useContext(UiContexto);
}
