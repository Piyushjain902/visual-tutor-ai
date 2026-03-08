# Visual Tutor AI - Academic Prompt Upgrade Documentation

**Date**: February 27, 2026  
**Version**: 2.0 (Academic Rigor Edition)  
**Target Audience**: Grades 10-12 Physics Students

---

## Overview

The Visual Tutor AI system prompt has been completely rewritten to provide academically rigorous instruction appropriate for advanced secondary-level physics students. The upgrade eliminates childish language, oversimplification, and casual tone while maintaining clarity and pedagogical effectiveness.

---

## Key Changes

### 1. System Prompt Rewrite

**Previous Approach:**
- Generic tutoring language ("help students understand")
- Motivational, encouragement-focused tone
- Lack of specific academic standards
- No emphasis on conceptual rigor

**New Approach:**
- Explicit focus on "rigorous physics instructor"
- Formal academic language for grades 10-12
- Requirements for precise scientific terminology
- Emphasis on analytical reasoning and scientific method

### 2. Tone Requirements (Enforced)

```
OLD: "Imagine moving a magnet near a wire..."
NEW: "Electromagnetic induction occurs when the magnetic flux linked with a conductor changes..."

OLD: "Help them discover patterns through exploration"
NEW: "Build understanding progressively from observation to theoretical interpretation"

OLD: "Ask them to predict outcomes before they observe"
NEW: "Require systematic manipulation of parameters to investigate relationships"
```

### 3. Terminology Standards

The prompt now requires:

✅ **Correct Terms to Use:**
- Electromagnetic flux (not "magnetic field strength")
- Induced EMF (not "electrical push")
- Refractive index (not "how dense the material is")
- Kinematic equations, vector decomposition, equilibrium state
- Snell's Law, Archimedes' principle, conservation laws

❌ **Forbidden Language:**
- Childish analogies and metaphors
- Excessive simplification ("it's like...")
- Motivational platitudes ("Great job!")
- Emojis and casual punctuation
- Narrative storytelling approach

### 4. Pedagogical Structure

#### Explanation Section
- Begins with formal definitions
- Connects to fundamental principles
- Uses quantitative language
- References relevant physical laws
- Structured with clear causal relationships

**Example:** "Electromagnetic induction occurs when the magnetic flux linked with a conductor changes. This change induces an electromotive force (EMF) according to Faraday's law: ε = -dΦ/dt"

#### Guided Steps Section
- Written in laboratory instruction style
- Operational, precise, measurable
- Each step is explicit and reproducible
- Emphasis on data collection and analysis

**Example:** "Measure the mass and volume of the object, then calculate its density using ρ_object = m/V"

#### Reflection Question Section
- Requires analytical reasoning
- Probes deeper understanding, not recall
- Questions about underlying physical principles
- Encourages scientific thinking

**Example:** "How does the rate of change of magnetic flux affect the magnitude of induced EMF?"

---

## Updated Simulation Context

### Buoyancy Basics

**Old Learning Goal:**  
"Understand how buoyant force depends on object density, volume, and fluid density"

**New Learning Goal:**  
"Understand Archimedes' principle and analyze equilibrium conditions based on buoyant force, gravitational force, and density relationships"

**Old Guidance:**  
"Help them discover patterns through exploration"

**New Guidance:**  
"Guide systematic investigation of buoyant force by manipulating object density and volume. Connect observations to Archimedes' principle and analyze conditions for floating, sinking, and neutral buoyancy based on relative densities."

**Example Guided Step (Old):**  
"Observe what happens when you place the object in the fluid"

**Example Guided Step (New):**  
"Measure the mass and volume of the object, then calculate its density using ρ_object = m/V"

---

### Refraction Basics

**Old Learning Goal:**  
"Understand how light bends when entering different media and apply Snell's Law"

**New Learning Goal:**  
"Analyze light refraction and apply Snell's law to predict ray behavior at media interfaces. Understand refractive index as a measure of optical density."

**Example Guided Step (Old):**  
"Observe the incident ray and refracted ray"

**Example Guided Step (New):**  
"Identify the incident ray, normal, refracted ray, and interface between the two media"

---

### Projectile Motion

**Old Learning Goal:**  
"Understand how initial velocity and launch angle affect projectile trajectory and range"

**New Learning Goal:**  
"Analyze projectile motion using kinematic equations and vector decomposition. Determine optimal launch angle for range and understand trajectory shape."

**Example Guided Step (Old):**  
"Observe its trajectory"

**Example Guided Step (New):**  
"Decompose initial velocity into components: v₀ₓ = v₀cos(θ) and v₀ᵧ = v₀sin(θ)"

---

## Technical Implementation

### In `backend/server.js`

The `buildSystemPrompt()` function now:

1. Opens with explicit role definition: "rigorous physics instructor specializing in advanced secondary-level instruction"
2. Lists core responsibilities emphasizing accuracy, rigor, and no-hallucination policy
3. Requires formal academic tone and proper physics terminology
4. Specifies explanation style (definitions → principles → quantitative language)
5. For simulation context: adds methodology for investigation and connection to theory
6. For guided mode: structures steps in lab instruction style with reflection questions
7. Enforces strict JSON response format with validation requirements

### In `backend/simulations.js`

Each simulation now includes:

- **Description** using formal terminology and physics concepts
- **Learning Goal** phrased as analysis and understanding of principles (not "understand how")
- **Prompt Hint** with specific pedagogical guidance ("systematic investigation," "analyze conditions")
- **Guided Steps** written as lab instructions with measurements and calculations
- **Parameters** with proper SI units and technical nomenclature

---

## Expected Behavior Changes

### Before (Old Prompt)

**User:** "Explain buoyancy"

**Response (Old):**
```
"Buoyancy happens when an object is placed in water. The water pushes up on the object! 
Let me guide you through steps:
1. Put the object in water
2. Watch what happens
3. See if it floats?"
```

### After (New Prompt)

**User:** "Explain buoyancy"

**Response (New):**
```json
{
  "explanation": "Buoyancy results from the pressure difference exerted by a fluid on an immersed object. According to Archimedes' principle, the buoyant force equals the weight of fluid displaced: F_b = ρ_fluid × g × V_displaced. An object achieves equilibrium when the buoyant force equals the gravitational force (mg). Equilibrium conditions depend on the relative densities: if ρ_object > ρ_fluid, the object sinks; if ρ_object < ρ_fluid, the object floats.",
  "guided_steps": [
    "Measure the mass and volume of the object, then calculate its density using ρ_object = m/V.",
    "Determine the fluid density from the simulation parameters.",
    "Compare densities: predict equilibrium state (sinking, floating, or neutral buoyancy).",
    "Measure the buoyant force using F_b = ρ_fluid × g × V_displaced and compare to gravitational force F_g = m × g.",
    "Systematically vary object mass or volume and document how density changes affect equilibrium state."
  ],
  "reflection_question": "Using F_b = ρ_fluid × g × V_displaced and F_g = m × g, derive the relationship between object density and fluid density that determines whether an object floats or sinks. How would this relationship change in a different fluid with a different density?"
}
```

---

## Quality Assurance

### Prompt Validation

The system now enforces:

- ✅ No code block markers in responses (backticks forbidden)
- ✅ Valid JSON only (no explanatory text outside JSON)
- ✅ All strings properly escaped
- ✅ Arrays contain only strings
- ✅ Reflection question probes analytical thinking
- ✅ Guided steps are measurable and reproducible

### Tone Validation (Manual Review Recommended)

Reviewers should check for:

- [ ] Use of proper physics terminology (flux, EMF, refractive index, etc.)
- [ ] Absence of childish language ("imagine," "let's pretend," etc.)
- [ ] Absence of casual tone ("cool," "awesome," "cool," emoji)
- [ ] Formal academic voice appropriate for high school
- [ ] Guided steps are lab-instruction style
- [ ] Reflection questions require analysis, not recall

---

## Customization Guidelines

To add new simulations with the academic standard:

```javascript
{
  id: 'new_simulation',
  title: 'Formal Title',
  description: 'Physics concept using formal terminology and precise language',
  url: '/path/to/simulation',
  keywords: ['accurate', 'physics', 'terminology'],
  learningGoal: 'Analyze/Understand [specific physics principle] using [methodology/law/principle]',
  promptHint: 'Guide systematic investigation of [concept] by [specific actions]. Connect observations to [relevant law/principle].',
  guidedSteps: [
    'Measure/Calculate [specific quantity] using [equation]',
    'Systematically vary [parameter] and observe/document [observable outcome]',
    // More steps...
  ]
}
```

---

## Validation Checklist

Before deploying responses, verify:

- [ ] No emojis in explanations or steps
- [ ] All technical terms defined or assumed known to high school physicists
- [ ] Guided steps include measurements and calculations
- [ ] Reflection questions ask "why" or "how" (analytical, not factual)
- [ ] No motivational language ("great job," "excellent thinking")
- [ ] JSON is valid and properly formatted
- [ ] Explanation connects to physical laws or principles
- [ ] Steps are reproducible in the simulation

---

## References & Standards

This upgrade aligns with:

- AP Physics 1 & 2 curriculum standards (College Board)
- IB Physics standard level curriculum
- Secondary science instruction best practices for advanced learners
- Bloom's taxonomy (analysis and evaluation levels, not just comprehension)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Previous | Initial tutoring prompt (generic) |
| 2.0 | Feb 27, 2026 | Academic rigor upgrade for grades 10-12 |

---

**Status**: ✅ Deployed and Active

All Visual Tutor AI responses now conform to rigorous academic standards for secondary-level physics instruction.
