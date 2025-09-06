
// EduPlay - Unified Client Logic
// Persistence: localStorage (permanent across refresh)

(function() {
  // ---------- Utilities ----------
  const ls = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : (fallback ?? null);
      } catch (e) {
        console.error('LS get error', key, e);
        return fallback ?? null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('LS set error', key, e);
      }
    },
    push(key, item) {
      const arr = ls.get(key, []);
      arr.push(item);
      ls.set(key, arr);
    }
  };

  const bySel = s => document.querySelector(s);
  const bySelAll = s => Array.from(document.querySelectorAll(s));

  function nowISO() { return new Date().toISOString(); }

  function addActivity(type, message, meta = {}) {
    const entry = { id: Date.now(), type, message, meta, ts: nowISO() };
    ls.push('eduplay_activity', entry);
    // also update notification badge if present
    const badge = document.querySelector('.notification-btn .badge');
    if (badge) {
      const count = (parseInt(badge.textContent || '0', 10) || 0) + 1;
      badge.textContent = String(count);
    }
    return entry;
  }

  function ensureSeedData() {
    if (!ls.get('eduplay_users')) {
      ls.set('eduplay_users', [
        {
          id: 1,
          username: 'rahulsharma',
          email: 'rahul@example.com',
          password: 'password123',
          grade: 10,
          xp: 2450,
          level: 12,
          badges: ['mathwizard', 'quicklearner', 'quizmaster'],
          streak: 12,
          enrolledCourses: [1, 2, 3],
          completedLessons: [1, 2, 3, 4, 5, 6, 7, 8]
        }
      ]);
    }
    if (!ls.get('eduplay_courses')) {
      ls.set('eduplay_courses', [
        { id: 1, title: "Algebra Basics", subject: "Mathematics", grade: 9, description: "Master linear equations and inequalities", lessons: 12, enrolled: 1250 },
        { id: 2, title: "Atomic Structure", subject: "Science", grade: 10, description: "Understand protons, neutrons, and electrons", lessons: 8, enrolled: 980 },
        { id: 3, title: "World Geography", subject: "Social Studies", grade: 8, description: "Explore continents and countries", lessons: 10, enrolled: 750 }
      ]);
    }
    if (!ls.get('eduplay_leaderboard')) {
      ls.set('eduplay_leaderboard', [
        { id: 1, username: "Rahul Sharma", xp: 2450, grade: 10, avatar: "RS" },
        { id: 2, username: "Priya Singh", xp: 2100, grade: 9, avatar: "PS" },
        { id: 3, username: "Aarav Shah", xp: 1950, grade: 11, avatar: "AS" },
        { id: 4, username: "Neha Mehta", xp: 1800, grade: 10, avatar: "NM" },
        { id: 5, username: "Vikram Kumar", xp: 1650, grade: 12, avatar: "VK" }
      ]);
    }
    if (!ls.get('eduplay_activity')) {
      ls.set('eduplay_activity', []);
    }
  }

  function requireLogin() {
    const path = window.location.pathname;
    if (path.includes('login.html') || path.includes('register.html')) return;
    const user = ls.get('currentUser');
    if (!user) {
      window.location.href = 'login.html';
    }
  }

  function setCurrentUser(u) { ls.set('currentUser', u); }
  function getCurrentUser() { return ls.get('currentUser'); }

  function awardXP(userId, amount, reason = '') {
    const users = ls.get('eduplay_users', []);
    const u = users.find(x => x.id === userId);
    if (!u) return;
    u.xp = (u.xp || 0) + amount;
    // simple level calc
    u.level = Math.floor(u.xp / 200) + 1;
    ls.set('eduplay_users', users);
    if (getCurrentUser()?.id === u.id) setCurrentUser(u);
    // update leaderboard
    const lb = ls.get('eduplay_leaderboard', []);
    const lbUser = lb.find(x => x.username === (u.username ? u.username : 'User ' + u.id) || x.id === u.id) || lb.find(x=>x.id===1);
    if (lbUser) {
      lbUser.xp = u.xp;
      ls.set('eduplay_leaderboard', lb.sort((a,b)=>b.xp-a.xp));
    }
    addActivity('xp', `+${amount} XP ${reason ? 'for ' + reason : ''}`, { userId });
  }

  function highlightActiveMenu() {
    const links = bySelAll('.sidebar .menu-item');
    const path = location.pathname.split('/').pop() || 'index.html';
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.endsWith(path)) a.classList.add('active'); else a.classList.remove('active');
    });
  }

  function wireLogout() {
    const logout = bySel('.logout-btn');
    if (logout) {
      logout.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
      });
    }
  }

  function wireSearchFilter() {
    const input = bySel('.search-bar input');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      const groups = [
        '.course-card',
        '.quiz-card',
        '.skill-card',
        '.game-card'
      ];
      groups.forEach(sel => {
        bySelAll(sel).forEach(card => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(q) ? '' : 'none';
        });
      });
    });
  }

  function animateProgressBars() {
    bySelAll('.progress').forEach(progress => {
      const width = progress.style.width || progress.dataset.width || '0%';
      progress.dataset.width = width;
      progress.style.width = '0%';
      setTimeout(() => { progress.style.transition = 'width 800ms ease'; progress.style.width = width; }, 50);
    });
  }

  // ---------- Page: Login (optional, if present) ----------
  function wireLogin() {
    const loginForm = bySel('#loginForm');
    if (!loginForm) return;
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = bySel('#email').value.trim();
      const password = bySel('#password').value;
      const users = ls.get('eduplay_users', []);
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        setCurrentUser(user);
        addActivity('login', `${user.username || user.email} logged in`);
        window.location.href = 'index.html';
      } else {
        alert('Invalid email or password');
      }
    });
  }

  // ---------- Page: Dashboard (index.html) ----------
  function hydrateDashboard() {
    if (!document.body) return;
    if (!/index\.html$|^\/$/.test(location.pathname) && !location.pathname.endsWith('/')) return;
    const u = getCurrentUser();
    if (!u) return;
    // Numbers (if present)
    const statCards = bySelAll('.stat-card .stat-info h3');
    if (statCards.length >= 3) {
      statCards[0].textContent = (u.enrolledCourses || []).length;
      statCards[1].textContent = (u.completedLessons || []).length;
      statCards[2].textContent = (u.badges || []).length;
    }
    const streakCount = bySel('.streak-count');
    if (streakCount) streakCount.textContent = `${u.streak || 0} days`;
    // Continue buttons
    bySelAll('.course-card .btn.btn-primary').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const courseId = (u.enrolledCourses || [])[i] || 1;
        location.href = `curriculum.html?courseId=${courseId}`;
      });
    });
  }

  // ---------- Page: Quizzes (quizzes.html) ----------
  const QUIZ_BANK = {
    math: [
      { q: "What is 12 × 8?", options: ["96", "108", "88", "112"], a: 0 },
      { q: "Solve: 2x + 6 = 18", options: ["x=4", "x=6", "x=8", "x=12"], a: 0 },
      { q: "Square root of 144?", options: ["10", "11", "12", "13"], a: 2 }
    ],
    science: [
      { q: "Who proposed the atomic model with orbits?", options: ["Dalton", "Bohr", "Rutherford", "Thomson"], a: 1 },
      { q: "Electron charge is:", options: ["Positive", "Negative", "Neutral", "It depends"], a: 1 }
    ],
    english: [
      { q: "Choose the synonym of 'Rapid'", options: ["Slow", "Swift", "Dull", "Hard"], a: 1 },
      { q: "Fill in the blank: She ___ to school daily.", options: ["go", "goes", "gone", "going"], a: 1 }
    ],
    history: [
      { q: "Who was the first Mughal Emperor?", options: ["Akbar", "Babur", "Shah Jahan", "Aurangzeb"], a: 1 }
    ],
    geography: [
      { q: "The largest continent is:", options: ["Africa", "Asia", "Europe", "Antarctica"], a: 1 }
    ]
  };

  function subjectFromCard(card) {
    const map = [
      ['.math-bg', 'math'],
      ['.science-bg', 'science'],
      ['.english-bg', 'english'],
      ['.history-bg', 'history'],
      ['.geography-bg', 'geography']
    ];
    for (const [sel, subj] of map) {
      if (card.querySelector(sel)) return subj;
    }
    return 'math';
  }

  function wireQuizzes() {
    if (!/quizzes\.html$/.test(location.pathname)) return;
    const quizContainer = bySel('.quiz-container');
    const titleEl = bySel('.quiz-title');
    const progressFill = bySel('.progress-fill');
    const progressText = bySel('.progress-text');
    const questionText = bySel('.question-text');
    const optionsContainer = bySel('.options-container');
    const nextBtn = bySel('#quizNextBtn') || bySel('.quiz-controls .btn-primary');
    const exitBtn = bySel('#quizExitBtn') || bySel('.quiz-controls .btn-outline');
    let state = null;

    function startQuiz(subject) {
      const bank = QUIZ_BANK[subject] || [];
      if (bank.length === 0) return;
      state = { subject, idx: 0, score: 0, total: bank.length, answers: [] };
      if (quizContainer) quizContainer.classList.add('active');
      renderQ();
      addActivity('quiz_start', `Started ${subject} quiz`);
    }

    function renderQ() {
      const bank = QUIZ_BANK[state.subject];
      const item = bank[state.idx];
      if (titleEl) titleEl.textContent = `${state.subject[0].toUpperCase()}${state.subject.slice(1)} Quiz`;
      if (questionText) questionText.textContent = item.q;
      if (optionsContainer) {
        optionsContainer.innerHTML = '';
        item.options.forEach((opt, i) => {
          const div = document.createElement('div');
          div.className = 'option';
          div.textContent = opt;
          div.addEventListener('click', () => selectOption(i));
          optionsContainer.appendChild(div);
        });
      }
      updateProgress();
    }

    function selectOption(i) {
      if (!state) return;
      const bank = QUIZ_BANK[state.subject];
      const item = bank[state.idx];
      const correct = i === item.a;
      state.answers[state.idx] = i;
      if (correct) state.score++;
      // visual feedback
      bySelAll('.option').forEach((el, idx) => {
        el.classList.toggle('selected', idx === i);
      });
    }

    function updateProgress() {
      if (!progressFill || !progressText) return;
      const pct = Math.round(((state.idx) / state.total) * 100);
      progressFill.style.width = `${pct}%`;
      progressText.textContent = `${state.idx}/${state.total}`;
    }

    function next() {
      if (!state) return;
      if (state.idx < state.total - 1) {
        state.idx++;
        renderQ();
      } else {
        // finish
        const u = getCurrentUser();
        const scorePct = Math.round((state.score / state.total) * 100);
        const gained = 50 + Math.round(scorePct / 2); // 50-100 xp
        if (u) awardXP(u.id, gained, `completing ${state.subject} quiz (${scorePct}%)`);
        alert(`Quiz complete! Score: ${state.score}/${state.total} • +${gained} XP`);
        addActivity('quiz_complete', `Completed ${state.subject} quiz`, { score: state.score, total: state.total });
        if (quizContainer) quizContainer.classList.remove('active');
        state = null;
      }
    }

    function exit() {
      if (quizContainer) quizContainer.classList.remove('active');
      state = null;
    }

    // Bind quiz cards
    bySelAll('.quiz-card .btn.btn-primary, .quiz-card').forEach(cardBtn => {
      cardBtn.addEventListener('click', (e) => {
        const card = cardBtn.closest('.quiz-card') || cardBtn;
        const subj = subjectFromCard(card);
        startQuiz(subj);
      });
    });

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (exitBtn) exitBtn.addEventListener('click', exit);
  }

  // ---------- Page: Games (games.html) ----------
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function wireGames() {
    if (!/games\.html$/.test(location.pathname)) return;

    // Math game elements
    const demo = bySel('.game-demo');
    const mathProblem = bySel('.math-game .problem-display');
    const ansContainer = bySel('.math-game .answer-options');
    const feedback = bySel('.math-game .game-feedback');
    const correctVal = bySel('.math-game .game-stat .stat-value'); // first stat likely score
    const triesVal = bySelAll('.math-game .stat-value')[1];
    let correct = 0, tries = 0, currentAnswer = null;

    function newMathRound() {
      const a = randInt(2, 12), b = randInt(2, 12);
      const op = ['+', '-', '×'][randInt(0,2)];
      let ans = 0;
      if (op === '+') ans = a + b;
      else if (op === '-') ans = a - b;
      else ans = a * b;
      currentAnswer = ans;
      if (mathProblem) mathProblem.textContent = `${a} ${op} ${b} = ?`;
      if (ansContainer) {
        ansContainer.innerHTML = '';
        const choices = new Set([ans]);
        while (choices.size < 4) choices.add(ans + randInt(-10, 10));
        Array.from(choices).sort(() => Math.random() - 0.5).forEach(val => {
          const div = document.createElement('div');
          div.className = 'answer-option';
          div.textContent = String(val);
          div.addEventListener('click', () => {
            tries++;
            const ok = (val === currentAnswer);
            if (ok) { correct++; if (feedback) { feedback.textContent = 'Correct!'; feedback.className = 'game-feedback correct'; } addActivity('game_correct','Math game correct'); }
            else { if (feedback) { feedback.textContent = 'Try again!'; feedback.className = 'game-feedback incorrect'; } }
            if (correctVal) correctVal.textContent = correct;
            if (triesVal) triesVal.textContent = tries;
            if (ok) setTimeout(newMathRound, 600);
          });
          ansContainer.appendChild(div);
        });
      }
    }

    // Word game elements
    const wordDisplay = bySel('.word-game .word-display');
    const hintText = bySel('.word-game .hint-text');
    const letterOptions = bySel('.word-game .letter-options');
    const WORDS = [
      { w: 'ATOM', hint: 'Smallest unit of matter' },
      { w: 'DELTA', hint: 'Landform at river mouth' },
      { w: 'NOUN', hint: 'Part of speech' }
    ];
    let wordIdx = 0, revealed = [];

    function newWordRound() {
      const item = WORDS[wordIdx % WORDS.length];
      revealed = Array(item.w.length).fill('_');
      if (wordDisplay) wordDisplay.textContent = revealed.join(' ');
      if (hintText) hintText.textContent = item.hint;
      if (letterOptions) {
        letterOptions.innerHTML = '';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        letters.forEach(ch => {
          const el = document.createElement('div');
          el.className = 'letter-option';
          el.textContent = ch;
          el.addEventListener('click', () => {
            if (el.classList.contains('used')) return;
            el.classList.add('used');
            const positions = [];
            item.w.split('').forEach((c, i) => { if (c === ch) positions.push(i); });
            if (positions.length) {
              positions.forEach(i => revealed[i] = ch);
              if (wordDisplay) wordDisplay.textContent = revealed.join(' ');
              if (!revealed.includes('_')) {
                addActivity('game_complete','Word game word solved');
                const u = getCurrentUser(); if (u) awardXP(u.id, 40, 'solving word game');
                wordIdx++; setTimeout(newWordRound, 800);
              }
            }
          });
          letterOptions.appendChild(el);
        });
      }
    }

    function showDemo() { if (demo) demo.classList.add('active'); }
    function hideDemo() { if (demo) demo.classList.remove('active'); }

    // Play buttons on cards
    bySelAll('.game-card .btn.btn-primary, .game-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.game-card') || btn;
        showDemo();
        // decide which mini-game to focus
        if (card.querySelector('.math-bg')) {
          newMathRound();
        } else if (card.querySelector('.english-bg')) {
          newWordRound();
        } else {
          // default math
          newMathRound();
        }
      });
    });

    // Demo controls
    bySelAll('.demo-controls .btn-outline').forEach(b => b.addEventListener('click', hideDemo));
  }

  // ---------- Page: Skills (skills.html) ----------
  function wireSkills() {
    if (!/skills\.html$/.test(location.pathname)) return;
    const details = bySel('.skill-details');
    const moduleList = bySel('.module-list');
    const user = getCurrentUser();
    const progressBars = bySelAll('.skill-card .progress');

    // Persisted progress per skill name
    const prog = ls.get('eduplay_skill_progress', {});

    function showDetails(skillName) {
      if (!details) return;
      details.classList.add('active');
      // demo modules
      const modules = [
        { id: 1, name: 'Introduction', desc: 'Basics to get started' },
        { id: 2, name: 'Practice', desc: 'Hands-on tasks' },
        { id: 3, name: 'Assessment', desc: 'Final mini quiz' }
      ];
      if (moduleList) {
        moduleList.innerHTML = '';
        modules.forEach(m => {
          const row = document.createElement('div');
          row.className = 'module-item';
          row.innerHTML = `
            <div class="module-info">
              <div class="module-icon"><i class="fas fa-check"></i></div>
              <div class="module-details">
                <h4>${m.name}</h4>
                <p>${m.desc}</p>
              </div>
            </div>
            <div class="module-status">
              <span class="status-badge ${prog[skillName]?.includes(m.id) ? 'status-completed' : 'status-pending'}">
                ${prog[skillName]?.includes(m.id) ? 'Completed' : 'Pending'}
              </span>
              <button class="btn btn-primary" data-mid="${m.id}">Mark Done</button>
            </div>
          `;
          moduleList.appendChild(row);
        });
        moduleList.querySelectorAll('button[data-mid]').forEach(btn => {
          btn.addEventListener('click', () => {
            const mid = Number(btn.dataset.mid);
            prog[skillName] = prog[skillName] || [];
            if (!prog[skillName].includes(mid)) prog[skillName].push(mid);
            ls.set('eduplay_skill_progress', prog);
            addActivity('skill_progress', `Completed ${skillName} • ${modules.find(x=>x.id===mid).name}`);
            // badge on full complete
            if (prog[skillName].length === modules.length && user) {
              const users = ls.get('eduplay_users', []);
              const u = users.find(x => x.id === user.id);
              if (u) {
                const badgeKey = `${skillName.toLowerCase()}_champ`;
                u.badges = Array.from(new Set([...(u.badges||[]), badgeKey]));
                ls.set('eduplay_users', users);
                setCurrentUser(u);
                awardXP(u.id, 60, `${skillName} skill completion`);
                alert(`Great job! You finished ${skillName}. Badge earned!`);
              }
            }
            showDetails(skillName); // re-render
          });
        });
      }
    }

    // Start Learning buttons on cards
    bySelAll('.skill-card .btn.btn-primary, .skill-card').forEach(el => {
      el.addEventListener('click', () => {
        const card = el.closest('.skill-card') || el;
        // get skill name
        const name = (card.querySelector('.skill-body h3')?.textContent || 'Skill').trim();
        showDetails(name);
      });
    });

    // Animate any embedded progress bars
    progressBars.forEach(p => {
      const w = p.style.width || '0%';
      p.style.width = '0%';
      setTimeout(() => { p.style.width = w; }, 80);
    });
  }

  // ---------- Page: Admin (admin.html) ----------
  function wireAdmin() {
    if (!/admin\.html$/.test(location.pathname)) return;
    const usersTable = bySel('#adminUsers');
    const coursesTable = bySel('#adminCourses');
    const lbTable = bySel('#adminLeaderboard');
    const addCourseForm = bySel('#addCourseForm');
    const removeUserForm = bySel('#removeUserForm');
    const activityList = bySel('#activityList');

    function renderUsers() {
      if (!usersTable) return;
      const users = ls.get('eduplay_users', []);
      usersTable.innerHTML = users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.username || u.email}</td>
          <td>${u.grade}</td>
          <td>${u.xp}</td>
          <td>${u.level}</td>
        </tr>
      `).join('');
    }

    function renderCourses() {
      if (!coursesTable) return;
      const courses = ls.get('eduplay_courses', []);
      coursesTable.innerHTML = courses.map(c => `
        <tr>
          <td>${c.id}</td>
          <td>${c.title}</td>
          <td>${c.subject}</td>
          <td>Grade ${c.grade}</td>
          <td>${c.lessons}</td>
          <td>${c.enrolled}</td>
        </tr>
      `).join('');
    }

    function renderLeaderboard() {
      if (!lbTable) return;
      const lb = ls.get('eduplay_leaderboard', []).sort((a,b)=>b.xp-a.xp);
      lbTable.innerHTML = lb.map((r,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${r.username || ('User '+r.id)}</td>
          <td>${r.grade}</td>
          <td>${r.xp}</td>
        </tr>
      `).join('');
    }

    function renderActivity() {
      if (!activityList) return;
      const acts = ls.get('eduplay_activity', []).slice(-20).reverse();
      activityList.innerHTML = acts.map(a => `
        <li><strong>[${a.type}]</strong> ${a.message} <em>${new Date(a.ts).toLocaleString()}</em></li>
      `).join('');
    }

    if (addCourseForm) {
      addCourseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = bySel('#newCourseTitle')?.value?.trim();
        const subject = bySel('#newCourseSubject')?.value?.trim() || 'General';
        const grade = Number(bySel('#newCourseGrade')?.value || 9);
        const lessons = Number(bySel('#newCourseLessons')?.value || 10);
        const courses = ls.get('eduplay_courses', []);
        const id = (courses[courses.length - 1]?.id || 0) + 1;
        const course = { id, title, subject, grade, description: '', lessons, enrolled: 0 };
        courses.push(course);
        ls.set('eduplay_courses', courses);
        addActivity('course_add', `Admin added course: ${title}`);
        renderCourses();
        addCourseForm.reset();
        alert('Course added');
      });
    }

    if (removeUserForm) {
      removeUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = Number(bySel('#removeUserId')?.value || 0);
        const users = ls.get('eduplay_users', []);
        const idx = users.findIndex(u => u.id === id);
        if (idx >= 0) {
          const rem = users.splice(idx,1)[0];
          ls.set('eduplay_users', users);
          addActivity('user_remove', `Admin removed user id ${id}`);
          renderUsers();
          alert(`Removed ${rem.username || rem.email}`);
        } else {
          alert('User not found');
        }
      });
    }

    renderUsers(); renderCourses(); renderLeaderboard(); renderActivity();
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    ensureSeedData();
    requireLogin();
    highlightActiveMenu();
    wireLogout();
    wireSearchFilter();
    animateProgressBars();
    wireLogin();
    hydrateDashboard();
    wireQuizzes();
    wireGames();
    wireSkills();
    wireAdmin();
  });

})();