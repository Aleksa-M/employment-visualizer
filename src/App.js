import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/home';
import { About } from './pages/about';
import { Indigenous } from './pages/indigenous';
import { Immigrants } from './pages/immigrants';
import { Women } from './pages/women';
import { Disability } from './pages/disability';

// app component
function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/indigenous" element={<Indigenous />} />
      <Route path="/immigrants" element={<Immigrants />} />
      <Route path="/women" element={<Women />} />
      <Route path="/disability" element={<Disability />} />
    </Routes>
  );
}

export default App;