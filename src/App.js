import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/home';
import { About } from './pages/about';
import { Indigenous } from './pages/indigenous';
import { AnalysisIndex} from './pages/AnalysisIndex'
import { CanadaMap } from './pages/canadaMap';

// app
function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/indigenous" element={<Indigenous />} />
      <Route path="/AnalysisIndex" element={<AnalysisIndex />} />
      <Route path="/canada-map" element={<CanadaMap />} />
    </Routes>
  );
}
export default App;