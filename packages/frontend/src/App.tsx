import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/joy';
import Layout from './components/Layout';
import Home from './pages/Home';
import PoliticianList from './pages/PoliticianList';
import PoliticianDetail from './pages/PoliticianDetail';

function App() {
  return (
    <Router>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.body',
        }}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/politicians" element={<PoliticianList />} />
            <Route path="/politicians/:id" element={<PoliticianDetail />} />
          </Routes>
        </Layout>
      </Box>
    </Router>
  );
}

export default App; 