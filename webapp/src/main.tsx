import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { CapabilitiesProvider } from "@/components/capabilities";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <CapabilitiesProvider><App /></CapabilitiesProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
// build 20260721115406
