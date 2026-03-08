import React, { useState, useRef, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import SimulationPanel from './components/SimulationPanel';
import './App.css';

function App() {
  const [messages, setMessages] = useState([])
  const [simulationActive, setSimulationActive] = useState(false)
  const [activeSimulation, setActiveSimulation] = useState(null)
  const [chatPanelWidth, setChatPanelWidth] = useState(null) // Will be set to 40% on mount
  const [learningState, setLearningState] = useState({
    activeSimulation: null,
    guidedMode: false,
    currentStepIndex: 0,
    completedSteps: []
  })
  const containerRef = useRef(null)
  const isResizing = useRef(false)

  useEffect(() => {
    // Set initial chat panel width to 40% of container
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const initialWidth = containerWidth * 0.4
      setChatPanelWidth(initialWidth)
    }

    const handleMouseMove = (e) => {
      if (!isResizing.current || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left - 20 // Account for padding

      // Set min and max widths
      const minWidth = 300
      const maxWidth = container.clientWidth * 0.6

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      isResizing.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleMouseDown = (e) => {
    e.preventDefault()
    isResizing.current = true
  }

  // Called when user sends a message
  const handleSendMessage = (userMessage, response, detectedSimulation) => {
    setMessages([...messages, { type: 'user', content: userMessage }, { type: 'bot', content: response }])
    
    // Always activate simulation panel when user asks a question
    setSimulationActive(true)
    
    // Set active simulation if detected, otherwise leave as null (shows "not available")
    if (detectedSimulation) {
      setActiveSimulation(detectedSimulation)
      setLearningState(prev => ({
        ...prev,
        activeSimulation: detectedSimulation.id,
        guidedMode: true
      }))
    } else {
      setActiveSimulation(null)
    }
  }

  // Handle reflection question answers
  const handleReflectionAnswer = (evaluation, answerData) => {
    // Add the evaluation response as a bot message
    if (evaluation) {
      setMessages(prev => [...prev, { type: 'bot', content: evaluation }])
    }
  }

  return (
    <div className="app-container" ref={containerRef}>
      {chatPanelWidth && (
        <>
          <div className="panel chat-panel" style={{ width: `${chatPanelWidth}px` }}>
            <ChatPanel
              onSendMessage={handleSendMessage}
              onReflectionAnswer={handleReflectionAnswer}
              messages={messages}
            />
          </div>
          <div
            className="resize-divider"
            onMouseDown={handleMouseDown}
            title="Drag to resize panels"
          />
          <div className="panel simulation-panel">
            <SimulationPanel active={simulationActive} simulation={activeSimulation} />
          </div>
        </>
      )}
    </div>
  )
}

export default App
