const LIKES_URL = 'https://x.com/i/history/likes';
const DEFAULTS = { speed: 'fast', limit: 0, ghosts: false };

const $ = (id) => document.getElementById(id);
let tab = null;

function isX(url) {
  return /^https:\/\/(x|twitter)\.com\//.test(url || '');
}

async function send(msg) {
  try {
    return await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    return null;
  }
}

// Tabs opened before the extension was installed have no content script yet.
async function ensureContentScript() {
  if (await send({ type: 'state' })) return true;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] });
  } catch {
    return false;
  }
  return !!(await send({ type: 'state' }));
}

function show(view) {
  $('view-away').hidden = view !== 'away';
  $('view-ready').hidden = view !== 'ready';
}

function render({ run, likesPage }) {
  if (!likesPage && !run.running) {
    show('away');
    $('open-likes').textContent = 'Go to my likes';
    return;
  }
  show('ready');
  $('count').textContent = run.count;

  const status = $('status');
  status.className = 'status muted';
  let text = run.message || 'Ready.';
  if (run.phase === 'cooldown' && run.cooldownUntil) {
    const s = Math.max(0, Math.ceil((run.cooldownUntil - Date.now()) / 1000));
    text = `Rate-limited by X — resuming in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    status.className = 'status warn';
  } else if (run.phase === 'done') {
    status.className = run.message.startsWith('All done') ? 'status ok' : 'status muted';
  }
  status.textContent = text;

  const btn = $('toggle');
  btn.textContent = run.running ? 'Stop' : run.phase === 'done' ? 'Start again' : 'Start';
  btn.classList.toggle('stop', run.running);
  $('settings').setAttribute('aria-disabled', run.running);
  document.querySelector('footer').hidden = !run.running;
}

async function refresh() {
  const state = await send({ type: 'state' });
  if (state) render(state);
}

async function loadSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $(`speed-${s.speed}`).checked = true;
  $('limit').value = s.limit || '';
  $('ghosts').checked = s.ghosts;
}

function readSettings() {
  return {
    speed: document.querySelector('input[name="speed"]:checked')?.value || DEFAULTS.speed,
    limit: Math.max(0, parseInt($('limit').value, 10) || 0),
    ghosts: $('ghosts').checked,
  };
}

async function renderTotal() {
  const { total } = await chrome.storage.local.get({ total: 0 });
  $('total').textContent = total ? `${total.toLocaleString()} all time` : '';
}

$('open-likes').addEventListener('click', async () => {
  if (tab && isX(tab.url)) await chrome.tabs.update(tab.id, { url: LIKES_URL });
  else await chrome.tabs.create({ url: LIKES_URL });
  window.close();
});

$('toggle').addEventListener('click', async () => {
  const state = await send({ type: 'state' });
  if (state?.run.running) {
    await send({ type: 'stop' });
  } else {
    const settings = readSettings();
    await chrome.storage.sync.set(settings);
    const res = await send({ type: 'start', settings });
    if (!res?.ok) {
      $('status').textContent = res?.error || 'Could not reach the page. Try reloading it.';
      $('status').className = 'status err';
      return;
    }
  }
  refresh();
});

for (const el of document.querySelectorAll('#settings input')) {
  el.addEventListener('change', () => chrome.storage.sync.set(readSettings()));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.total) renderTotal();
});

(async () => {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await Promise.all([loadSettings(), renderTotal()]);
  document.querySelector('footer').hidden = true;

  if (!tab || !isX(tab.url) || !(await ensureContentScript())) {
    show('away');
    return;
  }
  await refresh();
  setInterval(refresh, 500);
})();
