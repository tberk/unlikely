// Unlikely — content script. Runs on x.com, does the actual unliking.
// The popup talks to it via chrome.tabs.sendMessage; run state lives in
// sessionStorage so a run survives the page reloads we trigger ourselves.
(() => {
  if (window.__unlikelyLoaded) return;
  window.__unlikelyLoaded = true;

  const SPEEDS = { careful: 1000, normal: 500, fast: 50 };
  const DEFAULTS = { speed: 'fast', limit: 0, ghosts: false };
  const RUN_KEY = 'unlikely:run';
  const DONE_KEY = 'unlikely:done';
  const COOLDOWN_MIN = 2 * 60_000;
  const COOLDOWN_MAX = 30 * 60_000;
  const FAILS_BEFORE_COOLDOWN = 3;
  const BOTTOM_CHECKS = 5; // consecutive "at bottom, nothing to do" checks before reloading
  const MAX_EMPTY_RELOADS = 2; // reloads in a row that removed nothing => finished
  const RATE_LIMIT_RE = /limit|try again|too many|something went wrong/i;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));
  const isLikesPage = () => /\/likes\/?$/.test(location.pathname);
  const testid = (el) => el.getAttribute('data-testid');

  let run = idleRun();
  let settings = { ...DEFAULTS };
  let token = 0; // bumped on stop so stale loops exit
  let removedSinceLoad = 0;
  let failed = new WeakSet(); // buttons that didn't flip; retried after a cooldown
  const handled = new Set(loadJSON(DONE_KEY, [])); // tweet ids we unliked (guards ghost mode)

  function idleRun() {
    return { running: false, phase: 'idle', message: '', count: 0, cooldownUntil: 0, emptyReloads: 0 };
  }

  function loadJSON(key, fallback) {
    try {
      return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveRun() {
    try {
      if (run.running) sessionStorage.setItem(RUN_KEY, JSON.stringify({ run, settings }));
      else sessionStorage.removeItem(RUN_KEY);
    } catch { }
  }

  function markHandled(id) {
    if (!id) return;
    handled.add(id);
    try {
      sessionStorage.setItem(DONE_KEY, JSON.stringify([...handled].slice(-5000)));
    } catch { }
  }

  function update(patch) {
    Object.assign(run, patch);
    saveRun();
    overlay.render();
  }

  // Sleep in small slices so Stop is responsive even during long cooldowns.
  async function wait(ms, my) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (my !== token) return false;
      await sleep(Math.min(250, end - Date.now()));
    }
    return my === token;
  }

  async function waitFor(cond, timeout) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (cond()) return true;
      await sleep(100);
    }
    return cond();
  }

  // --- DOM helpers -------------------------------------------------------

  function column() {
    return document.querySelector('[data-testid="primaryColumn"]') || document.querySelector('main') || document;
  }

  function tweetId(btn) {
    // The first <time> in an article belongs to the tweet itself (a quoted tweet's comes later).
    const link = btn.closest('article')?.querySelector('time')?.closest('a');
    return link?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1] ?? null;
  }

  function nextTarget() {
    const selector = settings.ghosts ? '[data-testid="unlike"], [data-testid="like"]' : '[data-testid="unlike"]';
    for (const btn of column().querySelectorAll(selector)) {
      if (failed.has(btn)) continue;
      const id = tweetId(btn);
      if (testid(btn) === 'unlike') return { btn, id, ghost: false };
      // Ghost like: listed on the likes page but the heart shows as not liked.
      // Only touch it when we can identify the tweet and haven't unliked it ourselves.
      if (id && !handled.has(id)) return { btn, id, ghost: true };
    }
    return null;
  }

  function atBottom() {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollTop + window.innerHeight >= el.scrollHeight - 200;
  }

  function isLoading() {
    return !!column().querySelector('[role="progressbar"]');
  }

  function rateLimitToast() {
    const toast = document.querySelector('[data-testid="toast"]');
    return !!toast && RATE_LIMIT_RE.test(toast.textContent || '');
  }

  // Click and confirm the heart actually flipped (and didn't snap back,
  // which is what X does when the request is rejected).
  async function flip(btn, expected) {
    btn.click();
    const flipped = await waitFor(() => !btn.isConnected || testid(btn) === expected, 4000);
    if (!flipped) return false;
    await sleep(600);
    return !btn.isConnected || testid(btn) === expected;
  }

  async function removeLike({ btn, ghost }, my) {
    btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (!(await wait(jitter(300), my))) return false;
    if (ghost) {
      // Re-like then unlike so X actually drops it from the list.
      if (!(await flip(btn, 'unlike'))) return false;
      if (!(await wait(jitter(700), my))) return false;
    }
    return flip(btn, 'like');
  }

  // --- main loop -----------------------------------------------------------

  async function loop(my) {
    let fails = 0;
    let cooldown = COOLDOWN_MIN;
    let bottomChecks = 0;

    while (my === token && run.running) {
      // X is a SPA; don't keep clicking hearts if the user navigates elsewhere.
      if (!isLikesPage()) return finish('Stopped — you left the likes page.');
      if (settings.limit && run.count >= settings.limit) {
        return finish(`Reached your limit of ${settings.limit}.`);
      }

      const target = nextTarget();

      if (!target) {
        if (isLoading() || !atBottom()) {
          bottomChecks = 0;
        } else if (++bottomChecks >= BOTTOM_CHECKS) {
          return endOfList();
        }
        update({ phase: 'scrolling', message: 'Looking for more likes…' });
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        if (!(await wait(1500, my))) return;
        continue;
      }

      bottomChecks = 0;
      update({ phase: 'working', message: target.ghost ? 'Clearing a ghost like…' : 'Unliking…' });
      const ok = await removeLike(target, my);
      if (my !== token) return;

      if (ok) {
        fails = 0;
        cooldown = COOLDOWN_MIN;
        removedSinceLoad++;
        markHandled(target.id);
        update({ count: run.count + 1 });
        bumpTotal();
      } else {
        failed.add(target.btn);
        fails++;
        if (fails >= FAILS_BEFORE_COOLDOWN || rateLimitToast()) {
          update({
            phase: 'cooldown',
            message: 'X is rate-limiting. Pausing…',
            cooldownUntil: Date.now() + cooldown,
          });
          if (!(await wait(cooldown, my))) return;
          cooldown = Math.min(cooldown * 2, COOLDOWN_MAX);
          fails = 0;
          failed = new WeakSet();
          update({ cooldownUntil: 0 });
          continue;
        }
      }

      if (!(await wait(jitter(SPEEDS[settings.speed] ?? SPEEDS.normal), my))) return;
    }
  }

  // X's likes timeline often stops paginating after a while; a reload
  // fetches a fresh list without the ones we already removed.
  function endOfList() {
    const emptyReloads = removedSinceLoad === 0 ? run.emptyReloads + 1 : 0;
    if (emptyReloads >= MAX_EMPTY_RELOADS) return finish('All done — no more likes found.');
    update({ phase: 'reloading', message: 'Reloading to fetch more likes…', emptyReloads });
    location.reload();
  }

  function bumpTotal() {
    chrome.storage.local.get({ total: 0 }, ({ total }) => chrome.storage.local.set({ total: total + 1 }));
  }

  function start(opts) {
    if (run.running) return { ok: true };
    if (!isLikesPage()) return { ok: false, error: 'Open your likes page first.' };
    settings = { ...DEFAULTS, ...opts };
    run = { ...idleRun(), running: true, phase: 'working', message: 'Starting…' };
    removedSinceLoad = 0;
    failed = new WeakSet();
    update({});
    loop(++token);
    return { ok: true };
  }

  function finish(message) {
    token++;
    update({ running: false, phase: 'done', message, cooldownUntil: 0 });
  }

  function stop() {
    if (!run.running) return;
    finish('Stopped.');
  }

  // Resume a run that survived a reload in this tab.
  function resume() {
    const saved = loadJSON(RUN_KEY, null);
    if (!saved?.run?.running || !isLikesPage()) return;
    settings = { ...DEFAULTS, ...saved.settings };
    run = { ...saved.run, phase: 'working', message: 'Resuming after reload…' };
    overlay.render();
    const my = ++token;
    // Give X a moment to render the timeline.
    wait(3000, my).then((ok) => ok && loop(my));
  }

  // --- on-page overlay -----------------------------------------------------
  // A small pill so progress stays visible after the popup closes.

  const overlay = (() => {
    let host, root, ticker;

    function mount() {
      host = document.createElement('div');
      host.id = 'unlikely-overlay';
      root = host.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host { all: initial; }
          .pill {
            position: fixed; left: 16px; bottom: 16px; z-index: 2147483647;
            display: flex; align-items: center; gap: 10px;
            padding: 8px 8px 8px 14px; border-radius: 999px;
            background: #0f1419; color: #e7e9ea; border: 1px solid #2f3336;
            font: 500 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 6px 24px rgba(0,0,0,.35);
          }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: #f91880; flex: none; }
          .pill.running .dot { animation: pulse 1.2s ease-in-out infinite; }
          .pill.cooldown .dot { background: #ffd400; }
          .pill.done .dot { background: #00ba7c; }
          @keyframes pulse { 50% { opacity: .3; } }
          b { font-weight: 700; font-variant-numeric: tabular-nums; }
          .msg { color: #8b98a5; }
          button {
            all: unset; cursor: pointer; padding: 5px 12px; border-radius: 999px;
            font-weight: 700; background: #eff3f4; color: #0f1419;
          }
          button:hover { background: #d7dbdc; }
          button.ghost { background: transparent; color: #8b98a5; padding: 5px 8px; }
          button.ghost:hover { color: #e7e9ea; }
        </style>
        <div class="pill"><span class="dot"></span><span class="text"></span><button></button></div>`;
      root.querySelector('button').addEventListener('click', () => {
        if (run.running) stop();
        else hide();
      });
      document.documentElement.appendChild(host);
    }

    function hide() {
      host?.remove();
      host = null;
      clearInterval(ticker);
    }

    function render() {
      if (run.phase === 'idle') return hide();
      if (!host || !host.isConnected) mount();
      const pill = root.querySelector('.pill');
      pill.className = `pill ${run.running ? 'running' : ''} ${run.phase}`;
      let msg = run.message;
      if (run.phase === 'cooldown' && run.cooldownUntil) {
        const s = Math.max(0, Math.ceil((run.cooldownUntil - Date.now()) / 1000));
        msg = `Rate-limited · resuming in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      }
      root.querySelector('.text').innerHTML = `<b>${run.count}</b> unliked <span class="msg">· ${escape(msg)}</span>`;
      const btn = root.querySelector('button');
      btn.textContent = run.running ? 'Stop' : '✕';
      btn.className = run.running ? '' : 'ghost';
      btn.title = run.running ? 'Stop unliking' : 'Dismiss';
      clearInterval(ticker);
      if (run.phase === 'cooldown') ticker = setInterval(render, 1000);
    }

    function escape(s) {
      return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    }

    return { render };
  })();

  // --- messaging -----------------------------------------------------------

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    switch (msg?.type) {
      case 'state':
        reply({ run, settings, likesPage: isLikesPage() });
        break;
      case 'start':
        reply(start(msg.settings));
        break;
      case 'stop':
        stop();
        reply({ ok: true });
        break;
    }
  });

  resume();
})();
