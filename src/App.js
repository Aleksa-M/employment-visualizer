import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/home';
import { About } from './pages/about';
import { Indigenous } from './pages/indigenous';
import { AnalysisIndex } from './pages/AnalysisIndex'
import { PrimerTemp } from './pages/PrimerTemp'
import { Map } from './pages/Map'
import CanadaMap from './pages/CanadaMap';

// app
function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/indigenous" element={<Indigenous />} />
      <Route path="/AnalysisIndex" element={<AnalysisIndex />} />
      <Route path="/PrimerTemp" element={<PrimerTemp />} />
      <Route path="/Map" element={<CanadaMap />} />
    </Routes>
  );
}

export default App;