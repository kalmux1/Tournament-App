import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { AuthProvider } from "./context/AuthContext"
import { DataProvider } from "./context/DataContext"
import "./index.css"

ReactDOM.createRoot(getElementByIdOrThrow("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

function getElementByIdOrThrow(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Root element with id '${id}' not found`)
  return el
}
