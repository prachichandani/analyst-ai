# Analyst AI — HedgeMind

> **An AI-powered financial analyst that can query structured financial data, analyze custom datasets, search the web for current information, and turn findings into interactive visual reports.**

HedgeMind is a conversational financial analysis workspace built with **Next.js and the Vercel AI SDK**.

Instead of limiting an LLM to text generation, HedgeMind gives it access to specialized tools for **database querying, web search, data visualization, custom dataset analysis, and report generation**.

---

## ✨ What Makes HedgeMind Different?

HedgeMind supports **two analysis modes**:

### 📊 Financial Database Mode

A built-in PostgreSQL database containing:

* Hedge funds
* Securities
* Holdings
* Performance metrics
* Macroeconomic indicators

Users can ask questions in natural language and the AI can translate those questions into read-only database queries, analyze the results, and present them visually.

### 🗄️ Custom Database Mode

Users can upload their own **SQLite (`.db` / `.sqlite`) databases** and analyze them conversationally.

The application processes the uploaded database, extracts its schema, and allows the AI to query the user's data without requiring the user to write SQL themselves.

---

## 🤖 AI Tooling

The AI can use different tools depending on what a request requires:

| Tool                               | Purpose                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| `queryDatabase`                    | Query the built-in financial PostgreSQL database             |
| `queryUploadedDatabase`            | Query user-uploaded SQLite databases                         |
| `webSearch`                        | Retrieve current market and news information                 |
| `renderChart`                      | Generate interactive charts from analytical results          |
| `renderArtifact`                   | Create custom HTML dashboards and visualizations             |
| `presentAnalysis`                  | Structure findings, insights, anomalies, and recommendations |
| `renderDcaCalculator`              | Generate an interactive DCA calculator                       |
| `renderCompoundInterestCalculator` | Generate an interactive compound-interest calculator         |

This allows the application to move through a workflow like:

```text
User Question
     ↓
AI determines what information is needed
     ↓
Select appropriate tool(s)
     ↓
Execute tool
     ↓
Analyze results
     ↓
Generate structured response
     ↓
Visualize / present findings
```

---

## 🚀 Key Features

* **Streaming AI responses** with real-time tool execution
* **Natural-language database analysis**
* **Read-only SQL querying**
* **Custom SQLite database uploads**
* **Web search for current financial information**
* **Interactive charts and tables**
* **AI-generated analytical insights**
* **Custom HTML artifacts and dashboards**
* **PDF report generation**
* **Persistent conversation history**
* **User-specific database management**
* **Configurable AI reasoning levels**
* **Session-based authentication**
* **Secure file uploads using Supabase Storage signed URLs**

---

## 📑 From Analysis to Report

HedgeMind can turn an analysis into a downloadable PDF report containing:

* Executive summary
* KPI cards
* Visualizations
* Analyst insights
* Data appendix

This allows the output of an AI conversation to become a structured analytical artifact rather than remaining inside the chat.

---

## 🧠 Architecture

```text
                         User
                           │
                           ▼
                    Next.js Application
                           │
                           ▼
                   AI SDK + OpenAI
                           │
                    Tool Orchestration
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
     PostgreSQL        SQLite Data       Web Search
   Financial Data     User Uploads        Tavily
          │                │                 │
          └────────────────┼─────────────────┘
                           ▼
                    Analysis / Insights
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             Charts     Artifacts    Reports
                │          │          │
                └──────────┴──────────┘
                           ▼
                         User
```

---

## 🛠️ Tech Stack

### Frontend

* **Next.js 16** — App Router
* **React 19**
* **TypeScript**
* **Tailwind CSS**
* **shadcn/ui**
* **Recharts**

### AI

* **Vercel AI SDK**
* **OpenAI**
* Tool Calling
* Streaming Responses
* Agentic Workflows

### Backend & Data

* **Next.js API Routes**
* **Supabase / PostgreSQL**
* **SQL.js** — SQLite processing
* **Zod**

### External Services

* **Tavily** — web search
* **Supabase Storage** — database file storage

### Reporting

* **jsPDF**
* **html2canvas**

---

## 🔐 Security

Because the application works with user databases and database queries, security was an important part of the implementation.

* Database queries are restricted to **read-only operations**
* SQL injection protection is applied to database queries
* Uploaded databases are associated with their respective users
* Authentication is enforced through sessions and middleware
* Production cookies use secure settings
* Supabase service-role credentials are kept server-side
* SQLite files are uploaded through signed Supabase Storage URLs rather than passing large files through the application server

---

## 🗂️ Project Structure

```text
analyst-ai/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── databases/
│   │   ├── messages/
│   │   ├── upload-db/
│   │   ├── users/
│   │   └── report-insights/
│   │
│   ├── components/
│   ├── actions.ts
│   ├── middleware.ts
│   └── page.tsx
│
├── lib/
│   ├── chatHandlers.ts
│   ├── prompts/
│   ├── db/
│   ├── postgres/
│   ├── supabase/
│   ├── tavily/
│   └── chart/
│
├── public/
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## 💻 Getting Started

### Prerequisites

* Node.js 20+
* npm
* Supabase project
* PostgreSQL database
* OpenAI / LiteLLM API access
* Tavily API key

### Installation

```bash
git clone https://github.com/prachichandani/analyst-ai.git

cd analyst-ai

npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=

LITELLM_API_KEY=

TAVILY_API_KEY=

SESSION_SECRET=
```

### Run Locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## 📸 Screenshots

*Add 3–4 screenshots here showing:*

1. Main AI interface
2. Financial database analysis + chart
3. Custom SQLite database analysis
4. Generated PDF report

---

## 🎯 Example Workflow

### Analyze Financial Data

```text
"Which hedge funds increased their exposure
to technology stocks over the last quarter?"
```

HedgeMind can:

```text
Natural Language Question
          ↓
Database Query
          ↓
Financial Data
          ↓
Analysis
          ↓
Chart + Insights
```

### Analyze a Custom Dataset

```text
Upload SQLite database
          ↓
Schema extraction
          ↓
Ask questions conversationally
          ↓
AI generates database queries
          ↓
Results + analysis + visualization
```

---

## 🔗 Links

**GitHub:**
https://github.com/prachichandani/analyst-ai

**Live Demo:**
*Add your deployed application URL here*

---

## Why I Built This

I wanted to explore what an AI application looks like when an LLM is given access to **real tools and structured data instead of being limited to conversation**.

Building HedgeMind gave me the opportunity to work with **LLM tool calling, streaming, database querying, file processing, external APIs, authentication, data visualization, and report generation** as parts of one system.

The interesting part wasn't just connecting an LLM to the application — it was figuring out **how the model should interact with the different capabilities around it and how those results should become useful output for the user.**
