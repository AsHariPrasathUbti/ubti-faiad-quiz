/**
 * Fabric Analyst in a Day — Admin Dashboard Engine (admin.js)
 * Implements:
 *  - Real-time KPI Metric Aggregation
 *  - Dynamic Chart.js Analytics (8 analytical views with dark-mode styling)
 *  - Multidimensional Live Filtering & Search
 *  - Sortable & Paginated Participants Table
 *  - Participant Response Inspector Modal
 *  - CSV Exports (Participants, Question-level, Filtered) with Formula Injection Protection
 *  - JSON Full-Dataset Export & Validated Import (Merge / Replace)
 *  - Configuration Management & Demo Seed Data Generation
 *  - Print-Ready Report Styling
 */

(function () {
  'use strict';

  // Chart instances registry for clean re-renders
  const ChartInstances = {};

  const AdminState = {
    responses: [],
    filteredResponses: [],
    activeTab: 'overview',
    sortColumn: 'totalScore',
    sortAscending: false,
    filters: {
      search: '',
      company: '',
      status: '',
      scoreRange: '',
      questionId: '',
      questionAnswer: ''
    }
  };

  /* =========================================================================
     Admin Authentication Guard
     Credentials:
       Username: ubtiadmin
       Password: FAIAD@2026
     ========================================================================= */
  const AUTH_KEY = 'ubti_admin_auth_v1';
  const VALID_USER = 'ubtiadmin';
  const VALID_PASS = 'FAIAD@2026';

  function isAuth() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  }

  function setAuth(val) {
    if (val) {
      sessionStorage.setItem(AUTH_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_KEY);
    }
  }

  function checkAuthUI() {
    const loginView = document.getElementById('view-admin-login');
    const dashView = document.getElementById('view-admin-dashboard');
    const actionsBar = document.getElementById('admin-actions-bar');

    if (isAuth()) {
      if (loginView) loginView.classList.add('d-none');
      if (dashView) dashView.classList.remove('d-none');
      if (actionsBar) {
        actionsBar.classList.remove('d-none');
        actionsBar.style.display = 'inline-flex';
      }

      // Initialize & render admin dashboard
      loadResponsesFromStorage();
      populateCompanyFilter();
      populateQuestionFilterOptions();
      applyFilters();
      initCharts();
      loadConfigForm();
    } else {
      if (loginView) loginView.classList.remove('d-none');
      if (dashView) dashView.classList.add('d-none');
      if (actionsBar) {
        actionsBar.classList.add('d-none');
        actionsBar.style.display = 'none';
      }

      // Destroy charts on logout
      Object.keys(ChartInstances).forEach(k => {
        if (ChartInstances[k]) {
          try { ChartInstances[k].destroy(); } catch (_) {}
          delete ChartInstances[k];
        }
      });
    }
  }

  /* =========================================================================
     Initialization
     ========================================================================= */
  function initAdmin() {
    setupEventListeners();
    checkAuthUI();
  }

  function loadResponsesFromStorage() {
    AdminState.responses = StorageManager.getAllResponses();
  }

  /* =========================================================================
     Event Listeners
     ========================================================================= */
  function setupEventListeners() {
    // Admin Authentication Form Handlers
    const loginForm = document.getElementById('admin-login-form');
    const userInput = document.getElementById('admin-user');
    const passInput = document.getElementById('admin-pass');
    const loginError = document.getElementById('admin-login-error');
    const togglePassBtn = document.getElementById('btn-toggle-pass');

    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePassBtn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = (userInput ? userInput.value : '').trim();
        const p = (passInput ? passInput.value : '').trim();

        if (u === VALID_USER && p === VALID_PASS) {
          if (loginError) loginError.classList.add('d-none');
          setAuth(true);
          showToast('Welcome, ubtiadmin! Admin console unlocked.', 'success');
          checkAuthUI();
        } else {
          if (loginError) {
            loginError.classList.remove('d-none');
            const errText = document.getElementById('admin-login-error-text');
            if (errText) errText.textContent = 'Invalid username or password. Please verify your credentials.';
          }
          if (passInput) {
            passInput.value = '';
            passInput.focus();
          }
        }
      });
    }

    // Admin Logout Button
    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Log out of the Admin Console?')) {
          setAuth(false);
          showToast('Logged out of Admin Console.', 'info');
          if (userInput) userInput.value = '';
          if (passInput) passInput.value = '';
          if (loginError) loginError.classList.add('d-none');
          checkAuthUI();
        }
      });
    }

    // Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        switchAdminTab(tab);
      });
    });

    // Filter Inputs
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        AdminState.filters.search = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }

    const companySelect = document.getElementById('filter-company');
    if (companySelect) {
      companySelect.addEventListener('change', (e) => {
        AdminState.filters.company = e.target.value;
        applyFilters();
      });
    }

    const statusSelect = document.getElementById('filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        AdminState.filters.status = e.target.value;
        applyFilters();
      });
    }

    const scoreSelect = document.getElementById('filter-score');
    if (scoreSelect) {
      scoreSelect.addEventListener('change', (e) => {
        AdminState.filters.scoreRange = e.target.value;
        applyFilters();
      });
    }

    const questionSelect = document.getElementById('filter-question');
    if (questionSelect) {
      questionSelect.addEventListener('change', (e) => {
        AdminState.filters.questionId = e.target.value;
        updateQuestionAnswerDropdown(e.target.value);
        applyFilters();
      });
    }

    const answerSelect = document.getElementById('filter-answer');
    if (answerSelect) {
      answerSelect.addEventListener('change', (e) => {
        AdminState.filters.questionAnswer = e.target.value;
        applyFilters();
      });
    }

    const resetFiltersBtn = document.getElementById('btn-reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', resetAllFilters);
    }

    // Export Buttons
    document.getElementById('btn-export-participants-csv')?.addEventListener('click', () => {
      StorageManager.exportParticipantsCSV(AdminState.responses);
    });

    document.getElementById('btn-export-responses-csv')?.addEventListener('click', () => {
      StorageManager.exportQuestionResponsesCSV(AdminState.responses);
    });

    document.getElementById('btn-export-filtered-csv')?.addEventListener('click', () => {
      StorageManager.exportParticipantsCSV(AdminState.filteredResponses);
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      StorageManager.exportRawJSON();
    });

    // Print Report
    document.getElementById('btn-print-report')?.addEventListener('click', () => {
      window.print();
    });

    // Import JSON Modal
    const importModal = document.getElementById('modal-import');
    document.getElementById('btn-open-import-modal')?.addEventListener('click', () => {
      if (importModal) importModal.classList.add('show');
    });

    document.getElementById('close-import-modal')?.addEventListener('click', () => {
      if (importModal) importModal.classList.remove('show');
    });

    document.getElementById('import-file-input')?.addEventListener('change', handleFileSelectedForImport);

    document.getElementById('btn-confirm-import')?.addEventListener('click', executeImport);

    // Detail Modal Close
    document.getElementById('close-detail-modal')?.addEventListener('click', () => {
      document.getElementById('modal-detail')?.classList.remove('show');
    });

    // Demo Data Seed Button
    document.getElementById('btn-seed-sample-data')?.addEventListener('click', () => {
      if (confirm("Load 10 realistic demo participants for this event? Existing responses will be preserved.")) {
        StorageManager.seedSampleData();
        loadResponsesFromStorage();
        populateCompanyFilter();
        applyFilters();
        showToast("Sample data loaded successfully!", "success");
      }
    });

    // Clear All Data
    document.getElementById('btn-clear-all-data')?.addEventListener('click', () => {
      if (confirm("Are you sure you want to PERMANENTLY ERASE all participant responses from this browser? This action cannot be undone.")) {
        StorageManager.clearAllData();
        loadResponsesFromStorage();
        populateCompanyFilter();
        applyFilters();
        showToast("All response data has been cleared.", "info");
      }
    });

    // Config Form Save
    document.getElementById('admin-config-form')?.addEventListener('submit', handleConfigFormSubmit);

    // Table Header Sort Clicks
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (AdminState.sortColumn === col) {
          AdminState.sortAscending = !AdminState.sortAscending;
        } else {
          AdminState.sortColumn = col;
          AdminState.sortAscending = true;
        }
        renderParticipantsTable();
      });
    });
  }

  /* =========================================================================
     Tab Switching
     ========================================================================= */
  function switchAdminTab(tabName) {
    AdminState.activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    ['tab-content-analytics', 'tab-content-participants', 'tab-content-config'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('d-none');
    });

    if (tabName === 'overview' || tabName === 'analytics') {
      document.getElementById('tab-content-analytics')?.classList.remove('d-none');
      updateAllCharts();
    } else if (tabName === 'participants') {
      document.getElementById('tab-content-participants')?.classList.remove('d-none');
    } else if (tabName === 'config') {
      document.getElementById('tab-content-config')?.classList.remove('d-none');
    }
  }

  /* =========================================================================
     Filters & Search Engine
     ========================================================================= */
  function populateCompanyFilter() {
    const select = document.getElementById('filter-company');
    if (!select) return;

    const companies = new Set();
    AdminState.responses.forEach(r => {
      if (r.participant && r.participant.company) {
        companies.add(r.participant.company.trim());
      }
    });

    select.innerHTML = '<option value="">All Companies</option>';
    Array.from(companies).sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
  }

  function populateQuestionFilterOptions() {
    const select = document.getElementById('filter-question');
    if (!select) return;

    select.innerHTML = '<option value="">All Questions</option>';
    if (typeof DEFAULT_QUESTIONS !== 'undefined') {
      DEFAULT_QUESTIONS.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.id;
        opt.textContent = `${q.id}: ${q.question.substring(0, 45)}...`;
        select.appendChild(opt);
      });
    }
  }

  function updateQuestionAnswerDropdown(questionId) {
    const select = document.getElementById('filter-answer');
    if (!select) return;

    if (!questionId || typeof DEFAULT_QUESTIONS === 'undefined') {
      select.innerHTML = '<option value="">Any Answer</option>';
      select.disabled = true;
      return;
    }

    const q = DEFAULT_QUESTIONS.find(x => x.id === questionId);
    if (!q || !Array.isArray(q.options) || !q.options.length) {
      select.innerHTML = '<option value="">Any Answer</option>';
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML = '<option value="">Any Answer</option>';
    q.options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      select.appendChild(opt);
    });
  }

  function resetAllFilters() {
    AdminState.filters = {
      search: '',
      company: '',
      status: '',
      scoreRange: '',
      questionId: '',
      questionAnswer: ''
    };

    const searchInput = document.getElementById('filter-search');
    if (searchInput) searchInput.value = '';

    const companySelect = document.getElementById('filter-company');
    if (companySelect) companySelect.value = '';

    const statusSelect = document.getElementById('filter-status');
    if (statusSelect) statusSelect.value = '';

    const scoreSelect = document.getElementById('filter-score');
    if (scoreSelect) scoreSelect.value = '';

    const questionSelect = document.getElementById('filter-question');
    if (questionSelect) questionSelect.value = '';

    const answerSelect = document.getElementById('filter-answer');
    if (answerSelect) {
      answerSelect.value = '';
      answerSelect.disabled = true;
    }

    applyFilters();
  }

  function applyFilters() {
    const { search, company, status, scoreRange, questionId, questionAnswer } = AdminState.filters;

    AdminState.filteredResponses = AdminState.responses.filter(r => {
      const p = r.participant || {};

      // Search (Name or Email)
      if (search) {
        const nameMatch = (p.name || '').toLowerCase().includes(search);
        const emailMatch = (p.email || '').toLowerCase().includes(search);
        if (!nameMatch && !emailMatch) return false;
      }

      // Company
      if (company && (p.company || '').trim() !== company) {
        return false;
      }

      // Status
      if (status && r.status !== status) {
        return false;
      }

      // Score Range
      if (scoreRange) {
        const score = r.totalScore || 0;
        if (scoreRange === 'low' && score >= 1000) return false;
        if (scoreRange === 'mid' && (score < 1000 || score > 1800)) return false;
        if (scoreRange === 'high' && score <= 1800) return false;
      }

      // Question & Answer Match
      if (questionId) {
        const ansObj = (r.answers || []).find(a => a.questionId === questionId);
        if (!ansObj) return false;

        if (questionAnswer) {
          if (Array.isArray(ansObj.answer)) {
            if (!ansObj.answer.includes(questionAnswer)) return false;
          } else if (ansObj.answer !== questionAnswer) {
            return false;
          }
        }
      }

      return true;
    });

    updateKPICards();
    renderParticipantsTable();
    updateAllCharts();
  }

  /* =========================================================================
     KPI Cards Aggregation
     ========================================================================= */
  function updateKPICards() {
    const list = AdminState.filteredResponses;
    const total = list.length;
    const completed = list.filter(r => r.status === 'completed').length;
    const inProgress = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let totalScoreSum = 0;
    let totalAnswersGiven = 0;

    list.forEach(r => {
      totalScoreSum += (r.totalScore || 0);
      if (Array.isArray(r.answers)) {
        totalAnswersGiven += r.answers.length;
      }
    });

    const avgScore = completed > 0 ? Math.round(totalScoreSum / total) : 0;

    setText('kpi-total-participants', total);
    setText('kpi-completed-quizzes', completed);
    setText('kpi-inprogress-quizzes', inProgress);
    setText('kpi-completion-rate', `${completionRate}%`);
    setText('kpi-avg-score', avgScore.toLocaleString());
    setText('kpi-total-responses', totalAnswersGiven);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* =========================================================================
     Participants Data Table (Sortable & Actionable)
     ========================================================================= */
  function renderParticipantsTable() {
    const tbody = document.getElementById('participants-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = [...AdminState.filteredResponses];

    // Sort list
    list.sort((a, b) => {
      let valA, valB;
      const col = AdminState.sortColumn;

      if (col === 'name') {
        valA = (a.participant?.name || '').toLowerCase();
        valB = (b.participant?.name || '').toLowerCase();
      } else if (col === 'company') {
        valA = (a.participant?.company || '').toLowerCase();
        valB = (b.participant?.company || '').toLowerCase();
      } else if (col === 'date') {
        valA = new Date(a.startedAt).getTime() || 0;
        valB = new Date(b.startedAt).getTime() || 0;
      } else if (col === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      } else {
        // totalScore
        valA = a.totalScore || 0;
        valB = b.totalScore || 0;
      }

      if (valA < valB) return AdminState.sortAscending ? -1 : 1;
      if (valA > valB) return AdminState.sortAscending ? 1 : -1;
      return 0;
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">
            <i class="bi bi-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
            No participant responses match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(r => {
      const p = r.participant || {};
      const answers = r.answers || [];
      const correctCount = answers.filter(a => a.isCorrect === true).length;
      const isCompleted = r.status === 'completed';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${escapeHTML(p.name || 'Anonymous')}</strong>
          ${p.team ? `<br><small class="text-muted">${escapeHTML(p.team)}</small>` : ''}
        </td>
        <td>${escapeHTML(p.email || '--')}</td>
        <td>${escapeHTML(p.company || '--')}</td>
        <td><small>${formatDateTime(r.startedAt)}</small></td>
        <td>
          <span class="badge ${isCompleted ? 'badge-emerald' : 'badge-amber'}">
            ${isCompleted ? 'Completed' : 'In Progress'}
          </span>
        </td>
        <td><strong>${(r.totalScore || 0).toLocaleString()}</strong></td>
        <td>${correctCount} / 2</td>
        <td>
          <div class="action-btn-group">
            <button class="btn btn-outline btn-sm" title="View Full Answers" data-action="view" data-id="${r.responseId}">
              <i class="bi bi-eye"></i> Details
            </button>
            <button class="btn btn-icon btn-sm text-danger" title="Delete Participant Record" data-action="delete" data-id="${r.responseId}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;

      // Event handlers for actions
      tr.querySelector('[data-action="view"]').addEventListener('click', () => {
        openDetailModal(r);
      });

      tr.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm(`Delete response for ${p.name}?`)) {
          StorageManager.deleteResponse(r.responseId);
          loadResponsesFromStorage();
          populateCompanyFilter();
          applyFilters();
          showToast("Participant record deleted.", "info");
        }
      });

      tbody.appendChild(tr);
    });
  }

  /* =========================================================================
     Participant Answer Inspector Modal
     ========================================================================= */
  function openDetailModal(responseObj) {
    const modal = document.getElementById('modal-detail');
    const headerTitle = document.getElementById('modal-detail-name');
    const metaContainer = document.getElementById('modal-detail-meta');
    const answersList = document.getElementById('modal-detail-answers');

    if (!modal) return;

    const p = responseObj.participant || {};
    const nameStr = p.name || 'Participant';
    const emailStr = (p.email || p.workEmail || '').trim() || 'Not Provided';
    const companyStr = (p.company || p.organization || '').trim() || 'General Attendee';
    const scoreVal = (responseObj.totalScore || 0).toLocaleString();
    const timeStr = formatDateTime(responseObj.startedAt);

    headerTitle.textContent = `${nameStr} — Full Response Breakdown`;

    metaContainer.innerHTML = `
      <div class="modal-stat-box">
        <span class="modal-stat-label"><i class="bi bi-envelope-fill text-cyan"></i> Email Address</span>
        <strong class="modal-stat-val modal-email-val" title="${escapeHTML(emailStr)}">${escapeHTML(emailStr)}</strong>
      </div>
      <div class="modal-stat-box">
        <span class="modal-stat-label"><i class="bi bi-building text-teal"></i> Organization / Company</span>
        <strong class="modal-stat-val" title="${escapeHTML(companyStr)}">${escapeHTML(companyStr)}</strong>
      </div>
      <div class="modal-stat-box">
        <span class="modal-stat-label"><i class="bi bi-trophy-fill text-warning"></i> Total Score</span>
        <strong class="modal-stat-val modal-score-val">${scoreVal} pts</strong>
      </div>
      <div class="modal-stat-box">
        <span class="modal-stat-label"><i class="bi bi-clock-history text-muted"></i> Started At</span>
        <small class="modal-stat-val modal-time-val">${timeStr}</small>
      </div>
    `;

    answersList.innerHTML = '';
    const answers = responseObj.answers || [];

    if (answers.length === 0) {
      answersList.innerHTML = '<div class="glass-card text-center text-muted p-4">No questions answered yet.</div>';
    } else {
      answers.forEach((a, idx) => {
        let answerStr = Array.isArray(a.answer) ? a.answer.join(', ') : (a.answer || '[Unanswered]');
        let correctnessTag = '';
        let borderStyle = 'border-left: 4px solid var(--fabric-teal);';

        if (a.isCorrect === true) {
          correctnessTag = '<span class="badge badge-emerald"><i class="bi bi-check-circle-fill"></i> Correct (+pts)</span>';
          borderStyle = 'border-left: 4px solid #107c41;';
        } else if (a.isCorrect === false) {
          correctnessTag = '<span class="badge badge-amber"><i class="bi bi-x-circle-fill"></i> Incorrect (0 pts)</span>';
          borderStyle = 'border-left: 4px solid #dc2626;';
        } else {
          correctnessTag = '<span class="badge badge-purple"><i class="bi bi-info-circle-fill"></i> Survey Response</span>';
          borderStyle = 'border-left: 4px solid #5c2d91;';
        }

        const item = document.createElement('div');
        item.className = 'modal-answer-card mb-3';
        item.style.cssText = borderStyle;
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <span class="badge badge-cyan">${escapeHTML(a.questionId)}: ${escapeHTML(a.category)}</span>
            ${correctnessTag}
          </div>
          <h5 class="modal-q-title">${escapeHTML(a.questionText)}</h5>
          <div class="modal-q-answer">
            <span class="modal-q-answer-label">Selected Answer:</span>
            <span class="modal-q-answer-val">${escapeHTML(answerStr)}</span>
          </div>
          <div class="d-flex gap-3 text-muted flex-wrap" style="font-size: 0.8rem; margin-top: 0.45rem;">
            <span><i class="bi bi-clock"></i> Time taken: <strong>${a.timeTakenSeconds || 0}s</strong></span>
            <span><i class="bi bi-trophy"></i> Points: <strong>${a.pointsEarned || 0}</strong></span>
          </div>
        `;
        answersList.appendChild(item);
      });
    }

    modal.classList.add('show');
  }

  /* =========================================================================
     Analytics & Chart.js Visualizations
     ========================================================================= */
  function initCharts() {
    if (typeof Chart === 'undefined') {
      console.warn("[Admin] Chart.js not loaded. Showing graceful fallback.");
      return;
    }

    // Set Global Chart.js Defaults for Clean Light Theme
    Chart.defaults.color = '#475569';
    Chart.defaults.font.family = "'Segoe UI', 'Inter', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = '#f1f5f9';
    Chart.defaults.plugins.tooltip.borderColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  function updateAllCharts() {
    if (typeof Chart === 'undefined') return;

    renderRegistrationsTimelineChart();
    renderCompletionStatusChart();
    renderPlatformDistributionChart();
    renderFabricExperienceChart();
    renderDataChallengesChart();
    renderWorkloadInterestChart();
  }

  function destroyChart(name) {
    if (ChartInstances[name]) {
      ChartInstances[name].destroy();
      ChartInstances[name] = null;
    }
  }

  /* 1. Registrations Timeline (Area Chart) */
  function renderRegistrationsTimelineChart() {
    const ctx = document.getElementById('chart-registrations');
    if (!ctx) return;
    destroyChart('registrations');

    const list = AdminState.filteredResponses;
    // Group by hour / bucket
    const timeBuckets = {};
    list.forEach(r => {
      const date = new Date(r.startedAt);
      const key = `${date.getHours()}:00`;
      timeBuckets[key] = (timeBuckets[key] || 0) + 1;
    });

    const labels = Object.keys(timeBuckets).sort();
    const data = labels.map(k => timeBuckets[k]);

    ChartInstances.registrations = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['09:00', '10:00', '11:00', '12:00'],
        datasets: [{
          label: 'Registrations',
          data: data.length ? data : [0, 0, 0, 0],
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#00d2ff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0, 0, 0, 0.06)' } },
          y: { 
            grid: { color: 'rgba(0, 0, 0, 0.06)' },
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  /* 2. Completion Status (Doughnut) */
  function renderCompletionStatusChart() {
    const ctx = document.getElementById('chart-completion-donut');
    if (!ctx) return;
    destroyChart('completion');

    const completed = AdminState.filteredResponses.filter(r => r.status === 'completed').length;
    const inProgress = AdminState.filteredResponses.length - completed;

    ChartInstances.completion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress'],
        datasets: [{
          data: [completed, inProgress],
          backgroundColor: ['#10b981', '#f59e0b'],
          borderColor: '#111728',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        cutout: '70%'
      }
    });
  }

  /* 3. Platform Distribution (Q1 - Bar) */
  function renderPlatformDistributionChart() {
    const ctx = document.getElementById('chart-platforms');
    if (!ctx) return;
    destroyChart('platforms');

    const counts = {};
    AdminState.filteredResponses.forEach(r => {
      const q1 = (r.answers || []).find(a => a.questionId === 'Q01');
      if (q1 && q1.answer) {
        counts[q1.answer] = (counts[q1.answer] || 0) + 1;
      }
    });

    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);

    ChartInstances.platforms = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Microsoft Fabric', 'Synapse', 'Snowflake'],
        datasets: [{
          label: 'Organizations',
          data: data.length ? data : [0, 0, 0],
          backgroundColor: '#0070f3',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  /* 4. Fabric Experience (Q6 - Polar Area / Doughnut) */
  function renderFabricExperienceChart() {
    const ctx = document.getElementById('chart-experience');
    if (!ctx) return;
    destroyChart('experience');

    const counts = {};
    AdminState.filteredResponses.forEach(r => {
      const q6 = (r.answers || []).find(a => a.questionId === 'Q06');
      if (q6 && q6.answer) {
        counts[q6.answer] = (counts[q6.answer] || 0) + 1;
      }
    });

    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);

    ChartInstances.experience = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels.length ? labels : ['In Production', 'PoC Done', 'First Intro'],
        datasets: [{
          data: data.length ? data : [0, 0, 0],
          backgroundColor: ['#7928ca', '#00d2ff', '#ff0080', '#10b981', '#f59e0b'],
          borderColor: '#111728',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  /* 5. Top Data Challenges (Q5 - Horizontal Bar) */
  function renderDataChallengesChart() {
    const ctx = document.getElementById('chart-challenges');
    if (!ctx) return;
    destroyChart('challenges');

    const counts = {};
    AdminState.filteredResponses.forEach(r => {
      const q5 = (r.answers || []).find(a => a.questionId === 'Q05');
      if (q5 && q5.answer) {
        counts[q5.answer] = (counts[q5.answer] || 0) + 1;
      }
    });

    const sortedLabels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = sortedLabels.map(l => counts[l]);

    ChartInstances.challenges = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedLabels.length ? sortedLabels : ['Data silos', 'Data quality', 'High costs'],
        datasets: [{
          label: 'Attendees',
          data: data.length ? data : [0, 0, 0],
          backgroundColor: '#ff0080',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  /* 6. Most Popular Topics / Workloads (Q18 - Multi-Select Bar) */
  function renderWorkloadInterestChart() {
    const ctx = document.getElementById('chart-workloads');
    if (!ctx) return;
    destroyChart('workloads');

    const counts = {};
    AdminState.filteredResponses.forEach(r => {
      const q18 = (r.answers || []).find(a => a.questionId === 'Q18');
      if (q18 && Array.isArray(q18.answer)) {
        q18.answer.forEach(opt => {
          counts[opt] = (counts[opt] || 0) + 1;
        });
      }
    });

    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = sorted.map(k => counts[k]);

    ChartInstances.workloads = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.length ? sorted : ['Lakehouse', 'Warehouse', 'Direct Lake'],
        datasets: [{
          label: 'Interest Votes',
          data: data.length ? data : [0, 0, 0],
          backgroundColor: '#10b981',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  /* =========================================================================
     JSON Import Handler
     ========================================================================= */
  let pendingImportPayload = null;

  function handleFileSelectedForImport(e) {
    const file = e.target.files[0];
    const previewContainer = document.getElementById('import-preview-box');
    const confirmBtn = document.getElementById('btn-confirm-import');

    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const json = JSON.parse(event.target.result);
        const validation = StorageManager.validateImportPayload(json);

        if (!validation.valid) {
          previewContainer.innerHTML = `<div class="text-danger"><i class="bi bi-x-circle"></i> ${escapeHTML(validation.message)}</div>`;
          confirmBtn.disabled = true;
          pendingImportPayload = null;
        } else {
          pendingImportPayload = json;
          confirmBtn.disabled = false;
          previewContainer.innerHTML = `
            <div class="text-success mb-2"><i class="bi bi-check-circle-fill"></i> Valid dataset detected!</div>
            <ul style="font-size: 0.88rem; list-style-position: inside;">
              <li><strong>Participant Records:</strong> ${validation.totalCount}</li>
              <li><strong>Includes Event Config:</strong> ${validation.hasConfig ? 'Yes' : 'No'}</li>
            </ul>
          `;
        }
      } catch (err) {
        previewContainer.innerHTML = `<div class="text-danger"><i class="bi bi-x-circle"></i> Invalid JSON file syntax.</div>`;
        confirmBtn.disabled = true;
        pendingImportPayload = null;
      }
    };
    reader.readAsText(file);
  }

  function executeImport() {
    if (!pendingImportPayload) return;
    const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';

    const result = StorageManager.importJSONData(pendingImportPayload, mode);
    if (result.success) {
      loadResponsesFromStorage();
      populateCompanyFilter();
      applyFilters();
      document.getElementById('modal-import')?.classList.remove('show');
      showToast(`Imported ${result.importedCount} participant records (${mode} mode).`, 'success');
      pendingImportPayload = null;
    } else {
      showToast(result.message || 'Import failed.', 'error');
    }
  }

  /* =========================================================================
     Admin Configuration Management
     ========================================================================= */
  function loadConfigForm() {
    const config = StorageManager.getConfig();
    setValue('cfg-event-title', config.eventTitle);
    setValue('cfg-event-subtitle', config.eventSubtitle);
    setValue('cfg-organizer-company', config.organizerCompany);
    setValue('cfg-speed-bonus-max', config.maxSpeedBonus);
    setCheck('cfg-speed-bonus-enabled', config.speedBonusEnabled);
    setCheck('cfg-shared-host-mode', config.sharedHostMode);
    setCheck('cfg-shuffle-options', config.shuffleOptions);
  }

  function handleConfigFormSubmit(e) {
    e.preventDefault();
    const updates = {
      eventTitle: getValue('cfg-event-title'),
      eventSubtitle: getValue('cfg-event-subtitle'),
      organizerCompany: getValue('cfg-organizer-company'),
      maxSpeedBonus: parseInt(getValue('cfg-speed-bonus-max'), 10) || 50,
      speedBonusEnabled: getCheck('cfg-speed-bonus-enabled'),
      sharedHostMode: getCheck('cfg-shared-host-mode'),
      shuffleOptions: getCheck('cfg-shuffle-options')
    };

    StorageManager.saveConfig(updates);
    showToast("Event configuration saved successfully!", "success");
  }

  /* Utility DOM helpers */
  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function getCheck(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  }

  function setCheck(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle-fill text-success' : 'info-circle-fill text-cyan';
    toast.innerHTML = `<i class="bi bi-${icon}"></i> <span>${escapeHTML(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }

})();
