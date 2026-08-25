import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import store from "./store/store"
import App from "./App"
import "./index.css"

console.log("[v0] Store in index.jsx:", store)

if (!store) {
  console.error("[v0] Store is null or undefined!")
  throw new Error("Redux store is not available")
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
)
