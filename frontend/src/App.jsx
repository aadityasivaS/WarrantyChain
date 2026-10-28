import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './Dashboard'
import PublicVerification from './routes/PublicVerification'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/verify/:tokenId" element={<PublicVerification />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
