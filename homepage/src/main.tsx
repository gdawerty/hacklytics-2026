import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AegisHomepage from "./pages/AegisHomepage";
import "./styles.css";

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0B0B0B", color: "#fff" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ opacity: 0.65 }}>Preview route placeholder</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AegisHomepage />} />
        <Route path="/dashboard" element={<Placeholder title="Model Route (/dashboard)" />} />
        <Route path="/about" element={<Placeholder title="About Route (/about)" />} />
        <Route path="/contact" element={<Placeholder title="Contact Route (/contact)" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
