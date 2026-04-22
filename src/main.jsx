import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import GhentOps from './GhentOps.jsx'
import Welcome from './Welcome.jsx'

function App() {
  const [ready, setReady] = useState(false);
  return (
    <>
      <Welcome onDone={() => setReady(true)} />
      <div
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <GhentOps />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
