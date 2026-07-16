# Claude.ai Clone (Multi-Provider Chat Interface)

A premium web application clone of Claude.ai, built using Flask and SQLite with support for streaming completions from multiple LLM providers: OpenAI, Google Gemini, Groq, Moonshot Kimi, and OpenRouter.

## Features

- **High-Fidelity Claude.ai UI**: Side navigation with search, responsive mobile views, conversation history list, auto-resizing input textarea, and dark/light themes.
- **Multi-Provider LLM Integration**: Single abstraction interface supporting OpenAI, Google Gemini, Groq, Kimi, and OpenRouter.
- **Server-Sent Events (SSE)**: Streams text tokens in real time to the frontend via a `ReadableStream` decoder.
- **SQLite Database Persistence**: Stores conversations and messages locally using SQLAlchemy, including auto-updating thread titles and cascade deletes.
- **Markdown & Highlight.js Render**: Supports lists, tables, headers, and code block formatting with syntax highlighting and a "Copy Code" button.
- **Dynamic Key Checking**: Grays out models in the selector when their respective API keys are missing from `.env` and shows explanatory tooltips.
- **File Upload Integration**: Supports attaching code or text files (e.g. `.txt`, `.py`, `.js`, `.json`) and injecting their contents into the chat context.
- **Abort controller**: Allows user to stop model token generation mid-stream.

---

## Getting Started

### 1. Prerequisites

Make sure you have Python 3.10+ and `pip` installed.

### 2. Clone/Prepare the Directory

Ensure the directory contains the following file tree:
```text
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── models.py
│   ├── registry.py
│   ├── blueprints/
│   │   ├── __init__.py
│   │   ├── chat.py
│   │   ├── models_bp.py
│   │   └── pages.py
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── openai_provider.py
│   │   ├── gemini_provider.py
│   │   ├── groq_provider.py
│   │   ├── kimi_provider.py
│   │   └── openrouter_provider.py
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── app.js
│   └── templates/
│       └── index.html
├── config.py
├── main.py
├── requirements.txt
├── .env.example
└── README.md
```

### 3. Setup Virtual Environment

Create and activate a Python virtual environment:

#### Windows (PowerShell)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### macOS/Linux
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies

Install the packages from `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 5. Setup Environment Variables

Rename `.env.example` to `.env` and fill in the API keys for the providers you wish to use:

```env
# Flask configuration
FLASK_SECRET_KEY=supersecretkey-change-me
FLASK_DEBUG=True

# LLM Providers API Keys (only populate those you have keys for; the others will be grayed out in dropdown)
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
KIMI_API_KEY=your-kimi-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

### 6. Run the Application

Start the Flask server:
```bash
python main.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## Architecture Overview

1. **`app/providers/`**: Custom provider adapters implementing a unified `ChatProvider` interface. Contains adapters wrapping Google's GenAI SDK and the OpenAI client.
2. **`app/registry.py`**: Controls model-to-provider mappings and evaluates API key presence to supply metadata to `/api/models`.
3. **`app/blueprints/chat.py`**: Connects SQLite and SSE streaming. It persists conversations and messages dynamically and streams completions using a generator function.
4. **`app/static/js/app.js`**: Fetches the stream, parses incoming JSON lines, runs the `marked.js` markdown parser, and binds code block actions.
"# cluade-clone-" 
"# cluade-clone-" 
