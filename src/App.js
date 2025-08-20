import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/home';
import { About } from './pages/about';
import { Indigenous } from './pages/indigenous';
import { Immigrants } from './pages/immigrants';
import { Women } from './pages/women';
import { Disability } from './pages/disability';
import { AnalysisIndex } from './pages/AnalysisIndex';
import { PrimerTemp } from './pages/PrimerTemp';

// app component
function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/analysis-index/indigenous" element={<Indigenous />} />
      <Route path="/analysis-index/immigrants" element={<Immigrants />} />
      <Route path="/analysis-index/women" element={<Women />} />
      <Route path="/analysis-index/disability" element={<Disability />} />
      <Route path="/analysis-index" element={<AnalysisIndex />} />
      <Route path="/primer-temp" element={<PrimerTemp />} />
    </Routes>
  );
}

export default App;