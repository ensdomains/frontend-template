import { Route, Routes } from 'react-router-dom'

import { HomeScreen } from './screens/Home'
import { InputScreen } from './screens/Input'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/input" element={<InputScreen />} />
    </Routes>
  )
}

export default App
