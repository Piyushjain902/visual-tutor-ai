import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simulation Registry
 * Defines all available physics simulations for the Visual Tutor AI platform
 * Each simulation includes metadata, learning goals, and prompt hints
 */

// Load simulation knowledge files
let faradayKnowledge = null;
try {
  const knowledgePath = join(__dirname, 'simulation-knowledge', 'faraday-knowledge.json');
  faradayKnowledge = JSON.parse(readFileSync(knowledgePath, 'utf-8'));
  console.log('✓ Loaded Faraday simulation knowledge');
} catch (err) {
  console.warn('⚠ Could not load Faraday knowledge file:', err.message);
}

const SIMULATIONS = {
  faraday: {
    id: 'faraday',
    title: 'Electromagnetic Induction (Faraday\'s Law)',
    description: 'Interactive exploration of electromagnetic induction using a coil, magnet, and voltmeter. Investigate how changing magnetic flux through a conductor induces an electromotive force (EMF) and demonstrates Lenz\'s Law.',
    url: '/phet/faradays-law_en.html',
    keywords: [
      'electromagnetic induction',
      'faraday\'s law',
      'faradays law',
      'induced emf',
      'magnetic flux',
      'lenz\'s law',
      'lenzs law',
      'coil',
      'voltmeter',
      'flux change'
    ],
    parameters: [
      { name: 'magnet_position', type: 'distance', unit: 'units' },
      { name: 'magnet_velocity', type: 'velocity', unit: 'units/s' },
      { name: 'magnetic_flux', type: 'flux', unit: 'Wb' },
      { name: 'induced_emf', type: 'voltage', unit: 'V' }
    ],
    learningGoal: 'Understand electromagnetic induction by analyzing how changing magnetic flux through a coil induces an electromotive force (EMF), and verify Lenz\'s Law through observation of induced current direction based on the direction of flux change.',
    promptHint: 'Guide systematic investigation of electromagnetic induction by manipulating magnet position and velocity. Connect observations to Faraday\'s law (ε = -dΦ/dt) and Lenz\'s Law (induced EMF opposes the change in flux). Have students predict EMF direction and magnitude before observing.',
    guidedSteps: [
      "Keep the magnet stationary near the coil and observe that the voltmeter reads zero. Notice that the magnetic flux through the coil is constant, so no EMF is induced.",
      "Now move the magnet toward the coil and observe the voltmeter deflect. As the magnetic flux increases with time, an EMF appears in the circuit.",
      "Pull the magnet away from the coil and watch the deflection reverse. This happens because the magnetic flux is now decreasing, causing the induced EMF to reverse direction in accordance with Lenz's Law.",
      "Try increasing the speed of the magnet's motion. You should observe a larger deflection, since a faster change in magnetic flux produces a greater induced EMF."
    ]
  }
};

/**
 * Get simulation by ID
 * @param {string} id - Simulation ID
 * @returns {Object|null} Simulation object or null if not found
 */
function getSimulationById(id) {
  if (!id) return null;
  // Try direct match first
  if (SIMULATIONS[id]) return SIMULATIONS[id];
  // Try normalized match (faradays-law -> faraday)
  const normalized = id.toLowerCase().replace(/-law$/, '').replace('faradays', 'faraday');
  return SIMULATIONS[normalized] || null;
}

/**
 * Get all simulations
 * @returns {Object} All registered simulations
 */
function getAllSimulations() {
  return SIMULATIONS;
}

/**
 * Detect simulation from user message
 * Performs keyword-based matching to find relevant simulation
 * @param {string} message - User message
 * @returns {Object|null} Matched simulation or null
 */
function detectSimulation(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const lowerMessage = message.toLowerCase();

  // Search through all simulations for keyword matches
  for (const [key, simulation] of Object.entries(SIMULATIONS)) {
    for (const keyword of simulation.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return simulation;
      }
    }
  }

  return null;
}

/**
 * Get simulation knowledge (deep knowledge base for AI responses)
 * @param {string} simulationId - The simulation ID
 * @returns {Object|null} Knowledge object or null
 */
function getSimulationKnowledge(simulationId) {
  if (simulationId === 'faraday') {
    return faradayKnowledge;
  }
  return null;
}

/**
 * Build a condensed knowledge context for AI prompts
 * @param {string} simulationId - The simulation ID
 * @returns {string} Formatted knowledge string for AI context
 */
function buildKnowledgeContext(simulationId) {
  const knowledge = getSimulationKnowledge(simulationId);
  if (!knowledge) return '';

  let context = `\n=== SIMULATION DEEP KNOWLEDGE ===\n`;
  
  // Physics Background
  context += `\nPHYSICS PRINCIPLES:\n`;
  context += `• Faraday's Law: ${knowledge.overview.physicsBackground.faradaysLaw.statement}\n`;
  context += `• Equation: ${knowledge.overview.physicsBackground.faradaysLaw.equation}\n`;
  context += `• Lenz's Law: ${knowledge.overview.physicsBackground.lenzsLaw.statement}\n`;
  
  // Components
  context += `\nSIMULATION COMPONENTS:\n`;
  for (const [key, comp] of Object.entries(knowledge.components)) {
    context += `• ${comp.name}: ${comp.role}\n`;
  }
  
  // Cause-Effect Relationships (key for answering questions)
  context += `\nCAUSE-EFFECT RELATIONSHIPS:\n`;
  for (const [key, rel] of Object.entries(knowledge.causeEffectRelationships)) {
    context += `• ${rel.action} → ${rel.effect}\n`;
  }
  
  // Expected Observations
  context += `\nEXPECTED OBSERVATIONS:\n`;
  for (const [key, obs] of Object.entries(knowledge.expectedObservations)) {
    context += `• ${obs.setup}: ${obs.observation}\n`;
  }
  
  // Common Misconceptions
  context += `\nCOMMON MISCONCEPTIONS TO CORRECT:\n`;
  for (const [key, mis] of Object.entries(knowledge.commonMisconceptions)) {
    context += `• Wrong: "${mis.wrong}" → Correct: "${mis.correct}"\n`;
  }
  
  // Conceptual Q&A (pre-loaded answers)
  context += `\nCONCEPTUAL Q&A (use these for accurate answers):\n`;
  for (const [key, qa] of Object.entries(knowledge.conceptualQA)) {
    context += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
  }
  
  // Real-world applications
  context += `\nREAL-WORLD APPLICATIONS:\n`;
  for (const [key, app] of Object.entries(knowledge.realWorldApplications)) {
    context += `• ${key}: ${app.description}\n`;
  }
  
  return context;
}

export { SIMULATIONS, getSimulationById, getAllSimulations, detectSimulation, getSimulationKnowledge, buildKnowledgeContext };
