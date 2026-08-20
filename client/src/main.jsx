import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SSEProvider, FormatTypesProvider } from "./store.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SSEProvider>
        <FormatTypesProvider>
          <App />
        </FormatTypesProvider>
      </SSEProvider>
    </BrowserRouter>
  </React.StrictMode>
);
