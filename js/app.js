/**
 * Fabric Analyst in a Day — Participant Quiz Engine (app.js)
 * Sponsor: UB Technology Innovations Inc.
 * 
 * Enhancements:
 *  - Immediate transition on "Enter Quiz Challenge" to Question 1
 *  - Single-choice questions: Instant submit on click (NO confirm button required)
 *  - Multi-select questions: Multi-selection with clear "Confirm Answer" button
 *  - Clean 4-5 option layout with Fabric theme colors
 *  - Native Web Audio API sound synthesizer
 */

(function () {
  'use strict';

  /* =========================================================================
     Web Audio API Synthesizer (Zero External Audio Dependencies)
     ========================================================================= */
  const SoundFX = {
    audioCtx: null,
    isMuted: false,

    init: function () {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
        const savedMute = localStorage.getItem(STORAGE_KEYS.AUDIO_PREF);
        this.isMuted = savedMute === 'true';
        this.updateMuteUI();
      } catch (e) {
        console.warn("[SoundFX] Web Audio API not supported", e);
      }
    },

    resumeContext: function () {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    },

    toggleMute: function () {
      this.isMuted = !this.isMuted;
      localStorage.setItem(STORAGE_KEYS.AUDIO_PREF, this.isMuted);
      this.updateMuteUI();
      return this.isMuted;
    },

    updateMuteUI: function () {
      const btn = document.getElementById('sound-toggle-btn');
      if (btn) {
        btn.innerHTML = this.isMuted 
          ? '<i class="bi bi-volume-mute-fill"></i>' 
          : '<i class="bi bi-volume-up-fill"></i>';
        btn.setAttribute('title', this.isMuted ? 'Unmute Audio' : 'Mute Audio');
      }
    },

    playTone: function (freq, type, duration, delay = 0, gainLevel = 0.15) {
      if (this.isMuted || !this.audioCtx) return;
      this.resumeContext();
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const start = this.audioCtx.currentTime + delay;
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(gainLevel, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(start);
        osc.stop(start + duration);
      } catch (e) {}
    },

    click: function () {
      this.playTone(600, 'sine', 0.05, 0, 0.08);
    },

    tick: function () {
      this.playTone(800, 'triangle', 0.04, 0, 0.05);
    },

    warningTick: function () {
      this.playTone(950, 'sawtooth', 0.08, 0, 0.12);
    },

    correctChime: function () {
      if (this.isMuted || !this.audioCtx) return;
      // Celebratory Major Chord Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'triangle', 0.35, idx * 0.08, 0.18);
      });
    },

    incorrectBuzz: function () {
      if (this.isMuted || !this.audioCtx) return;
      this.playTone(220, 'sawtooth', 0.25, 0, 0.15);
      this.playTone(185, 'sawtooth', 0.35, 0.15, 0.15);
    },

    fanfare: function () {
      if (this.isMuted || !this.audioCtx) return;
      const chords = [
        { f: 523.25, d: 0.15, t: 0 },
        { f: 659.25, d: 0.15, t: 0.12 },
        { f: 783.99, d: 0.15, t: 0.24 },
        { f: 1046.50, d: 0.5, t: 0.36 }
      ];
      chords.forEach(c => this.playTone(c.f, 'triangle', c.d, c.t, 0.2));
    }
  };

  /* Confetti Animation */
  function triggerCelebrationConfetti() {
    if (typeof confetti === 'function') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#00a389', '#0078d4', '#5c2d91', '#00d2ff', '#f59e0b']
        });
      } catch (e) {}
    }
  }

  function triggerMegaConfetti() {
    if (typeof confetti === 'function') {
      try {
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          confetti({ particleCount: 35, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 35, angle: 120, spread: 55, origin: { x: 1 } });
        }, 300);
      } catch (e) {}
    }
  }

  /* App State */
  const AppState = {
    config: null,
    questions: [],
    currentQuestionIndex: 0,
    currentResponse: null,
    timerId: null,
    timeRemaining: 0,
    timerTotal: 25,
    autoAdvanceTimer: null,
    isAnswerLocked: false,
    selectedOptionIndices: new Set(),
    isHostMode: false
  };

  /* Initialization */
  function initApp() {
    SoundFX.init();
    AppState.config = StorageManager.getConfig();
    AppState.questions = (typeof DEFAULT_QUESTIONS !== 'undefined') ? DEFAULT_QUESTIONS : [];
    
    // Check if shared host mode is enabled
    AppState.isHostMode = !!AppState.config.sharedHostMode;
    const hostToggle = document.getElementById('host-mode-toggle');
    if (hostToggle) hostToggle.checked = AppState.isHostMode;

    bindGlobalEvents();
    checkRecoverableSession();
  }

  /* Global Events */
  function bindGlobalEvents() {
    // Sound Toggle
    document.getElementById('sound-toggle-btn')?.addEventListener('click', () => {
      SoundFX.toggleMute();
    });

    // Host Mode Switch
    document.getElementById('host-mode-toggle')?.addEventListener('change', (e) => {
      AppState.isHostMode = e.target.checked;
      StorageManager.saveConfig({ sharedHostMode: AppState.isHostMode });
      showToast(
        AppState.isHostMode ? "Shared Host Mode Enabled (kiosk)" : "Individual Mode Enabled",
        "info"
      );
    });

    // Registration Form Submit
    document.getElementById('registration-form')?.addEventListener('submit', handleRegistrationSubmit);

    // Privacy Modal
    document.getElementById('privacy-modal-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('privacy-modal')?.classList.add('show');
    });

    document.getElementById('close-privacy-modal')?.addEventListener('click', () => {
      document.getElementById('privacy-modal')?.classList.remove('show');
    });

    // Feedback Continue Button
    document.getElementById('feedback-continue-btn')?.addEventListener('click', () => {
      SoundFX.click();
      advanceToNextQuestion();
    });

    // Results Actions
    document.getElementById('btn-restart-quiz')?.addEventListener('click', () => {
      SoundFX.click();
      resetToWelcomeScreen();
    });

    document.getElementById('btn-download-my-summary')?.addEventListener('click', () => {
      SoundFX.click();
      downloadParticipantSummary();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeyboardNavigation);
  }

  function handleKeyboardNavigation(e) {
    const quizView = document.getElementById('view-quiz');
    if (!quizView || quizView.classList.contains('d-none')) return;

    const feedbackOverlay = document.getElementById('feedback-overlay');
    if (feedbackOverlay && feedbackOverlay.classList.contains('active')) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advanceToNextQuestion();
      }
      return;
    }

    if (AppState.isAnswerLocked) return;

    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      const idx = num - 1;
      const card = document.querySelector(`.answer-card[data-index="${idx}"]`);
      if (card) card.click();
    }
  }

  /* Check Recoverable Session */
  function checkRecoverableSession() {
    const saved = StorageManager.getActiveSession();
    if (saved && saved.responseId && saved.status === 'in-progress' && Array.isArray(saved.answers)) {
      const resume = confirm(`Resume in-progress quiz for ${saved.participant.name}?`);
      if (resume) {
        AppState.currentResponse = saved;
        AppState.currentQuestionIndex = saved.answers.length;
        if (AppState.currentQuestionIndex >= AppState.questions.length) {
          finishQuiz();
        } else {
          switchView('view-quiz');
          renderCurrentQuestion();
        }
        return;
      } else {
        StorageManager.clearActiveSession();
      }
    }
    switchView('view-welcome');
  }

  /* =========================================================================
     Participant Registration & Instant Transition
     ========================================================================= */
  function handleRegistrationSubmit(e) {
    e.preventDefault();
    SoundFX.click();

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const companyInput = document.getElementById('reg-company');
    const teamInput = document.getElementById('reg-team');

    const nameFeedback = document.getElementById('name-feedback');
    const emailFeedback = document.getElementById('email-feedback');

    let isValid = true;

    // Validate Name
    const nameVal = (nameInput.value || '').trim();
    if (!nameVal) {
      nameInput.classList.add('is-invalid');
      if (nameFeedback) nameFeedback.classList.add('show');
      isValid = false;
    } else {
      nameInput.classList.remove('is-invalid');
      if (nameFeedback) nameFeedback.classList.remove('show');
    }

    // Validate Email with regex
    const emailVal = (emailInput.value || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailPattern.test(emailVal)) {
      emailInput.classList.add('is-invalid');
      if (emailFeedback) emailFeedback.classList.add('show');
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
      if (emailFeedback) emailFeedback.classList.remove('show');
    }

    if (!isValid) return;

    // Initialize new participant model
    const newResponseId = StorageManager.generateUUID();
    AppState.currentResponse = {
      responseId: newResponseId,
      participant: {
        name: nameVal,
        email: emailVal,
        company: (companyInput ? companyInput.value || '' : '').trim() || 'General Attendee',
        team: (teamInput ? teamInput.value || '' : '').trim() || ''
      },
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: "in-progress",
      answers: [],
      totalScore: 0,
      knowledgeScore: 0,
      knowledgeTotal: 0,
      speedBonusTotal: 0
    };

    AppState.currentQuestionIndex = 0;
    StorageManager.saveResponse(AppState.currentResponse);
    StorageManager.saveActiveSession(AppState.currentResponse);

    // Instant smooth transition to Question 1
    showToast(`Welcome, ${nameVal}! Question 1 starting... 🚀`, 'success');
    switchView('view-quiz');
    renderCurrentQuestion();
  }

  /* =========================================================================
     Question Rendering Engine
     ========================================================================= */
  function renderCurrentQuestion() {
    clearInterval(AppState.timerId);
    clearTimeout(AppState.autoAdvanceTimer);
    AppState.isAnswerLocked = false;
    AppState.selectedOptionIndices.clear();

    const q = AppState.questions[AppState.currentQuestionIndex];
    if (!q) {
      finishQuiz();
      return;
    }

    // Counter & Category
    const qCounter = document.getElementById('quiz-counter');
    if (qCounter) {
      qCounter.textContent = `Question ${AppState.currentQuestionIndex + 1} of ${AppState.questions.length}`;
    }

    const qCategory = document.getElementById('quiz-category');
    if (qCategory) {
      qCategory.innerHTML = `<i class="bi bi-tag-fill"></i> ${escapeHTML(q.category)}`;
    }

    const qScore = document.getElementById('quiz-current-score');
    if (qScore) {
      qScore.textContent = `${AppState.currentResponse.totalScore} pts`;
    }

    // Progress Bar
    const progFill = document.getElementById('quiz-progress-fill');
    if (progFill) {
      const pct = (AppState.currentQuestionIndex / AppState.questions.length) * 100;
      progFill.style.width = `${pct}%`;
    }

    // Title & Hint
    const qTitle = document.getElementById('question-title');
    if (qTitle) qTitle.textContent = q.question;

    const qHint = document.getElementById('question-hint');
    if (qHint) {
      qHint.textContent = q.hint || '';
      qHint.style.display = q.hint ? 'block' : 'none';
    }

    // Answers Container
    const container = document.getElementById('answers-container');
    if (!container) return;
    container.innerHTML = '';

    if (q.type === 'single-choice') {
      renderSingleChoice(container, q);
    } else if (q.type === 'multi-select') {
      renderMultiSelect(container, q);
    } else if (q.type === 'short-text' || q.type === 'textarea' || q.type === 'text') {
      renderShortText(container, q);
    } else {
      renderSingleChoice(container, q);
    }

    startQuestionTimer(q.timeLimit || 25);
  }

  /* Single Choice Renderer: INSTANT SUBMIT ON CLICK (NO CONFIRM BUTTON) */
  function renderSingleChoice(container, q) {
    const grid = document.createElement('div');
    grid.className = 'answers-grid';
    if (q.options.length === 5) {
      grid.classList.add('five-options');
    }

    const shapeIcons = [
      'bi-hexagon-fill',
      'bi-triangle-fill',
      'bi-diamond-fill',
      'bi-square-fill',
      'bi-circle-fill'
    ];

    q.options.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = `answer-card opt-${idx % 5}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('data-index', idx);

      const iconClass = shapeIcons[idx % shapeIcons.length];

      card.innerHTML = `
        <div class="answer-shape"><i class="bi ${iconClass}"></i></div>
        <div class="answer-text">${escapeHTML(opt)}</div>
        <div class="answer-select-check"><i class="bi bi-check-lg"></i></div>
      `;

      // INSTANT SUBMIT ON CLICK: No confirm button required!
      card.addEventListener('click', () => {
        if (AppState.isAnswerLocked) return;
        SoundFX.click();

        // Visual selection indicator
        document.querySelectorAll('.answer-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (q.allowCustomAnswer && opt.toLowerCase() === 'other') {
          showCustomInputPrompt(container, q, opt);
        } else {
          // Instant submit
          lockAndSubmitAnswer(opt);
        }
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  /* Multi-Select Renderer: MULTI-SELECT WITH CLEAR CONFIRM BUTTON */
  function renderMultiSelect(container, q) {
    const grid = document.createElement('div');
    grid.className = 'answers-grid';
    if (q.options.length === 5) {
      grid.classList.add('five-options');
    }

    q.options.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = `answer-card opt-${idx % 5}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('data-index', idx);

      card.innerHTML = `
        <div class="answer-shape"><i class="bi bi-check-square-fill"></i></div>
        <div class="answer-text">${escapeHTML(opt)}</div>
        <div class="answer-select-check"><i class="bi bi-check-lg"></i></div>
      `;

      card.addEventListener('click', () => {
        if (AppState.isAnswerLocked) return;
        SoundFX.click();

        if (AppState.selectedOptionIndices.has(idx)) {
          AppState.selectedOptionIndices.delete(idx);
          card.classList.remove('selected');
          card.setAttribute('aria-checked', 'false');
        } else {
          AppState.selectedOptionIndices.add(idx);
          card.classList.add('selected');
          card.setAttribute('aria-checked', 'true');
        }
      });

      grid.appendChild(card);
    });

    // Dedicated Confirm Button for Multi-Select Questions
    const submitBar = document.createElement('div');
    submitBar.className = 'action-submit-bar';
    submitBar.innerHTML = `
      <div class="helper-text"><i class="bi bi-check2-all text-cyan"></i> Select all options that apply, then confirm:</div>
      <button class="btn btn-primary btn-lg" id="btn-submit-multiselect">
        <span>Confirm Answer</span> <i class="bi bi-arrow-right-circle-fill"></i>
      </button>
    `;

    container.appendChild(grid);
    container.appendChild(submitBar);

    document.getElementById('btn-submit-multiselect').addEventListener('click', () => {
      if (AppState.isAnswerLocked) return;
      SoundFX.click();

      const selected = Array.from(AppState.selectedOptionIndices).map(i => q.options[i]);
      if (selected.length === 0 && q.required) {
        showToast("Please pick at least one option before confirming.", "error");
        return;
      }
      lockAndSubmitAnswer(selected.length > 0 ? selected : ["[No Options Selected]"]);
    });
  }

  /* Short Text / Paragraph Question */
  function renderShortText(container, q) {
    const wrap = document.createElement('div');
    wrap.className = 'paragraph-response-wrap';
    const maxChars = 1000;
    wrap.innerHTML = `
      <textarea id="text-response-input" class="text-answer-box" rows="5" maxlength="${maxChars}" placeholder="Type your response here... Describe current data challenges, migration goals, or support required from our team..."></textarea>
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <span class="helper-text" id="char-counter">0 / ${maxChars} characters</span>
        <button class="btn btn-primary btn-lg" id="btn-submit-text">
          <span>Submit Response</span> <i class="bi bi-send-fill"></i>
        </button>
      </div>
    `;

    container.appendChild(wrap);

    const input = document.getElementById('text-response-input');
    const counter = document.getElementById('char-counter');
    input.focus();

    input.addEventListener('input', () => {
      counter.textContent = `${input.value.length} / ${maxChars} characters`;
    });

    document.getElementById('btn-submit-text').addEventListener('click', () => {
      if (AppState.isAnswerLocked) return;
      SoundFX.click();
      const val = (input.value || '').trim();
      lockAndSubmitAnswer(val || "[No text entered]");
    });
  }

  function showCustomInputPrompt(container, q, opt) {
    let customWrap = document.getElementById('custom-input-wrapper');
    if (!customWrap) {
      customWrap = document.createElement('div');
      customWrap.id = 'custom-input-wrapper';
      customWrap.className = 'glass-card mt-3';
      customWrap.style.padding = '1.25rem';
      customWrap.innerHTML = `
        <label class="form-label">Please specify your answer:</label>
        <div class="d-flex gap-2">
          <input type="text" id="custom-other-input" class="form-input" placeholder="Type your answer here..." maxlength="120" />
          <button class="btn btn-primary" id="btn-submit-custom">Submit</button>
        </div>
      `;
      container.appendChild(customWrap);

      const customInput = document.getElementById('custom-other-input');
      customInput.focus();

      document.getElementById('btn-submit-custom').addEventListener('click', () => {
        const val = (customInput.value || '').trim();
        lockAndSubmitAnswer(val ? `Other: ${val}` : 'Other');
      });
    }
  }

  /* =========================================================================
     Countdown Timer
     ========================================================================= */
  function startQuestionTimer(durationSeconds) {
    AppState.timerTotal = durationSeconds;
    AppState.timeRemaining = durationSeconds;

    const timerSvgCircle = document.getElementById('timer-svg-circle');
    const timerText = document.getElementById('timer-val-text');
    const timerContainer = document.getElementById('quiz-timer-wrap');

    const totalCircumference = 125.6;

    function updateTimerUI() {
      if (timerText) timerText.textContent = AppState.timeRemaining;

      if (timerSvgCircle) {
        const offset = totalCircumference - (AppState.timeRemaining / AppState.timerTotal) * totalCircumference;
        timerSvgCircle.style.strokeDashoffset = offset;
      }

      if (AppState.timeRemaining <= 5) {
        if (timerContainer) timerContainer.classList.add('timer-critical');
        SoundFX.warningTick();
      } else {
        if (timerContainer) timerContainer.classList.remove('timer-critical');
        if (AppState.timeRemaining % 2 === 0) SoundFX.tick();
      }
    }

    updateTimerUI();

    AppState.timerId = setInterval(() => {
      AppState.timeRemaining--;

      if (AppState.timeRemaining <= 0) {
        clearInterval(AppState.timerId);
        updateTimerUI();
        handleTimerTimeout();
      } else {
        updateTimerUI();
      }
    }, 1000);
  }

  function handleTimerTimeout() {
    if (AppState.isAnswerLocked) return;
    SoundFX.incorrectBuzz();
    showToast("⏰ Time's up for this question!", "info");

    const q = AppState.questions[AppState.currentQuestionIndex];
    let recordedAnswer = null;
    if (q.type === 'multi-select' && AppState.selectedOptionIndices.size > 0) {
      recordedAnswer = Array.from(AppState.selectedOptionIndices).map(i => q.options[i]);
    } else {
      recordedAnswer = "[Unanswered / Timed out]";
    }

    lockAndSubmitAnswer(recordedAnswer, true);
  }

  /* =========================================================================
     Answer Processing & Feedback Screen
     ========================================================================= */
  function lockAndSubmitAnswer(selectedAnswer, isTimeout = false) {
    if (AppState.isAnswerLocked) return;
    AppState.isAnswerLocked = true;
    clearInterval(AppState.timerId);

    document.querySelectorAll('.answer-card').forEach(c => c.classList.add('locked'));

    const q = AppState.questions[AppState.currentQuestionIndex];
    const timeTaken = AppState.timerTotal - Math.max(0, AppState.timeRemaining);

    let pointsEarned = 0;
    let isCorrect = null;
    let speedBonus = 0;

    if (q.scoringMode === 'knowledge') {
      if (isTimeout || selectedAnswer === "[Unanswered / Timed out]") {
        isCorrect = false;
        pointsEarned = 0;
      } else {
        isCorrect = (selectedAnswer === q.correctAnswer);
        if (isCorrect) {
          const timeRatio = Math.max(0, AppState.timeRemaining / AppState.timerTotal);
          speedBonus = Math.round(timeRatio * (AppState.config.maxSpeedBonus || 50));
          pointsEarned = q.points + speedBonus;
          AppState.currentResponse.knowledgeScore += q.points;
          AppState.currentResponse.speedBonusTotal += speedBonus;
        } else {
          pointsEarned = 0;
        }
      }
      AppState.currentResponse.knowledgeTotal += q.points;
    } else {
      // Survey / Participation Question: Always grants participation points
      isCorrect = null;
      pointsEarned = isTimeout ? 0 : (q.points || 100);
    }

    AppState.currentResponse.totalScore += pointsEarned;

    AppState.currentResponse.answers.push({
      questionId: q.id,
      category: q.category,
      questionText: q.question,
      answer: selectedAnswer,
      answeredAt: new Date().toISOString(),
      timeTakenSeconds: timeTaken,
      pointsEarned: pointsEarned,
      isCorrect: isCorrect
    });

    StorageManager.saveResponse(AppState.currentResponse);
    StorageManager.saveActiveSession(AppState.currentResponse);

    showFeedbackModal(q, selectedAnswer, isCorrect, pointsEarned, speedBonus, isTimeout);
  }

  function showFeedbackModal(q, selectedAnswer, isCorrect, pointsEarned, speedBonus, isTimeout) {
    const overlay = document.getElementById('feedback-overlay');
    const bubble = document.getElementById('feedback-icon-bubble');
    const title = document.getElementById('feedback-title');
    const pointsPill = document.getElementById('feedback-points-pill');
    const details = document.getElementById('feedback-details');

    if (!overlay) return;
    bubble.className = 'feedback-icon-bubble';

    if (q.scoringMode === 'knowledge') {
      if (isTimeout) {
        bubble.classList.add('timeout');
        bubble.innerHTML = '<i class="bi bi-hourglass-bottom"></i>';
        title.textContent = "Time Expired!";
        pointsPill.className = "points-pill zero";
        pointsPill.textContent = "+0 Points";
        SoundFX.incorrectBuzz();
      } else if (isCorrect) {
        bubble.classList.add('correct');
        bubble.innerHTML = '<i class="bi bi-check-lg"></i>';
        title.textContent = "Brilliant! Correct Answer!";
        pointsPill.className = "points-pill positive";
        pointsPill.textContent = speedBonus > 0 
          ? `+${pointsEarned} Points (${q.points} + ${speedBonus} Speed Bonus! ⚡)` 
          : `+${pointsEarned} Points! 🎯`;
        SoundFX.correctChime();
        triggerCelebrationConfetti();
      } else {
        bubble.classList.add('incorrect');
        bubble.innerHTML = '<i class="bi bi-x-lg"></i>';
        title.textContent = "Not Quite!";
        pointsPill.className = "points-pill zero";
        pointsPill.textContent = "+0 Points";
        SoundFX.incorrectBuzz();
      }
    } else {
      bubble.classList.add('survey');
      bubble.innerHTML = '<i class="bi bi-bar-chart-fill"></i>';
      title.textContent = "Response Recorded! 📊";
      pointsPill.className = "points-pill positive";
      pointsPill.textContent = `+${pointsEarned} Participation Points`;
      SoundFX.correctChime();
    }

    let formattedSelected = Array.isArray(selectedAnswer) ? selectedAnswer.join(', ') : selectedAnswer;
    let detailsHtml = `<p><strong>Your Selection:</strong> ${escapeHTML(formattedSelected || '[No selection]')}</p>`;

    if (q.scoringMode === 'knowledge' && q.correctAnswer) {
      detailsHtml += `<p><strong>Correct Answer:</strong> <span class="correct-reveal-badge">${escapeHTML(q.correctAnswer)}</span></p>`;
    }

    if (q.explanation) {
      detailsHtml += `
        <p class="mt-2 text-muted" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">
          <i class="bi bi-lightbulb-fill text-warning"></i> <em>${escapeHTML(q.explanation)}</em>
        </p>
      `;
    }

    details.innerHTML = detailsHtml;
    overlay.classList.add('active');

    AppState.autoAdvanceTimer = setTimeout(() => {
      advanceToNextQuestion();
    }, 5000);
  }

  function advanceToNextQuestion() {
    clearTimeout(AppState.autoAdvanceTimer);
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.classList.remove('active');

    AppState.currentQuestionIndex++;
    if (AppState.currentQuestionIndex >= AppState.questions.length) {
      finishQuiz();
    } else {
      renderCurrentQuestion();
    }
  }

  /* =========================================================================
     Quiz Completion & Results View
     ========================================================================= */
  function finishQuiz() {
    AppState.currentResponse.status = "completed";
    AppState.currentResponse.completedAt = new Date().toISOString();
    StorageManager.saveResponse(AppState.currentResponse);
    StorageManager.clearActiveSession();

    switchView('view-results');
    SoundFX.fanfare();
    triggerMegaConfetti();
    renderResultsScreen();
  }

  function renderResultsScreen() {
    const resp = AppState.currentResponse;
    if (!resp) return;

    const greet = document.getElementById('results-greeting');
    if (greet) greet.textContent = `Outstanding Job, ${resp.participant.name}! 🏆`;

    animateScoreCounter(resp.totalScore || 0);

    const answers = resp.answers || [];
    const knowledgeAnswers = answers.filter(a => a.isCorrect !== null);
    const correctCount = knowledgeAnswers.filter(a => a.isCorrect === true).length;
    const answeredCount = answers.filter(a => a.answer !== "[Unanswered / Timed out]").length;

    const metricAnswered = document.getElementById('res-metric-answered');
    if (metricAnswered) metricAnswered.textContent = `${answeredCount} / ${AppState.questions.length}`;

    const metricCorrect = document.getElementById('res-metric-correct');
    if (metricCorrect) metricCorrect.textContent = `${correctCount} / ${knowledgeAnswers.length}`;

    const metricSpeed = document.getElementById('res-metric-speed');
    if (metricSpeed) metricSpeed.textContent = `+${resp.speedBonusTotal || 0} pts`;

    const leaderboard = StorageManager.getLeaderboard();
    const myRank = leaderboard.findIndex(r => r.responseId === resp.responseId) + 1;

    const metricRank = document.getElementById('res-metric-rank');
    if (metricRank) metricRank.textContent = myRank > 0 ? `#${myRank}` : '--';

    renderPodium(leaderboard);
    renderLeaderboardList(leaderboard, resp.responseId);
  }

  function animateScoreCounter(targetScore) {
    const el = document.getElementById('results-score-num');
    if (!el) return;

    const duration = 1500;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * targetScore);
      el.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = targetScore.toLocaleString();
      }
    }

    requestAnimationFrame(update);
  }

  function renderPodium(leaderboard) {
    const p1 = leaderboard[0];
    const p2 = leaderboard[1];
    const p3 = leaderboard[2];

    const p1Name = document.getElementById('podium-1-name');
    const p1Score = document.getElementById('podium-1-score');
    const p1Avatar = document.getElementById('podium-1-avatar');
    if (p1Name && p1) {
      p1Name.textContent = p1.participant.name;
      p1Score.textContent = `${p1.totalScore} pts`;
      p1Avatar.textContent = (p1.participant.name || 'P').charAt(0).toUpperCase();
    }

    const p2Name = document.getElementById('podium-2-name');
    const p2Score = document.getElementById('podium-2-score');
    const p2Avatar = document.getElementById('podium-2-avatar');
    if (p2Name && p2) {
      p2Name.textContent = p2.participant.name;
      p2Score.textContent = `${p2.totalScore} pts`;
      p2Avatar.textContent = (p2.participant.name || 'P').charAt(0).toUpperCase();
    }

    const p3Name = document.getElementById('podium-3-name');
    const p3Score = document.getElementById('podium-3-score');
    const p3Avatar = document.getElementById('podium-3-avatar');
    if (p3Name && p3) {
      p3Name.textContent = p3.participant.name;
      p3Score.textContent = `${p3.totalScore} pts`;
      p3Avatar.textContent = (p3.participant.name || 'P').charAt(0).toUpperCase();
    }
  }

  function renderLeaderboardList(leaderboard, currentResponseId) {
    const listContainer = document.getElementById('leaderboard-list-body');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const topList = leaderboard.slice(0, 10);
    topList.forEach((entry, idx) => {
      const isCurrent = entry.responseId === currentResponseId;
      const rankNum = idx + 1;
      let rankClass = '';
      if (rankNum === 1) rankClass = 'gold';
      else if (rankNum === 2) rankClass = 'silver';
      else if (rankNum === 3) rankClass = 'bronze';

      const row = document.createElement('div');
      row.className = `leaderboard-item ${isCurrent ? 'is-current' : ''}`;
      row.innerHTML = `
        <div class="lb-rank ${rankClass}">${rankNum}</div>
        <div class="lb-avatar">${escapeHTML(entry.participant.name.charAt(0).toUpperCase())}</div>
        <div class="lb-info">
          <div class="lb-name">
            ${escapeHTML(entry.participant.name)}
            ${isCurrent ? '<span class="badge badge-teal">You</span>' : ''}
          </div>
          <div class="lb-company">${escapeHTML(entry.participant.company || 'Attendee')}</div>
        </div>
        <div class="lb-score">${entry.totalScore.toLocaleString()} pts</div>
      `;
      listContainer.appendChild(row);
    });
  }

  function downloadParticipantSummary() {
    if (!AppState.currentResponse) return;
    const jsonStr = JSON.stringify(AppState.currentResponse, null, 2);
    const cleanName = (AppState.currentResponse.participant.name || 'participant').replace(/\s+/g, '_');
    StorageManager.downloadBlob(
      jsonStr,
      `Fabric_Analyst_Quiz_Result_${cleanName}.json`,
      'application/json;charset=utf-8;'
    );
    showToast("Summary JSON downloaded successfully!", "success");
  }

  function resetToWelcomeScreen() {
    AppState.currentResponse = null;
    AppState.currentQuestionIndex = 0;
    AppState.selectedOptionIndices.clear();

    const regForm = document.getElementById('registration-form');
    if (regForm) regForm.reset();

    switchView('view-welcome');
  }

  /* View Switcher */
  function switchView(viewId) {
    ['view-welcome', 'view-quiz', 'view-results'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === viewId) {
          el.classList.remove('d-none');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          el.classList.add('d-none');
        }
      }
    });
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
    const icon = type === 'success' ? 'check-circle-fill text-teal' : (type === 'error' ? 'exclamation-triangle-fill text-danger' : 'info-circle-fill text-cyan');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
