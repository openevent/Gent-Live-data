import React, { useState } from "react";
import { Route, Switch } from "wouter";
import { DataProvider } from "./data/api.jsx";
import Nav from "./components/Nav.jsx";
import Footer from "./components/Footer.jsx";
import Welcome from "./components/Welcome.jsx";
import Home from "./pages/Home.jsx";
import Today from "./pages/Today.jsx";
import About from "./pages/About.jsx";
import { Tonight, Visiting, Events, MapPage } from "./pages/Placeholder.jsx";
import appCss from "./app-styles.js";

export default function App() {
  const [ready, setReady] = useState(false);

  return (
    <DataProvider>
      <style>{appCss}</style>
      <Welcome onDone={() => setReady(true)} />

      <div
        className="app"
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Nav />

        <Switch>
          <Route path="/" component={Home} />
          <Route path="/tonight" component={Tonight} />
          <Route path="/today" component={Today} />
          <Route path="/visiting" component={Visiting} />
          <Route path="/events" component={Events} />
          <Route path="/map" component={MapPage} />
          <Route path="/about" component={About} />
          {/* 404 → Home */}
          <Route><Home /></Route>
        </Switch>

        <Footer />
      </div>
    </DataProvider>
  );
}
