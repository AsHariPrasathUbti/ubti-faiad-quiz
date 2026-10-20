/**
 * Fabric Analyst in a Day — Storage & Data Persistence Engine
 * Browser-based persistence using localStorage with versioned keys:
 *  - fabricAnalystQuiz.responses.v1: All completed and in-progress participant responses
 *  - fabricAnalystQuiz.config.v1: Event & admin configurations
 *  - fabricAnalystQuiz.session.v1: Current active participant session state
 *
 * Security & Data Hygiene:
 *  - Formula Injection Protection for CSV exports
 *  - Safe schema validation for imports
 *  - Safe fallback for crypto.randomUUID()
 */

const STORAGE_KEYS = {
  RESPONSES: 'fabricAnalystQuiz.responses.v1',
  CONFIG: 'fabricAnalystQuiz.config.v1',
  ACTIVE_SESSION: 'fabricAnalystQuiz.session.v1',
  AUDIO_PREF: 'fabricAnalystQuiz.audioMuted.v1'
};

const DEFAULT_CONFIG = {
  eventTitle: "Fabric Analyst in a Day",
  eventSubtitle: "Discover Your Data. Challenge Your Knowledge. Explore Fabric.",
  organizerCompany: "Enterprise Data Solutions",
  speedBonusEnabled: true,
  participationPoints: 100,
  knowledgeBasePoints: 100,
  maxSpeedBonus: 50,
  soundEffectsEnabled: true,
  sharedHostMode: false,
  shuffleOptions: false,
  showCorrectAnswersAfterQuestion: true
};

const StorageManager = {
  /**
   * Generates a unique UUID v4 with safe fallback
   */
  generateUUID: function() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (e) {
        // Fallback if randomUUID fails in insecure context
      }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Safe getter from localStorage with JSON parsing & error fallback
   */
  get: function(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[StorageManager] Failed to parse key ${key}:`, err);
      return defaultValue;
    }
  },

  /**
   * Safe setter to localStorage
   */
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[StorageManager] Failed to save key ${key}:`, err);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   */
  remove: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  },

  /* =========================================================================
     Configuration Management
     ========================================================================= */
  getConfig: function() {
    const saved = this.get(STORAGE_KEYS.CONFIG, {});
    return Object.assign({}, DEFAULT_CONFIG, saved);
  },

  saveConfig: function(configUpdates) {
    const current = this.getConfig();
    const updated = Object.assign({}, current, configUpdates);
    this.set(STORAGE_KEYS.CONFIG, updated);
    return updated;
  },

  /* =========================================================================
     Response Management
     ========================================================================= */
  getAllResponses: function() {
    const list = this.get(STORAGE_KEYS.RESPONSES, []);
    return Array.isArray(list) ? list : [];
  },

  getResponseById: function(responseId) {
    const list = this.getAllResponses();
    return list.find(r => r.responseId === responseId) || null;
  },

  saveResponse: function(responseObj) {
    if (!responseObj || !responseObj.responseId) {
      console.error("[StorageManager] Cannot save response without responseId");
      return false;
    }
    const list = this.getAllResponses();
    const existingIndex = list.findIndex(r => r.responseId === responseObj.responseId);
    
    if (existingIndex >= 0) {
      list[existingIndex] = responseObj;
    } else {
      list.push(responseObj);
    }
    
    this.set(STORAGE_KEYS.RESPONSES, list);
    return true;
  },

  deleteResponse: function(responseId) {
    const list = this.getAllResponses();
    const filtered = list.filter(r => r.responseId !== responseId);
    this.set(STORAGE_KEYS.RESPONSES, filtered);
    return true;
  },

  clearAllData: function() {
    this.remove(STORAGE_KEYS.RESPONSES);
    this.remove(STORAGE_KEYS.ACTIVE_SESSION);
    return true;
  },

  /* =========================================================================
     Active Participant Session Management (for page refreshes)
     ========================================================================= */
  getActiveSession: function() {
    return this.get(STORAGE_KEYS.ACTIVE_SESSION, null);
  },

  saveActiveSession: function(sessionData) {
    this.set(STORAGE_KEYS.ACTIVE_SESSION, sessionData);
  },

  clearActiveSession: function() {
    this.remove(STORAGE_KEYS.ACTIVE_SESSION);
  },

  /* =========================================================================
     Leaderboard Calculation
     ========================================================================= */
  getLeaderboard: function() {
    const list = this.getAllResponses();
    // Sort by totalScore desc, then completedAt asc (earlier completion wins tie)
    return list
      .filter(r => r.status === 'completed' || (r.answers && r.answers.length > 0))
      .sort((a, b) => {
        if ((b.totalScore || 0) !== (a.totalScore || 0)) {
          return (b.totalScore || 0) - (a.totalScore || 0);
        }
        const timeA = new Date(a.completedAt || a.startedAt).getTime();
        const timeB = new Date(b.completedAt || b.startedAt).getTime();
        return timeA - timeB;
      });
  },

  /* =========================================================================
     CSV Export Logic with Formula Injection Mitigation
     ========================================================================= */

  /**
   * Neutralizes formula injection characters (=, +, -, @, tab, cr)
   * by prefixing with single quote (') according to OWASP guidelines.
   */
  sanitizeCSVCell: function(value) {
    if (value === null || value === undefined) return '';
    let stringVal = String(value);

    // Strip carriage returns and standardize newlines
    stringVal = stringVal.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Protect against Spreadsheet Formula Injection
    const firstChar = stringVal.charAt(0);
    if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
      stringVal = "'" + stringVal;
    }

    // Wrap in quotes if it contains commas, quotes, or newlines
    if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes(';')) {
      stringVal = '"' + stringVal.replace(/"/g, '""') + '"';
    }

    return stringVal;
  },

  /**
   * Export All Participants (1 row per participant)
   */
  exportParticipantsCSV: function(responsesList = null) {
    const list = responsesList || this.getAllResponses();
    if (!list.length) {
      alert("No participant records available to export.");
      return;
    }

    const headers = [
      "Response ID",
      "Participant Name",
      "Email Address",
      "Company / Org",
      "Team / Tag",
      "Started At",
      "Completed At",
      "Status",
      "Total Score",
      "Knowledge Score",
      "Speed Bonus",
      "Questions Answered",
      "Correct Answers Count"
    ];

    const rows = list.map(r => {
      const p = r.participant || {};
      const answers = Array.isArray(r.answers) ? r.answers : [];
      const correctCount = answers.filter(a => a.isCorrect === true).length;
      
      return [
        r.responseId || '',
        p.name || '',
        p.email || '',
        p.company || '',
        p.team || '',
        r.startedAt || '',
        r.completedAt || '',
        r.status || 'in-progress',
        r.totalScore || 0,
        r.knowledgeScore || 0,
        r.speedBonusTotal || 0,
        answers.length,
        correctCount
      ].map(this.sanitizeCSVCell).join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    this.downloadBlob(csvContent, `fabric_analyst_participants_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export All Question-Level Responses (1 row per question response)
   */
  exportQuestionResponsesCSV: function(responsesList = null) {
    const list = responsesList || this.getAllResponses();
    if (!list.length) {
      alert("No question responses available to export.");
      return;
    }

    const headers = [
      "Response ID",
      "Participant Name",
      "Email Address",
      "Company",
      "Question ID",
      "Category",
      "Question Text",
      "Participant Answer",
      "Correctness",
      "Points Earned",
      "Time Taken (Seconds)",
      "Answer Timestamp",
      "Overall Quiz Status"
    ];

    const rows = [];
    list.forEach(r => {
      const p = r.participant || {};
      const answers = Array.isArray(r.answers) ? r.answers : [];
      
      answers.forEach(a => {
        let answerText = '';
        if (Array.isArray(a.answer)) {
          answerText = a.answer.join('; ');
        } else if (a.answer !== null && a.answer !== undefined) {
          answerText = String(a.answer);
        } else {
          answerText = '[Unanswered / Skipped]';
        }

        let correctness = 'N/A (Survey)';
        if (a.isCorrect === true) correctness = 'Correct';
        else if (a.isCorrect === false) correctness = 'Incorrect';

        rows.push([
          r.responseId || '',
          p.name || '',
          p.email || '',
          p.company || '',
          a.questionId || '',
          a.category || '',
          a.questionText || '',
          answerText,
          correctness,
          a.pointsEarned || 0,
          a.timeTakenSeconds || 0,
          a.answeredAt || '',
          r.status || 'in-progress'
        ].map(this.sanitizeCSVCell).join(','));
      });
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    this.downloadBlob(csvContent, `fabric_analyst_question_responses_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export complete raw JSON dataset
   */
  exportRawJSON: function() {
    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      platform: "Fabric Analyst in a Day Quiz Engine",
      config: this.getConfig(),
      responses: this.getAllResponses()
    };

    const jsonString = JSON.stringify(payload, null, 2);
    this.downloadBlob(jsonString, `fabric_analyst_dataset_${Date.now()}.json`, 'application/json;charset=utf-8;');
  },

  /**
   * Helper to download Blob data
   */
  downloadBlob: function(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  },

  /* =========================================================================
     JSON Import Engine with Validation & Merging
     ========================================================================= */
  validateImportPayload: function(jsonObj) {
    if (!jsonObj || typeof jsonObj !== 'object') {
      return { valid: false, message: "Invalid JSON format: root is not an object." };
    }

    let records = [];
    if (Array.isArray(jsonObj)) {
      records = jsonObj;
    } else if (Array.isArray(jsonObj.responses)) {
      records = jsonObj.responses;
    } else {
      return { valid: false, message: "No valid responses array found in imported file." };
    }

    // Validate structure of records
    const validRecords = [];
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (rec && typeof rec === 'object' && rec.responseId && rec.participant) {
        validRecords.push(rec);
      }
    }

    if (validRecords.length === 0) {
      return { valid: false, message: "Found 0 valid participant response records in payload." };
    }

    return {
      valid: true,
      records: validRecords,
      totalCount: validRecords.length,
      hasConfig: !!(jsonObj.config && typeof jsonObj.config === 'object'),
      config: jsonObj.config || null
    };
  },

  importJSONData: function(jsonObj, mode = 'merge') {
    const validation = this.validateImportPayload(jsonObj);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const incomingRecords = validation.records;
    let finalRecords = [];

    if (mode === 'replace') {
      finalRecords = incomingRecords;
    } else {
      // Merge mode: Add or update records without duplicate IDs
      const current = this.getAllResponses();
      const currentMap = new Map();
      current.forEach(r => currentMap.set(r.responseId, r));

      incomingRecords.forEach(rec => {
        currentMap.set(rec.responseId, rec);
      });

      finalRecords = Array.from(currentMap.values());
    }

    this.set(STORAGE_KEYS.RESPONSES, finalRecords);

    // If config was included in backup, optionally merge
    if (validation.hasConfig) {
      this.saveConfig(validation.config);
    }

    return {
      success: true,
      importedCount: incomingRecords.length,
      totalCount: finalRecords.length
    };
  },

  /* =========================================================================
     Demo / Sample Data Generator for testing and presentations
     ========================================================================= */
  seedSampleData: function() {
    const sampleParticipants = [
      { name: "Priya Sharma", email: "priya.sharma@contoso-analytics.com", company: "Contoso Analytics", team: "Core BI", scoreBonus: 1.0 },
      { name: "Alexandre Dubois", email: "a.dubois@fabrikam-corp.com", company: "Fabrikam Corp", team: "Cloud Data", scoreBonus: 0.95 },
      { name: "Marcus Vance", email: "mvance@northwind-traders.org", company: "Northwind Traders", team: "Enterprise Arch", scoreBonus: 0.9 },
      { name: "Sarah Chen", email: "sarah.chen@adatum-financial.com", company: "Adatum Financial", team: "Risk & Insights", scoreBonus: 0.85 },
      { name: "David Miller", email: "dmiller@woodgrove-bank.com", company: "Woodgrove Bank", team: "Data Eng", scoreBonus: 0.8 },
      { name: "Elena Rostova", email: "elena.r@alpine-ski.com", company: "Alpine Ski House", team: "Business Ops", scoreBonus: 0.75 },
      { name: "Kofi Mensah", email: "kofi.mensah@litware-inc.com", company: "Litware Inc", team: "Analytics Hub", scoreBonus: 0.7 },
      { name: "Rachel Adams", email: "radams@adventure-works.com", company: "Adventure Works", team: "Supply Chain BI", scoreBonus: 0.65 },
      { name: "Tariq Al-Mansoor", email: "tariq.m@wide-world-importers.com", company: "Wide World Importers", team: "Data Science", scoreBonus: 0.6 },
      { name: "Jessica Taylor", email: "jtaylor@proseware.net", company: "Proseware Corp", team: "Executive Reporting", scoreBonus: 0.55 }
    ];

    const questions = (typeof DEFAULT_QUESTIONS !== 'undefined') ? DEFAULT_QUESTIONS : [];
    if (!questions.length) return false;

    const generated = [];
    const now = Date.now();

    sampleParticipants.forEach((p, idx) => {
      const respId = this.generateUUID();
      const startTime = new Date(now - (idx * 15 + 10) * 60000).toISOString();
      const completedTime = new Date(now - (idx * 15 + 2) * 60000).toISOString();
      let totalScore = 0;
      let knowledgeScore = 0;
      let speedBonusTotal = 0;

      const answers = questions.map((q, qIdx) => {
        let answerVal;
        let isCorrect = null;
        let points = 0;
        const timeTaken = Math.floor(Math.random() * 12) + 5;

        if (q.scoringMode === 'knowledge') {
          // Top participants get knowledge questions right
          const isRight = (idx < 5) || (Math.random() > 0.3);
          if (isRight) {
            answerVal = q.correctAnswer;
            isCorrect = true;
            const speedRatio = Math.max(0, (q.timeLimit - timeTaken) / q.timeLimit);
            const speedBonus = Math.round(speedRatio * 50);
            points = q.points + speedBonus;
            knowledgeScore += q.points;
            speedBonusTotal += speedBonus;
          } else {
            // Pick wrong option
            const wrongOptions = q.options.filter(o => o !== q.correctAnswer);
            answerVal = wrongOptions[Math.floor(Math.random() * wrongOptions.length)] || q.options[0];
            isCorrect = false;
            points = 0;
          }
        } else if (q.type === 'multi-select') {
          // Pick 1 to 3 random options
          const numPicks = Math.floor(Math.random() * 3) + 1;
          const shuffled = [...q.options].sort(() => 0.5 - Math.random());
          answerVal = shuffled.slice(0, numPicks);
          points = q.points; // participation
        } else if (q.type === 'short-text') {
          const sampleFeedback = [
            "How does OneLake handle cross-tenant data governance?",
            "What is the recommended migration path from Synapse Dedicated pools?",
            "Can we use custom PySpark libraries in Fabric Notebooks?",
            "How do F-SKU auto-pause and burst capabilities work in production?",
            "Best practices for Direct Lake semantic modeling on multi-terabyte datasets."
          ];
          answerVal = sampleFeedback[idx % sampleFeedback.length];
          points = q.points;
        } else {
          // Single choice survey
          answerVal = q.options[idx % q.options.length];
          points = q.points; // participation
        }

        totalScore += points;

        return {
          questionId: q.id,
          category: q.category,
          questionText: q.question,
          answer: answerVal,
          answeredAt: new Date(new Date(startTime).getTime() + (qIdx * 25 * 1000)).toISOString(),
          timeTakenSeconds: timeTaken,
          pointsEarned: points,
          isCorrect: isCorrect
        };
      });

      generated.push({
        responseId: respId,
        participant: {
          name: p.name,
          email: p.email,
          company: p.company,
          team: p.team
        },
        startedAt: startTime,
        completedAt: completedTime,
        status: "completed",
        answers: answers,
        totalScore: totalScore,
        knowledgeScore: knowledgeScore,
        knowledgeTotal: 200,
        speedBonusTotal: speedBonusTotal
      });
    });

    this.set(STORAGE_KEYS.RESPONSES, generated);
    return true;
  }
};

// Make available globally in browser window
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.STORAGE_KEYS = STORAGE_KEYS;
}
