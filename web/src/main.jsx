import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SesionProveedor } from "./contextos/SesionContexto";
import { UiProveedor } from "./contextos/UiContexto";
import "./estilos.css";
import "./qr.css";

ReactDOM.createRoot(document.getElementById("raiz")).render(
  <React.StrictMode>
    <SesionProveedor>
      <UiProveedor>
        <App />
      </UiProveedor>
    </SesionProveedor>
  </React.StrictMode>
);
