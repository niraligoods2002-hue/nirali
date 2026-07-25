import React from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "../components/admin/AdminApp.jsx";
import "../styles/admin.css";

const root = document.getElementById("admin-root");
if (root) {
  createRoot(root).render(<AdminApp />);
}
