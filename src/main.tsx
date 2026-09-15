import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { AuthProvider } from "./context/AuthContext"
import "./index.css"

ReactDOM.createRoot(getElementByIdOrThrow("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

function getElementByIdOrThrow(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Root element with id '${id}' not found`)
  return el
}
