# 🛡️ BrowseShield AI

### Privacy-First Browser AI Agent

**BrowseShield AI is a privacy-first browser AI agent that protects sensitive webpage data before cloud AI reasoning.** It detects and redacts sensitive information locally, sends only sanitized context to the AI reasoning engine, and executes validated AI-generated browser actions locally.

> **AI decides what to do. BrowseShield AI decides what AI can see.**

---

## ⚠️ Problem

AI browser agents can understand webpages and perform actions such as **searching, clicking, typing, scrolling, and navigating**.

However, webpages can contain sensitive information such as:

- Personal details
- Email addresses and phone numbers
- Addresses
- Identity numbers
- Financial information
- Income details
- Confidential profile information

When complete webpage context is sent to a cloud AI, sensitive information that is unnecessary for the task may also be exposed.

This creates an important challenge:

> **How can an AI browser agent understand and act on webpages without unnecessarily exposing sensitive user data?**

BrowseShield AI addresses this by introducing a **browser-level privacy enforcement layer before cloud AI reasoning**.

---

## 💡 Proposed Solution

BrowseShield AI creates a privacy boundary between the **webpage** and the **AI reasoning engine**.

Before webpage context reaches the AI:

1. The webpage is scanned locally.
2. Sensitive information is detected locally.
3. Protected values are replaced with semantic privacy placeholders.
4. Useful non-sensitive context is retained.
5. A cloud-safe representation of the webpage is generated.
6. Only sanitized context is sent for AI reasoning.
7. The AI returns a structured browser action.
8. BrowseShield AI validates and executes the action locally.

This enables useful AI browser automation while reducing unnecessary exposure of sensitive webpage information.

### Example

**Original Webpage Data**

```text
Email:       user@example.com
Phone:       +91 98765 43210
PAN:         ABCTY1234D
State:       Maharashtra
Occupation:  Health Worker
Income:      ₹1,20,000
```

**Cloud-Safe Context**

```text
Email:       [PRIVATE_EMAIL]
Phone:       [PRIVATE_PHONE]
PAN:         [PRIVATE_ID]
State:       Maharashtra
Occupation:  Health Worker
Income:      [PRIVATE_INCOME]
```

Sensitive values are protected while useful contextual information remains available for accurate AI reasoning.

---

## ⚙️ How It Works

BrowseShield AI follows four core stages.

### 🔍 1. Detect

BrowseShield AI analyzes the current webpage locally and identifies visible content, interactive elements, and potentially sensitive information.

### 🛡️ 2. Protect

Sensitive values are replaced locally with semantic privacy placeholders such as:

**`[PRIVATE_NAME]` · `[PRIVATE_EMAIL]` · `[PRIVATE_PHONE]` · `[PRIVATE_ADDRESS]` · `[PRIVATE_AADHAAR]` · `[PRIVATE_PAN]` · `[PRIVATE_INCOME]`**

The original protected values remain outside the cloud reasoning context.

### 🧠 3. Reason Safely

Only the **sanitized, cloud-safe webpage context** is sent through the backend to the AI reasoning engine.

The AI analyzes the safe context and determines the appropriate browser action.

### ⚙️ 4. Act

The reasoning engine returns a structured browser action.

BrowseShield AI validates the action and executes it locally in the browser.

> **Detect → Protect → Reason Safely → Act**

---

## 🏗️ System Architecture

```text
          ┌──────────────────────────────┐
          │           Webpage            │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │       BrowseShield AI        │
          │                              │
          │     Local Privacy Layer      │
          │       Page Extraction        │
          │    Sensitive Detection       │
          │    Redaction & Masking       │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │      Cloud-Safe Context      │
          │                              │
          │       Sanitized JSON         │
          │       [PRIVATE_EMAIL]        │
          │       [PRIVATE_PHONE]        │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │       FastAPI Backend        │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │       Gemini Reasoning       │
          │                              │
          │      Safe Context Only       │
          │    Structured Action JSON    │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │       BrowseShield AI        │
          │                              │
          │       Action Executor        │
          │                              │
          │    CLICK • TYPE • SCROLL     │
          │          NAVIGATE            │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │            Result            │
          │                              │
          │       Task Completed         │
          │    with Privacy Protected    │
          └──────────────────────────────┘
```

### Architecture in One Line

> **Webpage → Local Privacy Layer → Sanitized JSON → FastAPI → Gemini → Structured Action → Local Browser Execution**

---

## 🔐 Privacy Boundary

BrowseShield AI separates local privacy processing from cloud AI reasoning.

### What Stays Local

- Raw webpage data
- Sensitive-data detection
- Redaction and masking
- Browser action execution

### What Goes to Cloud AI

- Sanitized webpage context
- Safe task context
- Structured webpage information required for reasoning

The cloud AI returns a structured action rather than directly controlling the webpage.

> **Sensitive data is protected before AI reasoning.**

---

## 🔧 Key Features

### 🔒 Local Privacy Protection

Sensitive webpage information is detected and sanitized locally before cloud reasoning.

Privacy enforcement occurs **before the AI receives webpage context**.

---

### 🏷️ Semantic Privacy Placeholders

Protected values are replaced with meaningful placeholders rather than simply removing all surrounding information.

For example:

```text
Email  → [PRIVATE_EMAIL]
Phone  → [PRIVATE_PHONE]
Income → [PRIVATE_INCOME]
```

This preserves useful semantic structure without exposing the original protected value.

---

### 🎯 Useful Context Retention

BrowseShield AI does not simply hide the entire webpage.

Useful non-sensitive information can remain available when it is needed for reasoning.

For example:

```text
State: Maharashtra
Occupation: Health Worker
```

This helps maintain the usefulness of AI reasoning while protecting sensitive information.

---

### ☁️ Cloud-Safe AI Reasoning

The AI reasoning engine receives a **sanitized representation of the webpage** instead of the original protected values.

> **Raw Webpage → BrowseShield AI → Sanitized Context → Cloud AI**

---

### 🧠 AI Browser Reasoning

The AI determines **what browser action should be performed**.

It does not directly manipulate the webpage.

Instead, it returns a structured action to BrowseShield AI.

---

### ⚙️ Structured Browser Actions

The current implementation supports:

**`CLICK`** — Click an identified webpage element  
**`TYPE`** — Enter text into an input field  
**`SCROLL`** — Move through webpage content  
**`NAVIGATE`** — Navigate to another webpage  
**`DONE`** — Mark the task as completed  
**`NONE`** — Perform no browser action

### Example Structured Action

```json
{
  "action": "TYPE",
  "target": "e1",
  "value": "Selected Result",
  "exactSearch": true,
  "pressEnter": true
}
```

---

### 🖥️ Local Browser Execution

The structured action returned by the reasoning engine is validated and executed locally.

```text
AI Reasoning
     ↓
Structured Action
     ↓
Action Validation
     ↓
Local Browser Execution
```

This separates **AI reasoning authority** from **browser execution authority**.

---

### 🛡️ Additional Privacy Validation

The backend performs an additional privacy check before sanitized context is forwarded to the cloud reasoning model.

If certain raw sensitive identifiers remain in outgoing context, the request can be blocked.

---

### 🔎 Intelligent Search Execution

BrowseShield AI can identify webpage search fields and enter an AI-selected result into them.

For exact-search workflows:

```text
Selected Result → "Selected Result"
```

Exact-search formatting is applied locally during browser execution.

---

## 🔄 Traditional Browser Agent vs BrowseShield AI

### Traditional Browser Agent

```text
Webpage
   ↓
Page Context
   ↓
Cloud AI
   ↓
AI Reasoning
   ↓
Browser Action
```

Sensitive information contained in the webpage may become part of the AI context.

### BrowseShield AI

```text
Webpage
   ↓
Local Sensitive-Data Detection
   ↓
Local Redaction
   ↓
Sanitized Context
   ↓
Cloud AI Reasoning
   ↓
Structured Action
   ↓
Local Browser Execution
```

### Key Difference

> **BrowseShield AI introduces privacy enforcement before AI reasoning.**

The goal is not to remove all information from the AI.

The goal is to **protect sensitive values while retaining useful context required for the task**.

---

## ✨ Innovation & Differentiation

### 🛡️ Privacy Before AI

Sensitive information is protected **before** webpage context reaches the cloud reasoning engine.

### 💻 On-Device Privacy Processing

Page scanning, sensitive-data detection, redaction, and browser action execution are performed locally in the current implementation.

### ☁️ Cloud-Safe Context

The reasoning engine receives sanitized webpage context instead of the original protected values.

### 🎯 Context Preservation

Useful non-sensitive information can remain available so that privacy protection does not make AI reasoning ineffective.

### 🔀 Separation of Responsibilities

BrowseShield AI separates:

> **What should the AI do?**

from:

> **What should the AI be allowed to see?**

### 🌐 Browser-Level Architecture

BrowseShield AI is designed as a browser-level privacy layer that can be extended across different AI-assisted browser workflows.

---

## 🧪 Demo Use Case

A **government scheme discovery workflow** is used to demonstrate the BrowseShield AI architecture.

The demo demonstrates how BrowseShield AI can:

1. Scan webpage information locally.
2. Detect sensitive profile information.
3. Replace protected values with privacy placeholders.
4. Preserve useful non-sensitive context.
5. Generate sanitized context.
6. Send sanitized context for AI reasoning.
7. Analyze available results.
8. Identify a suitable result.
9. Locate the webpage search field.
10. Execute the selected browser action locally.

### Example Result

```text
✓ Best Match Found

Selected: <Selected Scheme>

Reason: <Short evidence-based explanation>
```

**The government scheme workflow is only a demonstration use case.**

BrowseShield AI is designed as a **general-purpose privacy-first browser AI agent** and is not limited to government scheme discovery.

---

# 🧪 Current Prototype Implementation

BrowseShield AI is currently implemented as a **working Chrome extension prototype**.

The Chrome extension serves as the current implementation environment for demonstrating the browser-level privacy architecture.

It allows BrowseShield AI to:

- Read and analyze active webpage content
- Detect sensitive information locally
- Create sanitized webpage context
- Communicate with the local backend
- Receive structured AI actions
- Validate browser targets
- Execute browser actions locally

### Prototype Flow

```text
Webpage
   ↓
Chrome Extension
   ↓
Local Privacy Processing
   ↓
Sanitized Context
   ↓
FastAPI
   ↓
Gemini
   ↓
Structured Action
   ↓
Chrome Extension
   ↓
Local Browser Execution
```

> **The Chrome extension is the current prototype implementation of the broader BrowseShield AI browser-agent architecture.**

---

## 🛠️ Technology Stack

### 🌐 Browser Agent Implementation

**HTML5 · CSS3 · JavaScript · Chrome Extension Manifest V3**

The current prototype uses Chrome Extension Manifest V3 for browser integration, webpage interaction, local privacy processing, and action execution.

### 🔒 Privacy Layer

**Local JavaScript · Semantic Detection · Regex Detection · Placeholder Redaction**

Handles sensitive-data detection and local sanitization before cloud AI reasoning.

### 🖥️ Backend

**Python · FastAPI · Uvicorn · Pydantic**

Handles:

- Sanitized requests
- Privacy validation
- AI communication
- Structured action generation
- Response validation
- Agent coordination

### 🧠 AI Reasoning

**Google Gemini · Google GenAI SDK**

Provides reasoning over sanitized webpage context and generates structured browser actions.

---

## 📁 Project Structure

```text
BrowseShield-AI/
│
├── backend/
│   ├── env.example
│   ├── main.py
│   └── requirements.txt
│
├── .gitignore
├── background.js
├── content.js
├── manifest.json
├── popup.css
├── popup.html
├── popup.js
└── README.md
```

---

## 📄 Component Responsibilities

### `manifest.json`

Defines the configuration, permissions, content scripts, and background service worker for the current browser prototype.

### `popup.html`

Defines the BrowseShield AI prototype interface.

### `popup.css`

Provides styling for the interface.

### `popup.js`

Handles:

- Page scanning
- Starting BrowseShield AI
- Agent status updates
- Error handling
- Final result display

### `content.js`

Handles:

- Webpage extraction
- Sensitive-data detection
- Local sanitization
- Interactive-element extraction
- Search-field detection
- Browser element identification
- Clicking
- Typing
- Scrolling
- Navigation

### `background.js`

Coordinates communication between:

> **User Interface ↔ Webpage ↔ Local Backend**

It manages the browser-agent workflow and sends sanitized webpage context to the backend.

### `backend/main.py`

Handles:

- Sanitized webpage requests
- Privacy validation
- Gemini communication
- Structured action generation
- Action validation
- Safe response handling

### `backend/env.example`

Defines the environment-variable structure used by the backend.

### `.gitignore`

Excludes local configuration, virtual environments, and generated files from version control.

---

# 💻 Running the Prototype

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/BrowseShield-AI.git
cd BrowseShield-AI
```

---

## 2. Set Up the Backend

```bash
cd backend
python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

---

## 🔑 Environment Configuration

BrowseShield AI uses environment variables for AI reasoning configuration.

The repository includes:

`backend/env.example`

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=YOUR_GEMINI_MODEL
```

For local execution, a `backend/.env` file is used to provide the configured Gemini API key and model.

The `.env` file is excluded from version control so private credentials are not stored in the public repository.

---

## 🖥️ Start the Backend

From the `backend` directory:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend runs locally on port `8000`.

### Health Check

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

## 🌐 Load the Current Prototype

The current prototype is packaged as a Chrome extension.

1. Open Google Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the `BrowseShield-AI` project directory.
6. Pin BrowseShield AI to the browser toolbar.

The local FastAPI backend should be running before AI-powered tasks are started.

---

# ▶️ Prototype Usage

### 1. Open a Webpage

Navigate to the webpage where BrowseShield AI should operate.

### 2. Open BrowseShield AI

Open BrowseShield AI from the browser toolbar.

### 3. Scan the Page

Select **Scan Page**.

The current webpage is analyzed and sanitized locally.

After a successful scan:

```text
✓ Page scanned.
```

### 4. Enter a Task

Provide a browser task.

Example:

```text
Find the most suitable result for the available profile and search for it.
```

### 5. Run BrowseShield AI

Start the agent.

During processing:

```text
Analyzing Cloud-Safe page...
```

BrowseShield AI sends sanitized context for reasoning, receives a structured browser action, validates it, and executes the action locally.

---

# 🛡️ Core Principle

BrowseShield AI separates **reasoning authority** from **data-access authority**.

### 🧠 AI

> **What should I do?**

### 🛡️ BrowseShield AI

> **What can the AI see?**

**The AI performs the reasoning. BrowseShield AI controls the information boundary.**

> **Useful AI automation should not require unrestricted access to everything visible in the browser.**

---

# 🔒 Security Design Principles

BrowseShield AI follows these core security principles:

- **Local-first sensitive-data detection**
- **Privacy enforcement before cloud reasoning**
- **Semantic placeholders instead of raw protected values**
- **Sanitized context for external AI reasoning**
- **Validated AI-generated browser actions**
- **Local browser action execution**
- **Protected placeholders prevented from being typed as real values**
- **HTTP/HTTPS navigation validation**
- **Separation between AI reasoning and browser execution**
- **Environment-based API configuration**

---

# ⚠️ Current Limitations

BrowseShield AI is currently a **working browser AI agent prototype**.

The current implementation is delivered through a Chrome extension and local FastAPI backend.

Current limitations include:

- Privacy detection primarily uses local semantic rules, labels, and regular expressions.
- Highly dynamic websites may require additional interaction handling.
- The current browser-action set is intentionally limited.
- Local detection may not identify every possible form of sensitive information.
- Sanitized context is still sent to the configured cloud AI provider.
- The current implementation requires the FastAPI backend to run locally.
- The prototype demonstrates the architecture but does not guarantee protection against every possible form of data leakage.

---

# 🔭 Future Scope

## 🛡️ AI Data Firewall

BrowseShield AI can evolve into a broader **AI Data Firewall** positioned between browser data and external AI systems.

### 🧠 On-Device AI Privacy Detection

Lightweight local AI models can provide contextual sensitive-data detection beyond rule-based approaches.

### ⚡ WebGPU-Based Local Inference

Future implementations can use WebGPU or similar browser-native acceleration technologies for efficient on-device AI processing.

### 🖼️ Multimodal Privacy Protection

Sensitive information contained within webpage images and visual content can be detected and protected before external AI processing.

### 🏢 Enterprise Privacy Policies

Organizations can define policies controlling which categories of information different AI systems are permitted to access.

### 🎛️ User-Controlled Privacy

Users can receive greater control over categories of information that may or may not be exposed to AI systems.

### 📋 Privacy Audit Logs

Future implementations can provide records showing:

- What sensitive information was detected
- What information was protected
- What sanitized context was shared
- What action the AI requested
- What action was executed

### 🔌 Multiple AI Providers

The privacy layer can remain independent from the reasoning provider, allowing multiple AI models to operate behind the same privacy boundary.

### ⚙️ Advanced Browser Automation

Future versions can support more complex multi-step workflows while maintaining local privacy enforcement.

### 🏢 Enterprise Deployment

BrowseShield AI can be extended with centralized privacy policies, administrative controls, and organization-wide AI-access governance.

---

# 🌍 Expected Impact

### 👤 Individuals

Provides greater control over sensitive webpage information during AI-assisted browsing.

### 🏢 Enterprises

Supports privacy-aware AI browser automation for workflows involving confidential organizational information.

### 🏛️ Government

Can provide an additional privacy boundary for citizen and administrative information used in AI-assisted browser workflows.

### 💰 Finance

Can protect sensitive financial information before external AI reasoning.

### 🏥 Healthcare

Can provide a browser-level privacy boundary for sensitive user information before AI processing.

### 🎓 Education

Can support privacy-aware AI assistance for student and educational web workflows.

---

# 🎯 Vision

## BrowseShield AI → AI Data Firewall for the Browser

```text
User Data
    ↓
BrowseShield AI
    ↓
Privacy Enforcement
    ↓
Sanitized AI Context
    ↓
AI Reasoning
    ↓
Controlled Browser Action
```

BrowseShield AI aims to create a **browser-level privacy boundary between sensitive user data and external AI systems**.

The long-term goal is to enable useful AI browser automation without automatically providing cloud AI systems unrestricted access to everything visible in the user's browser.

---

# 📊 Development Status

### Working Browser AI Agent Prototype

**Implemented capabilities:**

✅ Local webpage scanning  
✅ Webpage content extraction  
✅ Sensitive-data detection  
✅ Placeholder-based redaction  
✅ Useful-context preservation  
✅ Sanitized context generation  
✅ FastAPI backend  
✅ Gemini reasoning  
✅ Structured browser actions  
✅ Browser element identification  
✅ Local action execution  
✅ Search-field detection  
✅ Exact-search support  
✅ End-to-end demonstration workflow  

**Current implementation:** Chrome Extension Manifest V3

---

# 🛡️ BrowseShield AI

### **Privacy-First Browser AI Agent**

> **Detect → Protect → Reason Safely → Act**

### **AI decides what to do. BrowseShield AI decides what AI can see.**