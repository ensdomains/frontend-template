import { Route, Routes } from 'react-router-dom'

import { HomeScreen } from './screens/Home'
import { InputScreen } from './screens/Input'
import { ProfileScreen } from './screens/Profile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/input" element={<InputScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
    </Routes>
  )
}

export default App
