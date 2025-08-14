import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { inject } from '@vercel/analytics';

// Inject Vercel Analytics
inject();


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);
