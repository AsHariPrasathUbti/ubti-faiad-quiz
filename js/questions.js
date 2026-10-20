/**
 * Fabric Analyst in a Day — 15 Curated Event Questions
 * Client Workshop by UB Technology Innovations Inc.
 * 
 * Structure:
 *  - Section A: Current Data Landscape (Q01 - Q05)
 *  - Section B: Microsoft Fabric Awareness (Q06 - Q10, with Knowledge Checks Q08 & Q09)
 *  - Section C: Licensing and Readiness (Q11 - Q13)
 *  - Section D: Goals & Session Priorities (Q14 - Q15)
 * 
 * Exactly 15 questions, each with 4 to 5 concise options.
 */

const DEFAULT_QUESTIONS = [
  // =========================================================================
  // Section A: Current Data Landscape
  // =========================================================================
  {
    id: "Q01",
    category: "Data Landscape",
    type: "single-choice",
    question: "Which data warehouse or analytics platform does your organization currently use?",
    hint: "Select your primary data warehousing solution.",
    options: [
      "Microsoft Fabric",
      "Azure Synapse Analytics",
      "Snowflake",
      "Databricks",
      "Other"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: true,
    required: true,
    explanation: "Understanding your current platform landscape helps us highlight relevant migration, shortcutting, and interoperability paths."
  },
  {
    id: "Q02",
    category: "Data Landscape",
    type: "single-choice",
    question: "Approximately how many data sources does your organization manage?",
    hint: "Include databases, APIs, ERPs, SaaS apps, and file shares.",
    options: [
      "1–5 sources",
      "6–20 sources",
      "21–50 sources",
      "More than 50 sources"
    ],
    timeLimit: 20,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Managing disparate sources is where OneLake's shortcuts and Data Factory's 150+ native connectors shine."
  },
  {
    id: "Q03",
    category: "Data Landscape",
    type: "multi-select",
    question: "Where is most of your data currently stored?",
    hint: "Choose all cloud and on-premises environments that apply.",
    options: [
      "On-premises data centers",
      "Microsoft Azure",
      "AWS / Google Cloud",
      "Microsoft 365 / SharePoint",
      "Other"
    ],
    timeLimit: 30,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: true,
    required: true,
    explanation: "Modern multi-cloud environments benefit greatly from unified governance via Microsoft Purview and OneLake shortcuts."
  },
  {
    id: "Q04",
    category: "Data Landscape",
    type: "multi-select",
    question: "What are your primary analytics and reporting tools?",
    hint: "Select all tools actively used across your teams.",
    options: [
      "Power BI",
      "Excel",
      "Tableau",
      "SQL Reporting (SSRS)",
      "Other"
    ],
    timeLimit: 30,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: true,
    required: true,
    explanation: "Power BI Direct Lake mode provides direct queries on OneLake delta tables without import refresh delays!"
  },
  {
    id: "Q05",
    category: "Data Landscape",
    type: "single-choice",
    question: "What is your biggest data challenge today?",
    hint: "Identify the most prominent obstacle your business faces.",
    options: [
      "Data silos & fragmentation",
      "Data quality & accuracy",
      "Slow reporting & refresh delays",
      "High platform / compute costs",
      "Complex integration & skills gap"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Fabric unifies storage, compute, and governance into a SaaS experience to address silos and operational complexity."
  },

  // =========================================================================
  // Section B: Microsoft Fabric Awareness
  // =========================================================================
  {
    id: "Q06",
    category: "Fabric Awareness",
    type: "single-choice",
    question: "Have you worked with Microsoft Fabric before?",
    hint: "Let us know your current familiarity level.",
    options: [
      "Using Fabric in production",
      "Completed a proof of concept (PoC)",
      "Attended a demo or training",
      "Exploring it for the first time today"
    ],
    timeLimit: 20,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Regardless of your experience level, today's hands-on session will provide practical skills you can apply immediately."
  },
  {
    id: "Q07",
    category: "Fabric Awareness",
    type: "multi-select",
    question: "Which Microsoft Fabric workloads have you explored?",
    hint: "Select all experiences you have interacted with.",
    options: [
      "OneLake & Lakehouse",
      "Synapse Data Warehouse",
      "Data Factory (Pipelines & Dataflows)",
      "Power BI Direct Lake",
      "Real-Time Intelligence & AI"
    ],
    timeLimit: 30,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "All Fabric workloads share a single SaaS architecture, compute pool, and Delta Parquet storage in OneLake."
  },
  {
    id: "Q08",
    category: "Fabric Awareness",
    type: "single-choice",
    question: "What is Microsoft OneLake primarily designed to provide?",
    hint: "🧠 Knowledge Check — think about the core concept of the 'OneDrive for Data'.",
    options: [
      "A unified logical data lake for an organization",
      "An email hosting platform",
      "A desktop operating system",
      "A CRM sales application"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "knowledge",
    correctAnswer: "A unified logical data lake for an organization",
    allowCustomAnswer: false,
    required: true,
    explanation: "Microsoft OneLake is the 'OneDrive for Data' — a single, unified logical SaaS data lake spanning all workspaces and domains."
  },
  {
    id: "Q09",
    category: "Fabric Awareness",
    type: "single-choice",
    question: "Which Fabric experience is primarily designed for SQL-based data warehousing?",
    hint: "🧠 Knowledge Check — ACID transactions, cross-database queries, and T-SQL support.",
    options: [
      "Warehouse",
      "Data Science",
      "Real-Time Intelligence",
      "Power BI report canvas"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "knowledge",
    correctAnswer: "Warehouse",
    allowCustomAnswer: false,
    required: true,
    explanation: "Fabric Synapse Data Warehouse provides industry-standard T-SQL queries, ACID transactions, and full separation of compute and storage."
  },
  {
    id: "Q10",
    category: "Fabric Awareness",
    type: "single-choice",
    question: "Which language or tool do you use most often for data transformation?",
    hint: "Select your team's most frequent data preparation tool.",
    options: [
      "SQL / T-SQL",
      "Python / PySpark",
      "Power Query (M)",
      "Visual ETL / Pipelines",
      "Other"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: true,
    required: true,
    explanation: "Fabric supports code-free (Dataflows Gen2 / Data Factory) and code-first (Notebooks with PySpark, Spark SQL, Python, R) pipelines."
  },

  // =========================================================================
  // Section C: Licensing and Readiness
  // =========================================================================
  {
    id: "Q11",
    category: "Licensing & Readiness",
    type: "single-choice",
    question: "Which Microsoft Fabric or Power BI licensing arrangement does your organization currently have?",
    hint: "Licensing names and entitlements may change; validate agreements with your Microsoft partner.",
    options: [
      "Microsoft Fabric capacity (F-SKUs)",
      "Power BI Premium Per User (PPU)",
      "Power BI Pro",
      "Microsoft 365 / Free",
      "Not sure"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Fabric capacity (F2 through F2048) pools compute for all workloads, while Power BI Pro/PPU licenses govern report sharing."
  },
  {
    id: "Q12",
    category: "Licensing & Readiness",
    type: "single-choice",
    question: "Does your organization currently have a Microsoft Fabric capacity?",
    hint: "Fabric capacity enables all lakehouse, warehouse, and real-time workloads.",
    options: [
      "Yes — active capacity",
      "No — not yet",
      "Currently in Trial / Evaluation",
      "Not sure"
    ],
    timeLimit: 20,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Microsoft offers a free 60-day Fabric trial capacity with 64 CUs (F64 equivalent) to test and build proofs of concept."
  },
  {
    id: "Q13",
    category: "Licensing & Readiness",
    type: "single-choice",
    question: "How familiar is your team with Power BI?",
    hint: "Rate your team's collective data visualization expertise.",
    options: [
      "Beginner — basic dashboards",
      "Intermediate — DAX & modeling",
      "Advanced — enterprise datasets & CI/CD",
      "Not currently using Power BI"
    ],
    timeLimit: 20,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Fabric is built on the Power BI foundation, making adoption intuitive for teams with existing Power BI experience."
  },

  // =========================================================================
  // Section D: Goals & Session Priorities
  // =========================================================================
  {
    id: "Q14",
    category: "Goals & Priorities",
    type: "single-choice",
    question: "What is your top priority for a modern analytics platform?",
    hint: "Select the single most strategic initiative.",
    options: [
      "Unified platform & single source of truth",
      "Faster reporting & Direct Lake speed",
      "Lower infrastructure costs",
      "AI & Copilot capabilities",
      "Self-service analytics for business"
    ],
    timeLimit: 25,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "Fabric's unified lake and Copilot AI capabilities aim to deliver across each of these critical priorities."
  },
  {
    id: "Q15",
    category: "Goals & Priorities",
    type: "multi-select",
    question: "Which workload would you most like to explore during today's Fabric session?",
    hint: "Select your priority workloads.",
    options: [
      "Lakehouse & Medallion architecture",
      "Data Warehouse & T-SQL",
      "Data Factory (ETL Pipelines)",
      "Power BI Direct Lake mode",
      "Purview Governance & Security"
    ],
    timeLimit: 30,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: true,
    explanation: "UB Technology Innovations Inc. will tailor live hands-on walkthroughs based on your collective preferences in this session!"
  },
  {
    id: "Q16",
    category: "Challenges & Support",
    type: "textarea",
    question: "What are your current business and data challenges, and what support do you require from our team?",
    hint: "Please share a brief paragraph describing your current data platform bottlenecks, migration goals, or training/consulting support required.",
    options: [],
    timeLimit: 120,
    points: 100,
    scoringMode: "participation",
    correctAnswer: null,
    allowCustomAnswer: false,
    required: false,
    explanation: "Thank you for sharing your feedback! The UB Technology Innovations Inc. specialist team will review your business requirements and provide tailored guidance."
  }
];

// Helper functions for question access and manipulation
const QuestionBank = {
  getAll: () => DEFAULT_QUESTIONS,
  getById: (id) => DEFAULT_QUESTIONS.find(q => q.id === id),
  getCategories: () => [...new Set(DEFAULT_QUESTIONS.map(q => q.category))],
  getStats: () => ({
    total: DEFAULT_QUESTIONS.length,
    knowledgeCount: DEFAULT_QUESTIONS.filter(q => q.scoringMode === 'knowledge').length,
    surveyCount: DEFAULT_QUESTIONS.filter(q => q.scoringMode === 'participation').length,
    categories: QuestionBank.getCategories()
  })
};

if (typeof window !== 'undefined') {
  window.DEFAULT_QUESTIONS = DEFAULT_QUESTIONS;
  window.QuestionBank = QuestionBank;
}
