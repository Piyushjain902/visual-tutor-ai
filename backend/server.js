import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { detectSimulation, getSimulationById, buildKnowledgeContext } from './simulations.js'

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const REGION = process.env.AWS_REGION || 'ap-south-1';
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const MAX_HISTORY_EXCHANGES = 10; // Limit conversation history to prevent token explosion

// ============================================================================
// BEDROCK CLIENT
// ============================================================================

let bedrockClient = null;
try {
  bedrockClient = new BedrockRuntimeClient({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    }
  });
  console.log('✓ Bedrock client initialized');
} catch (err) {
  console.error('✗ Failed to initialize Bedrock client:', err.message);
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint for Elastic Beanstalk
app.get('/', (req, res) => {
  res.status(200).send('Visual Tutor AI Backend is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// SESSION STORAGE
// ============================================================================

/**
 * Enhanced session structure with learning state tracking
 * @typedef {Object} Session
 * @property {Array} messages - Conversation history
 * @property {Object} learningState - Learning-specific state
 * @property {string|null} learningState.activeSimulation - Currently active simulation ID
 * @property {boolean} learningState.guidedMode - Whether guided mode is active
 * @property {number} learningState.lastUpdated - Timestamp of last interaction
 */

const conversationSessions = new Map();

/**
 * Get or create a session
 * @param {string} sessionId - Unique session identifier
 * @returns {Object} Session object
 */
function getOrCreateSession(sessionId) {
  if (!conversationSessions.has(sessionId)) {
    conversationSessions.set(sessionId, {
      messages: [],
      learningState: {
        activeSimulation: null,
        guidedMode: false,
        lastUpdated: Date.now()
      }
    });
  }
  return conversationSessions.get(sessionId);
}

/**
 * Limit conversation history to prevent token explosion
 * Keeps only the most recent exchanges
 * @param {Array} messages - Full message history
 * @returns {Array} Trimmed history (last N exchanges)
 */
function limitHistory(messages) {
  const maxMessages = MAX_HISTORY_EXCHANGES * 2; // Each exchange = user + bot message
  if (messages.length <= maxMessages) {
    return messages;
  }
  return messages.slice(-maxMessages);
}

/**
 * Detect simple greeting/small-talk messages
 * @param {string} message - User message
 * @returns {boolean}
 */
function isGreetingMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const normalized = message.trim().toLowerCase();
  return /^(hi|hii|hello|hey|yo|sup|hola|good morning|good afternoon|good evening)$/.test(normalized);
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build system prompt based on context
 * General concept tutor prompt
 * @param {Object} simulationData - Detected simulation or null
 * @param {boolean} guidedMode - Whether guided learning is enabled
 * @returns {string} System prompt
 */
function buildSystemPrompt(simulationData, guidedMode) {
  // Add timestamp for variation
  const variationSeed = Date.now();
  
  // If NO simulation detected - simple explanation only
  if (!simulationData) {
    return `You are a smart tutor and explainer for general concepts. RESPOND WITH ONLY A JSON OBJECT - NO MARKDOWN, NO CODE BLOCKS, NO EXTRA TEXT.

Your response MUST have ONLY this field:
1. "explanation" - Clear, concise explanation of the concept.

EXPLANATION STYLE:
- Explain like ChatGPT: direct, clear, and specific.
- Use short paragraphs with blank lines between them.
- No fluff, no repetition.
- Use plain language suitable for learners.
- Do not use formulas, symbols, or markdown.
- Generate FRESH explanations each time - vary examples, analogies, and emphasis.

Variation seed: ${variationSeed}

STRICT JSON FORMAT:
{
  "explanation": "Paragraph 1 explaining the concept.\\n\\nParagraph 2 with more details.\\n\\nParagraph 3 with examples or applications."
}

RULES:
- ONLY return the explanation field, nothing else
- NO guided_steps field
- NO reflection_question field
- ALWAYS valid JSON only
- Stay on the student's asked topic
- Use DIFFERENT examples and analogies each time`;
  }

  // If simulation IS detected - include guided steps for the simulation
  let prompt = `You are a smart tutor helping students learn through interactive simulations. RESPOND WITH ONLY A JSON OBJECT - NO MARKDOWN, NO CODE BLOCKS, NO EXTRA TEXT.

CRITICAL: Every response MUST have EXACTLY these three fields:
1. "explanation" - Concise explanation in short line blocks.
2. "guided_steps" - Array of exactly 4 strings (steps to explore the simulation).
3. "reflection_question" - One thought-provoking question about the simulation.

CONVERSATIONAL MEMORY (IMPORTANT):
- You will see your previous responses including "My explanation:", "Guided steps I provided:", and "Quick Question I asked:"
- The "Quick Question" is the reflection/thought question you asked the student - remember it!
- If the user answers your Quick Question, acknowledge their answer, evaluate it, and provide feedback
- If the user says "I don't understand step 2" or "explain step 3 again", refer back to the specific step you gave them
- When user references a step number, look at "Guided steps I provided" to find what that step was
- Be a helpful, continuous conversation partner who remembers context

HANDLING USER REFERENCES TO STEPS:
- User says "I don't get step 1" → Find Step 1 from your previous guided steps, explain it differently
- User says "step 2 isn't working" → Reference the specific step and troubleshoot
- User asks about something in a step → Elaborate on that specific step

HANDLING QUICK QUESTION ANSWERS (VERY IMPORTANT):
- The "Quick Question" appears in the UI as "A quick question" - users will answer it directly
- When user's message seems like an answer to your question, START your explanation with acknowledgment like "Great thinking!" then evaluate their answer
- User provides an answer → Evaluate if correct, provide encouragement or gentle correction
- User says "I don't know" → Start with "No worries! You asked about [topic]. Here's a hint..." 
- ALWAYS acknowledge you asked that specific question when responding to their answer
- Build on their answer to deepen understanding

DETECTING QUICK QUESTION RESPONSES (CRITICAL):
- Look at "Quick Question I asked the student:" in your previous response
- If user's next message is short OR says "I don't know", "not sure", "please tell", "help me" → They're responding to YOUR Quick Question
- You MUST reference the specific question you asked

WHEN USER SAYS "I DON'T KNOW" OR "PLEASE TELL" (MANDATORY FORMAT):
1. First line MUST be: "No worries! My question was about [EXACT TOPIC from your Quick Question]."
2. Second line: "Here's a helpful hint to get you thinking..."
3. Then provide hints that guide them toward the answer
4. Do NOT just re-explain the general topic - focus on answering YOUR specific question

Example - if your Quick Question was "How does electromagnetic induction relate to generators?":
BAD response: "Electromagnetic induction is when..." (ignores the question)
GOOD response: "No worries! My question was about how electromagnetic induction relates to generators. Here's a hint: Think about what physically moves inside a generator..."

EXPLANATION STYLE:
- Explain like ChatGPT: direct, clear, and specific.
- Use short paragraphs with blank lines between them.
- No fluff, no repetition.
- Use plain language suitable for learners.
- Do not use formulas, symbols, or markdown.

STRICT JSON FORMAT:
{
  "explanation": "Line 1\\nLine 2\\nLine 3\\n\\nLine 4\\nLine 5",
  "guided_steps": ["Action line.\\nObservation line.", "...", "...", "..."],
  "reflection_question": "Why does...?"
}

GUIDED STEPS FORMAT (CRITICAL - TWO-LINE FORMAT):
Each guided step is a STRING with TWO lines separated by \\n:
- Line 1: SPECIFIC ACTION - What to physically do in THIS simulation (button clicks, dragging, settings)
- Line 2: OBSERVATION + WHY - What you'll see and the physics principle

EXAMPLE GUIDED STEPS FOR FARADAY'S LAW:
Step 1: "Turn on the voltmeter and keep the magnet still near the coil.\\nNotice that no voltage appears when the magnet is not moving."
Step 2: "Slowly push the magnet into the coil and pull it out.\\nObserve how the voltmeter deflects and the bulb lights briefly."
Step 3: "Move the magnet slowly and then faster through the coil.\\nNotice that faster motion produces a larger voltage."
Step 4: "Voltage appears only when the magnetic field through the coil changes.\\nThis phenomenon is called electromagnetic induction (Faraday's Law)."

BAD EXAMPLES (DO NOT DO THIS):
- "Explore the simulation" (too vague)
- "Move something and see what happens" (not specific)
- "Try different settings" (no actual instruction)

RULES:
- ALWAYS 4 guided_steps with specific simulation instructions
- Each step: Action sentence + \\n + Observation sentence
- Reference actual simulation elements: voltmeter, magnet, coil, bulb, field lines
- Generate a NEW, thoughtful reflection_question each time
- ALWAYS valid JSON only
- Stay on the student's asked topic

`;

  if (simulationData.id === 'faraday') {
    // Load comprehensive simulation knowledge
    const knowledgeContext = buildKnowledgeContext('faraday');
    
    prompt += `
CONTEXT: The simulation is "Electromagnetic Induction (Faraday's Law)" from PhET.
Simulation features:
- A bar magnet that can be moved toward/away from a coil
- A voltmeter showing induced EMF
- A lightbulb that lights up when current flows
- Controls for magnet strength and coil loops
- Toggle for magnetic field lines visualization
- Single-coil (1 loop) and double-coil (4 loops) configurations
- Reversible magnet polarity (flip N/S orientation)

${knowledgeContext}

IMPORTANT: Use the above knowledge to give ACCURATE, SPECIFIC answers about the simulation.
When the user asks about what happens in certain scenarios, refer to the CAUSE-EFFECT RELATIONSHIPS and EXPECTED OBSERVATIONS.
When the user has misconceptions, gently correct them using the COMMON MISCONCEPTIONS section.
When the user asks conceptual questions, use the CONCEPTUAL Q&A for accurate responses.

IMPORTANT: Generate FRESH, UNIQUE content each time. Do NOT repeat previous responses.
Variation seed: ${Date.now()}

Generate EXACTLY these 4 guided steps for Faraday's Law simulation (use this EXACT format):

Step 1: "Turn on the voltmeter and keep the magnet still near the coil.\nNotice that no voltage appears when the magnet is not moving."

Step 2: "Slowly push the magnet into the coil and pull it out.\nObserve how the voltmeter deflects and the bulb lights briefly."

Step 3: "Move the magnet slowly and then faster through the coil.\nNotice that faster motion produces a larger voltage."

Step 4: "Voltage appears only when the magnetic field through the coil changes.\nThis phenomenon is called electromagnetic induction (Faraday's Law)."

DO NOT mention: magnet strength settings, double coil configuration, or other advanced controls. Keep steps simple and focused on core concepts.

Generate a DIFFERENT reflection question each time - vary the focus (cause/effect, real-world applications, predictions, comparisons, etc).`;
  }

  return prompt;
}

/**
 * Build messages array for Bedrock
 * Constructs conversation context with system role, limited history, and simulation data
 * @param {Array} conversationHistory - Previous messages
 * @param {string} newMessage - User's new message
 * @param {Object} simulationData - Detected simulation or null
 * @param {boolean} guidedMode - Guided learning mode
 * @returns {Array} Messages formatted for Bedrock
 */
function buildMessagesForBedrock(conversationHistory, newMessage, simulationData, guidedMode) {
  const messages = [];

  // IMPORTANT: Bedrock doesn't support separate system role like OpenAI
  // We inject system context as first user message with special handling
  const systemPrompt = buildSystemPrompt(simulationData, guidedMode);
  
  messages.push({
    role: 'user',
    content: `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n[END SYSTEM INSTRUCTIONS]\n\nLet's begin our session.`
  });

  messages.push({
    role: 'assistant',
    content: 'Ready to help with concept learning. I will respond only in JSON format as specified.'
  });

  // Add limited conversation history
  const limitedHistory = limitHistory(conversationHistory);
  
  for (const message of limitedHistory) {
    if (message.type === 'user') {
      messages.push({
        role: 'user',
        content: message.content
      });
    } else if (message.type === 'bot') {
      let content = message.content;
      if (typeof content === 'object') {
        // Build rich context including guided steps and reflection question
        let contextParts = [];
        
        // Add main explanation
        if (content.explanation) {
          contextParts.push(`My explanation: ${content.explanation}`);
        }
        
        // Add guided steps context so LLM remembers what steps it gave
        if (content.guided_steps && content.guided_steps.length > 0) {
          const stepsText = content.guided_steps.map((step, i) => `Step ${i + 1}: ${step}`).join('\n');
          contextParts.push(`\nGuided steps I provided:\n${stepsText}`);
        }
        
        // Add reflection question context PROMINENTLY so LLM remembers what it asked
        // Put it at the START so it's highly visible
        if (content.reflection_question) {
          // Prepend the quick question to make it the first thing the LLM sees
          contextParts.unshift(`[IMPORTANT: I asked this Quick Question: "${content.reflection_question}"]`);
        }
        
        content = contextParts.join('\n') || JSON.stringify(content);
      }
      messages.push({
        role: 'assistant',
        content: content
      });
    }
  }

  // Check if user is responding to a Quick Question
  // Look for "I don't know" patterns and inject context
  const lastBotMessage = limitedHistory.filter(m => m.type === 'bot').pop();
  let enhancedUserMessage = newMessage;
  
  if (lastBotMessage && lastBotMessage.content && typeof lastBotMessage.content === 'object') {
    const quickQuestion = lastBotMessage.content.reflection_question;
    if (quickQuestion) {
      // Check if user is saying "I don't know" or similar
      const iDontKnowPatterns = /i don'?t know|not sure|please tell|help me|can you explain|what'?s the answer|no idea/i;
      if (iDontKnowPatterns.test(newMessage)) {
        enhancedUserMessage = `The student is responding to my Quick Question: "${quickQuestion}"

The student said: "${newMessage}"

Since they don't know the answer, I should:
1. Start by saying "No worries!" or "That's okay!" to be encouraging
2. Remind them what my question was about
3. Then explain the answer to MY SPECIFIC QUESTION (not just the general topic)

For example, if my question was about generators, I should explain how electromagnetic induction relates to GENERATORS specifically.`;
      } else if (newMessage.length < 200) {
        // Short response likely answers the question
        enhancedUserMessage = `The student is answering my Quick Question: "${quickQuestion}"

Their answer: "${newMessage}"

I should acknowledge their answer (e.g., "Great thinking!" or "Good point!") and then evaluate whether they correctly understood the connection. Provide encouragement and any corrections needed.`;
      }
    }
  }

  // Add new user message (possibly enhanced with Quick Question context)
  messages.push({
    role: 'user',
    content: enhancedUserMessage
  });

  return messages;
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

/**
 * Robust JSON response parser
 * Handles markdown-wrapped JSON, malformed responses, and edge cases
 * @param {string} rawText - Raw response text from LLM
 * @returns {Object} Parsed response with fallback structure
 */
function parseResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return createFallbackResponse('No response received from model');
  }

  try {
    // First, try direct JSON parse
    return JSON.parse(rawText);
  } catch (e) {
    // If that fails, try extracting JSON from markdown
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        // Markdown extraction failed
      }
    }

    // Try extracting any JSON object
    const objectMatch = rawText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e3) {
        // JSON object extraction failed
      }
    }

    // All parsing failed, return fallback
    return createFallbackResponse(rawText);
  }
}

/**
 * Create fallback response when parsing fails
 * @param {string} rawText - Original response text
 * @returns {Object} Structured fallback response
 */
function createFallbackResponse(rawText) {
  return {
    explanation: rawText || 'Unable to process response',
    guided_steps: [],
    reflection_question: null,
    _note: 'Response parsing fallback - model may not have returned valid JSON'
  };
}

/**
 * Normalize explanation text to avoid malformed fragments from model output
 * @param {string} explanation - Raw explanation text
 * @param {boolean} isElectromagneticQuestion - Whether Faraday context is active
 * @returns {string}
 */
function normalizeExplanationText(explanation, isElectromagneticQuestion = false) {
  if (!explanation || typeof explanation !== 'string') {
    return explanation;
  }

  let normalized = explanation
    .replace(/\r\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\u2019/g, "'")
    // Fix broken sentence starts like "'s a fundamental..."
    .replace(/(^|[.!?]\s+)'s\b/g, '$1It is')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // In Faraday context, repair orphaned "...'s Law" fragments.
  if (isElectromagneticQuestion) {
    normalized = normalized
      .replace(/(^|[\s(])'s Law\b/g, '$1Faraday\'s Law')
      .replace(/\bLenz Law\b/g, "Lenz's Law");
  }

  return normalized;
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log request details for debugging and analytics
 * @param {string} sessionId - Session identifier
 * @param {string} message - User message
 * @param {Object} simulationData - Detected simulation
 * @param {boolean} guidedMode - Guided mode state
 * @param {number} historyLength - Conversation history length
 */
function logRequest(sessionId, message, simulationData, guidedMode, historyLength) {
  console.log('\n' + '='.repeat(70));
  console.log('📨 NEW REQUEST');
  console.log('='.repeat(70));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  console.log(`Simulation Detected: ${simulationData ? simulationData.title : 'None'}`);
  console.log(`Guided Mode: ${guidedMode ? 'ON' : 'OFF'}`);
  console.log(`History Length: ${historyLength} messages`);
  console.log('='.repeat(70));
}



/**
 * Log response details
 * @param {Object} response - Parsed response object
 * @param {string} rawResponse - Raw response text
 */
function logResponse(response, rawResponse) {
  console.log('✅ Response received');
  console.log(`Parsed successfully: ${typeof response === 'object' ? 'Yes' : 'No'}`);
  if (response.explanation) {
    const expText = Array.isArray(response.explanation) 
      ? response.explanation[0]?.substring(0, 60) 
      : response.explanation.substring(0, 60);
    console.log(`Explanation: "${expText}..."`);
  }
  if (response.guided_steps && response.guided_steps.length > 0) {
    console.log(`Guided Steps: ${response.guided_steps.length} steps`);
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/chat
 * Main chat endpoint for tutoring interactions
 * 
 * Request body:
 * {
 *   "message": "User question",
 *   "sessionId": "unique-session-id",
 *   "guidedMode": true/false (optional)
 * }
 * 
 * Response:
 * {
 *   "explanation": "...",
 *   "guided_steps": [...],
 *   "reflection_question": "..."
 * }
 */
app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default', guidedMode = false, simulation = null } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      explanation: 'Message is required and must be a non-empty string'
    });
  }

  // Friendly onboarding for greetings to avoid random topic drift
  if (isGreetingMessage(message)) {
    return res.json({
      explanation: "Hi! I can help you understand concepts clearly across many topics.\n\nTell me what you want to understand today, and I will break it down step by step.",
      guided_steps: [],
      reflection_question: null
    });
  }

  try {
    // Get or create session
    const session = getOrCreateSession(sessionId);

    // Detect simulation from message OR use provided simulation ID
    let detectedSimulation = detectSimulation(message);
    if (!detectedSimulation && simulation) {
      detectedSimulation = getSimulationById(simulation);
    }

    // Activate guided mode if simulation detected
    const activeGuidedMode = detectedSimulation ? true : guidedMode;

    // Update learning state
    if (detectedSimulation) {
      session.learningState.activeSimulation = detectedSimulation.id;
      session.learningState.guidedMode = true;
    }
    session.learningState.lastUpdated = Date.now();

    // Log request
    logRequest(
      sessionId,
      message,
      detectedSimulation,
      activeGuidedMode,
      session.messages.length
    );

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      detectedSimulation,
      activeGuidedMode
    );
    
    // Build messages array with conversation history
    const messages = [];
    
    // Add system instructions as first user message for Gemma
    messages.push({
      role: 'user',
      content: `[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n[END SYSTEM INSTRUCTIONS]\n\nAcknowledge these instructions.`
    });
    messages.push({
      role: 'assistant', 
      content: 'I understand. I will act as a friendly physics tutor, respond ONLY with the specified JSON format, and follow all guidelines for explanations, guided steps, and reflection questions.'
    });
    
    // Add conversation history (limited to prevent token explosion)
    const limitedHistory = limitHistory(session.messages);
    for (const msg of limitedHistory) {
      if (msg.type === 'user') {
        messages.push({
          role: 'user',
          content: msg.content
        });
      } else if (msg.type === 'bot') {
        // Convert bot response back to JSON string for context
        const botContent = typeof msg.content === 'object' 
          ? JSON.stringify(msg.content)
          : msg.content;
        messages.push({
          role: 'assistant',
          content: botContent
        });
      }
    }
    
    // Add the new user message
    messages.push({
      role: 'user',
      content: `${message}\n\nRespond with ONLY the JSON object, no markdown formatting.`
    });
    
    console.log(`📝 Sending ${messages.length} messages (${limitedHistory.length} from history)`);
    
    const bedrockRequest = {
      modelId: 'google.gemma-3-12b-it',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: messages,
        max_tokens: 1024
      })
    };

    // Call Bedrock
    const command = new InvokeModelCommand(bedrockRequest);
    const bedrockResponse = await bedrockClient.send(command);

    // Parse response
    const responseBody = Buffer.from(bedrockResponse.body).toString();
    
    console.log('RAW RESPONSE:', responseBody.substring(0, 500));

    let aiResponse = '';
    try {
      const parsed = JSON.parse(responseBody);
      
      // Handle Gemma response format
      // Gemma on Bedrock returns: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
      if (parsed.candidates && Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
        const candidate = parsed.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          aiResponse = candidate.content.parts[0].text || '';
        }
      }
      // Fallback: OpenAI-compatible format (for other models)
      else if (parsed.choices && Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        const message = parsed.choices[0].message;
        if (message && message.content) {
          aiResponse = message.content;
        }
      }
      // Fallback: other formats
      else if (parsed.result && parsed.result.output) {
        aiResponse = parsed.result.output;
      } else if (parsed.outputText) {
        aiResponse = parsed.outputText;
      } else if (parsed.response) {
        aiResponse = parsed.response;
      } else {
        aiResponse = JSON.stringify(parsed);
      }
    } catch (e) {
      console.error('Error parsing Bedrock response:', e.message);
      aiResponse = responseBody;
    }

    // Strip markdown code blocks if present (Gemma wraps JSON in ```json ... ```)
    // Handle both ```json and ``` formats
    aiResponse = aiResponse.trim();
    let jsonMatch = aiResponse.match(/```(?:json|javascript|text|\s)*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      aiResponse = jsonMatch[1].trim();
    } else {
      // Alternative: remove markdown backticks line by line
      aiResponse = aiResponse.replace(/^\s*```(?:json)?\s*$/gm, '').trim();
    }
    
    console.log('EXTRACTED RESPONSE (first 300 chars):', aiResponse.substring(0, 300));

    // Parse as tutoring response
    let parsedResponse = parseResponse(aiResponse);
    
    // Validate and enforce response structure based on whether simulation is detected
    const hasSimulation = !!detectedSimulation;
    const isElectromagneticQuestion = detectedSimulation?.id === 'faraday';
    
    // Always ensure explanation exists
    if (!parsedResponse.explanation || parsedResponse.explanation.length === 0) {
      console.error('❌ Missing explanation field');
      parsedResponse.explanation = 'Unable to generate explanation';
    }
    
    // Only add guided_steps and reflection_question if a simulation is detected
    if (hasSimulation) {
      // HARDCODED guided steps for Faraday's Law simulation (always use these, ignore AI generation)
      if (isElectromagneticQuestion) {
        console.log('✅ Using hardcoded guided steps for Faraday\'s Law');
        parsedResponse.guided_steps = [
          "Turn on the voltmeter and keep the magnet still near the coil.\nNotice that no voltage appears when the magnet is not moving.",
          "Slowly push the magnet into the coil and pull it out.\nObserve how the voltmeter deflects and the bulb lights briefly.",
          "Move the magnet slowly and then faster through the coil.\nNotice that faster motion produces a larger voltage.",
          "Voltage appears only when the magnetic field through the coil changes.\nThis phenomenon is called electromagnetic induction (Faraday's Law)."
        ];
      } else if (!Array.isArray(parsedResponse.guided_steps) || parsedResponse.guided_steps.length === 0) {
        // Generic fallback for other simulations
        console.log('⚠️ LLM did not generate guided_steps, adding generic fallback');
        parsedResponse.guided_steps = [
          'Explore the simulation controls and observe the initial state.',
          'Make a small change and observe what happens.',
          'Try different values and note the patterns.',
          'Summarize the key relationship you discovered.'
        ];
      }
      
      if (!parsedResponse.reflection_question || parsedResponse.reflection_question.length === 0) {
        console.log('⚠️ LLM did not generate reflection_question, adding generic fallback');
        parsedResponse.reflection_question = 'Based on your exploration, what is the key relationship you discovered?';
      }
    } else {
      // No simulation - remove guided_steps and reflection_question if they exist
      delete parsedResponse.guided_steps;
      delete parsedResponse.reflection_question;
      console.log('ℹ️ No simulation detected - returning explanation only');
    }
    
    // Remove any LaTeX formulas from explanation ($ or \\)
    if (parsedResponse.explanation) {
      parsedResponse.explanation = parsedResponse.explanation
        .replace(/\$\$[^\$]*\$\$/g, '')  // Remove $$ ... $$
        .replace(/\$[^\$]*\$/g, '');       // Remove $ ... $
    }
    
    // Normalize response structure - convert explanation array to string if needed
    if (Array.isArray(parsedResponse.explanation)) {
      parsedResponse.explanation = parsedResponse.explanation
        .join('\n\n');
    }

    // Enforce paragraph-style explanation (strip list markers if model still emits bullets)
    if (typeof parsedResponse.explanation === 'string') {
      parsedResponse.explanation = parsedResponse.explanation
        .replace(/^[\s]*[•*-]\s+/gm, '')
        .replace(/^\s*\d+[\.)]\s+/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    parsedResponse.explanation = normalizeExplanationText(
      parsedResponse.explanation,
      hasSimulation && detectedSimulation?.id === 'faraday'
    );

    // Log response
    logResponse(parsedResponse, aiResponse);

    // Enrich response with simulation data if detected
    if (detectedSimulation) {
      parsedResponse.simulation = {
        id: detectedSimulation.id,
        title: detectedSimulation.title,
        url: detectedSimulation.url
      };
    }

    // Store in session history
    session.messages.push({
      type: 'user',
      content: message
    });
    session.messages.push({
      type: 'bot',
      content: parsedResponse
    });

    // Send response
    res.json(parsedResponse);

    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Full Error:', JSON.stringify(error, null, 2));
    console.error('Error name:', error.name);

    res.status(500).json({
      error: 'AI service error',
      explanation: 'The tutoring system encountered an error. Please try again.',
      details: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Visual Tutor AI Backend',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/simulations
 * Get registered simulations (for frontend)
 */
app.get('/api/simulations', (req, res) => {
  const simulations = [
    {
      id: 'buoyancy',
      title: 'Buoyancy Basics',
      description: 'Interactive exploration of buoyant forces'
    },
    {
      id: 'refraction',
      title: 'Refraction Basics',
      description: 'Interactive simulation of light bending'
    },
    {
      id: 'projectile',
      title: 'Projectile Motion',
      description: 'Interactive exploration of projectile motion'
    }
  ];
  res.json({ simulations });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Visual Tutor AI Backend');
  console.log('='.repeat(70));
  console.log(`Server running on port ${PORT}`);
  console.log(`Region: ${REGION}`);
  console.log(`Model: Gemma 3 12B IT (Bedrock)`);
  console.log(`Max History: ${MAX_HISTORY_EXCHANGES} exchanges`);
  console.log('='.repeat(70) + '\n');
});




