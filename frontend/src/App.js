import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/home';
import { About } from './pages/about';
import { Indigenous } from './pages/indigenous';
import { AnalysisIndex} from './pages/AnalysisIndex'

function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/indigenous" element={<Indigenous />} />
      <Route path="/AnalysisIndex" element={<AnalysisIndex />} />
    </Routes>
  );
}



export default App;

import React, { useState } from "react";
import CanadaMap from "./CanadaMap";

function App() {
  const [selectedProvince, setSelectedProvince] = useState(null);

  const handleProvinceClick = (provinceCode) => {
    setSelectedProvince(provinceCode);
    console.log("Clicked:", provinceCode);
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>Canada Map</h1>
      <CanadaMap onProvinceClick={handleProvinceClick} />
      {selectedProvince && (
        <h2>You clicked: {selectedProvince}</h2>
      )}
    </div>
  );
}

export default App;