(function () {
    const root = document.getElementById('pomodoro');
    if (!root) return;

    const SETTINGS_KEY = 'pomodoro.settings';
    const COUNT_KEY = 'pomodoro.count';        // legacy: { date, n } for a single day
    const HISTORY_KEY = 'pomodoro.history';    // { 'YYYY-MM-DD': { n, min } }
    const SESSIONS_BEFORE_LONG = 4;
    const MODE_LABELS = { focus: 'Focus', short: 'Short break', long: 'Long break' };

    const timeEl = document.getElementById('pomodoro-time');
    const labelEl = document.getElementById('pomodoro-label');
    const barEl = document.getElementById('pomodoro-bar');
    const startBtn = document.getElementById('pomodoro-start');
    const resetBtn = document.getElementById('pomodoro-reset');
    const skipBtn = document.getElementById('pomodoro-skip');
    const expandBtn = document.getElementById('pomodoro-expand');
    const pips = document.querySelectorAll('#pomodoro-pips .pip');
    const modeBtns = root.querySelectorAll('[data-mode-btn]');
    const inputs = {
        focus: document.getElementById('set-focus'),
        short: document.getElementById('set-short'),
        long: document.getElementById('set-long')
    };

    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    }

    const settings = Object.assign({ focus: 25, short: 5, long: 15 }, load(SETTINGS_KEY, {}));

    function dateKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    const history = load(HISTORY_KEY, {});
    // One-time migration of the old "today only" counter.
    const legacy = load(COUNT_KEY, null);
    if (legacy && legacy.n && legacy.date) {
        const key = dateKey(new Date(legacy.date));
        if (!history[key]) history[key] = { n: legacy.n, min: legacy.n * 25 };
        save(HISTORY_KEY, history);
        try { localStorage.removeItem(COUNT_KEY); } catch { /* ignore */ }
    }

    function todayCount() {
        const e = history[dateKey(new Date())];
        return e ? e.n : 0;
    }
    let completed = todayCount();

    // TESTING: focus sessions last this many seconds. Set to null to use the real setting.
    // const TEST_FOCUS_SECONDS = 5;
    const TEST_FOCUS_SECONDS = null;

    function durationMs(m) {
        return m === 'focus' && TEST_FOCUS_SECONDS ? TEST_FOCUS_SECONDS * 1000 : settings[m] * 60000;
    }

    let mode = 'focus';
    let totalMs = durationMs(mode);
    let remainingMs = totalMs;
    let endTime = null;   // set while running
    let timer = null;

    function format(ms) {
        const s = Math.max(0, Math.ceil(ms / 1000));
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    function render() {
        const text = format(remainingMs);
        const progress = totalMs ? 1 - remainingMs / totalMs : 0;
        timeEl.textContent = text;
        labelEl.textContent = MODE_LABELS[mode];
        barEl.style.strokeDashoffset = String(100 - progress * 100);
        document.title = (timer ? text + ' - ' + MODE_LABELS[mode] : 'Pomodoro') + ' - SelfBurnOut';
        startBtn.setAttribute('aria-label', timer ? 'Pause' : (remainingMs < totalMs ? 'Resume' : 'Start'));
        root.classList.toggle('running', !!timer);
        root.dataset.mode = mode;
        modeBtns.forEach(b => b.classList.toggle('active', b.dataset.modeBtn === mode));

        const filled = completed > 0 && completed % SESSIONS_BEFORE_LONG === 0 ? SESSIONS_BEFORE_LONG : completed % SESSIONS_BEFORE_LONG;
        pips.forEach((p, i) => p.classList.toggle('done', i < filled));
    }

    function stop() {
        clearInterval(timer);
        timer = null;
        endTime = null;
    }

    function setMode(next) {
        stop();
        mode = next;
        totalMs = durationMs(mode);
        remainingMs = totalMs;
        render();
    }

    function beep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.25, 0.5].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.value = 880;
                gain.gain.value = 0.15;
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.15);
            });
        } catch { /* audio unavailable */ }
    }

    function nextMode() {
        if (mode !== 'focus') return 'focus';
        return completed % SESSIONS_BEFORE_LONG === 0 ? 'long' : 'short';
    }

    function finish() {
        stop();
        beep();
        if (mode === 'focus') {
            const key = dateKey(new Date());
            const e = history[key] || { n: 0, min: 0 };
            e.n++;
            e.min += settings.focus;
            history[key] = e;
            save(HISTORY_KEY, history);
            completed = e.n;
            renderCalendar();
        }
        setMode(nextMode());
    }

    function tick() {
        remainingMs = endTime - Date.now();
        if (remainingMs <= 0) {
            finish();
        } else {
            render();
        }
    }

    function toggle() {
        if (timer) {
            remainingMs = endTime - Date.now();
            stop();
        } else {
            endTime = Date.now() + remainingMs;
            timer = setInterval(tick, 250);
        }
        render();
    }

    // ----- Expanded (full-screen) focus view -----
    function isExpanded() {
        return root.classList.contains('expanded');
    }

    function setExpanded(on) {
        if (on === isExpanded()) return;
        root.classList.toggle('expanded', on);
        document.body.classList.toggle('timer-expanded', on);
        expandBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Expand timer to full screen');
        expandBtn.title = on ? 'Exit full screen (F or Esc)' : 'Full screen (F)';
        try {
            if (on && root.requestFullscreen) {
                root.requestFullscreen().catch(() => { /* the fixed-position overlay still works */ });
            } else if (!on && document.fullscreenElement) {
                document.exitFullscreen();
            }
        } catch { /* fullscreen unsupported */ }
    }

    // Leaving browser full screen with Esc should also leave the expanded view.
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isExpanded()) setExpanded(false);
    });

    expandBtn.addEventListener('click', () => setExpanded(!isExpanded()));

    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            if (e.key !== 'Escape') return;
        }
        if (e.key === 'Escape') {
            setExpanded(false);
        } else if (e.key === 'f' || e.key === 'F') {
            setExpanded(!isExpanded());
        } else if (e.key === ' ') {
            // On a focused button, Space already activates that button.
            if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return;
            e.preventDefault();
            toggle();
        } else if (e.key === 'r' || e.key === 'R') {
            setMode(mode);
        }
    });

    startBtn.addEventListener('click', toggle);
    resetBtn.addEventListener('click', () => setMode(mode));
    skipBtn.addEventListener('click', () => {
        // Skipping a focus session does not count as completed.
        setMode(mode === 'focus' ? 'short' : 'focus');
    });
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));

    Object.keys(inputs).forEach(key => {
        inputs[key].value = settings[key];
        inputs[key].addEventListener('change', () => {
            const max = Number(inputs[key].max);
            const v = Math.min(max, Math.max(1, parseInt(inputs[key].value, 10) || settings[key]));
            inputs[key].value = v;
            settings[key] = v;
            save(SETTINGS_KEY, settings);
            if (!timer && key === mode) setMode(mode);
        });
    });

    // ----- Progress: stats + 12-month calendar -----
    const monthsEl = document.getElementById('cal-months');
    const gridEl = document.getElementById('cal-grid');
    const statToday = document.getElementById('stat-today');
    const statStreak = document.getElementById('stat-streak');
    const statYear = document.getElementById('stat-year');
    const statYearLabel = document.getElementById('stat-year-label');

    function level(n) {
        return n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
    }

    function currentStreak(today) {
        const d = new Date(today);
        // A day without a session yet today doesn't break the streak.
        if (!(history[dateKey(d)] && history[dateKey(d)].n > 0)) d.setDate(d.getDate() - 1);
        let streak = 0;
        while (history[dateKey(d)] && history[dateKey(d)].n > 0) {
            streak++;
            d.setDate(d.getDate() - 1);
        }
        return streak;
    }

    function renderCalendar() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        // Start on the Sunday on/before the day one year ago, so columns are whole weeks.
        const start = new Date(now);
        start.setDate(start.getDate() - 364);
        start.setDate(start.getDate() - start.getDay());

        gridEl.textContent = '';
        monthsEl.textContent = '';
        let total = 0, totalMin = 0, week = 0, lastMonth = -1;

        for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0 && d > start) week++;
            const key = dateKey(d);
            const e = history[key];
            const n = e ? e.n : 0;
            const min = e ? e.min : 0;
            total += n;
            totalMin += min;

            const cell = document.createElement('span');
            cell.className = 'cal-cell' + (key === dateKey(now) ? ' today' : '');
            cell.dataset.level = level(n);
            const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            cell.title = n === 0
                ? 'No pomodoros on ' + label
                : n + (n === 1 ? ' pomodoro' : ' pomodoros') + ' (' + min + ' min) on ' + label;
            gridEl.appendChild(cell);

            // Month label above the first week column that starts within a month's first 7 days.
            if (d.getDay() === 0 && d.getDate() <= 7 && d.getMonth() !== lastMonth) {
                const month = document.createElement('span');
                month.textContent = d.toLocaleDateString(undefined, { month: 'short' });
                month.style.gridColumn = String(week + 1);
                monthsEl.appendChild(month);
                lastMonth = d.getMonth();
            }
        }

        statToday.textContent = todayCount();
        statStreak.textContent = currentStreak(now);
        statYear.textContent = total;
        statYearLabel.textContent = 'Last 12 months · ' + Math.round(totalMin / 6) / 10 + ' h';
    }

    render();
    renderCalendar();
})();
