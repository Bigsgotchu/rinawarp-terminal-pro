import { useState } from 'react'
import { ChatScreen } from './components/ChatScreen'

function App() {
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)

  const handleResumeFix = () => {
    console.log('Resume fix triggered')
    // Could show execution timeline here
  }

  const handleViewDetails = () => {
    setShowDetailsDrawer(true)
  }

  return (
    <ChatScreen onResumeFix={handleResumeFix} onViewDetails={handleViewDetails} showDetailsDrawer={showDetailsDrawer} />
  )
}

export default App
