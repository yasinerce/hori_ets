const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = document.getElementById('ui');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const modeBadge = document.getElementById('modeBadge');
const selectedModeText = document.getElementById('selectedModeText');
const mainMenu = document.getElementById('mainMenu');
const settingsMenu = document.getElementById('settingsMenu');
const marketMenu = document.getElementById('marketMenu');
const pauseMenu = document.getElementById('pauseMenu');
const gameOverPanel = document.getElementById('gameOverPanel');
const finalScoreEl = document.getElementById('finalScore');
const deathReasonEl = document.getElementById('deathReason');
const deathTipEl = document.getElementById('deathTip');
const quickPlayBtn = document.getElementById('quickPlayBtn') || document.getElementById('playBtn') || document.getElementById('startBtn');
const quickPlaySub = document.getElementById('quickPlaySub');
const settingsMenuBtn = document.getElementById('settingsMenuBtn') || document.getElementById('settingsBtn');
const marketMenuBtn = document.getElementById('marketMenuBtn') || document.getElementById('marketBtn') || document.getElementById('shopBtn');
const backFromMarket = document.getElementById('backFromMarket');
const horiWalletEl = document.getElementById('horiWallet');
const marketHoriEl = document.getElementById('marketHori');
const skinGrid = document.getElementById('skinGrid');
const backFromSettings = document.getElementById('backFromSettings');
const retryBtn = document.getElementById('retryBtn');
const menuBtn = document.getElementById('menuBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const quitBtn = document.getElementById('quitBtn');
const pauseShadowInfo = document.getElementById('pauseShadowInfo');
const pauseSoundToggle = document.getElementById('pauseSoundToggle');
const pauseVibrationToggle = document.getElementById('pauseVibrationToggle');
const joystickEl = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const dashBtn = document.getElementById('dashBtn');
const dashCooldownEl = document.getElementById('dashCooldown');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const joystickFixedBtn = document.getElementById('joystickFixedBtn');
const joystickFreeBtn = document.getElementById('joystickFreeBtn');
const pauseJoystickFixedBtn = document.getElementById('pauseJoystickFixedBtn');
const pauseJoystickFreeBtn = document.getElementById('pauseJoystickFreeBtn');

let width = 0;
let height = 0;
const world = { width: 0, height: 0 };
const camera = { x: 0, y: 0 };
let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

// Mobile World Scale: UI stays touch-friendly, only in-game objects get smaller.
const WORLD_VISUAL_SCALE = 0.72;
const PLAYER_RADIUS = 10;
const TARGET_RADIUS = 10;
const SHADOW_BASE_RADIUS = 13;
const SHADOW_CLASSIC_MAX_RADIUS = 23;
const SHADOW_LUNGE_MAX_RADIUS = 25;
const SHADOW_RAGE_MAX_RADIUS = 30;
const SHADOW_HUNTER_MAX_RADIUS = 31;
const DANGER_BASE_DISTANCE = 22;
const DANGER_LUNGE_DISTANCE = 24;
const DANGER_RAGE_MAX_DISTANCE = 36;
const DANGER_HUNTER_MAX_DISTANCE = 38;
const MIRROR_DURATION_FRAMES = 420; // 7 seconds at ~60 FPS
const ZONE_POISON_FRAMES = 60; // ters kontrol başlamadan önce yaklaşık 1 saniye
const TRAP_DASH_LOCK_FRAMES = 600; // yaklaşık 10 saniye
const TRAP_SLOW_FRAMES = 3600; // yaklaşık 60 saniye
const MAX_SHADOW_TRAPS = 25;
const TRAP_EVERY_LIGHTS = 6;
const MAX_TRAP_SLOW_STACKS = 4;

const MODS = {
  hori_evolution: {
    id: 'hori_evolution',
    name: 'SONSUZ EVRİM',
    orientation: 'landscape',
    joystick: 'left-bottom',
    dash: true,
    polish: true,
    shadowMode: 'evolution',
    playerStartX: 0.5,
    playerStartY: 0.5,
    targetPadZones: ['joystick', 'dash'],
    bestKey: 'ets_best_hori_evolution',
  },
};

const settings = {
  sound: localStorage.getItem('ets_sound') !== 'off',
  vibration: localStorage.getItem('ets_vibration') !== 'off',
  fullscreen: localStorage.getItem('ets_fullscreen') !== 'off',
  joystickMode: localStorage.getItem('ets_joystick_mode') || 'fixed',
};

let savedModeId = 'hori_evolution';
let currentMode = MODS.hori_evolution;

const GAME = {
  state: 'menu',
  score: 0,
  best: 0,
  time: 0,
  shake: 0,
  flash: 0,
  nearDanger: 0,
  tutorialTimer: 0,
  warningTick: 0,
  rageBanner: 0,
  rageLevel: 0,
  lungeBanner: 0,
  hunterBanner: 0,
  hunterFocus: 0,
  hunterConfused: 0,
  zoneBanner: 0,
  zoneDanger: 0,
  zoneWarning: 0,
  zonePoisonTimer: 0,
  zonePoisonFlash: 0,
  mirrorTimer: 0,
  mirrorBanner: 0,
  trapBanner: 0,
  dashLockTimer: 0,
  trapSlowStacks: [],
  evolutionBanner: 0,
  evolutionLevel: 0,
  evolutionTitle: '',
  mockTest: false,
  mockCountdown: 0,
  lastRunWasMock: false,
};

const NOTIFY = {
  title: '',
  subtitle: '',
  timer: 0,
  duration: 1,
  color: '#ff2d55',
  priority: 0,
};

function notify(title, subtitle = '', color = '#ff2d55', duration = 88, priority = 1) {
  if (GAME.state !== 'playing') return;
  if (NOTIFY.timer > 0 && priority < NOTIFY.priority) return;
  // Prevent the same noisy message from restarting every frame.
  if (NOTIFY.timer > 18 && NOTIFY.title === title && NOTIFY.subtitle === subtitle) return;

  NOTIFY.title = title;
  NOTIFY.subtitle = subtitle;
  NOTIFY.color = color;
  NOTIFY.timer = duration;
  NOTIFY.duration = duration;
  NOTIFY.priority = priority;
}

function clearNotify() {
  NOTIFY.title = '';
  NOTIFY.subtitle = '';
  NOTIFY.timer = 0;
  NOTIFY.duration = 1;
  NOTIFY.priority = 0;
}

function activeTrapSlowStacks() {
  if (!GAME.trapSlowStacks) return 0;
  return GAME.trapSlowStacks.filter(v => v > 0).length;
}

function trapSlowMultiplier() {
  return Math.max(0.8, 1 - Math.min(MAX_TRAP_SLOW_STACKS, activeTrapSlowStacks()) * 0.05);
}

function trapSlowPercent() {
  return Math.min(20, activeTrapSlowStacks() * 5);
}

function maxTrapSlowTime() {
  if (!GAME.trapSlowStacks || GAME.trapSlowStacks.length === 0) return 0;
  return Math.max(...GAME.trapSlowStacks);
}

function formatFramesMMSS(frames) {
  const total = Math.max(0, Math.ceil(frames / 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}


const player = {
  x: 0,
  y: 0,
  r: PLAYER_RADIUS,
  maxSpeed: 5.25,
  dashSpeed: 16,
  dashFrames: 0,
  dashCooldown: 0,
  shadowTrailLock: 0,
  shadowRejoin: false,
  lastMoveX: 1,
  lastMoveY: 0,
  invuln: 0,
  skin: 'default',
};

const input = {
  x: 0,
  y: 0,
  active: false,
  pointerId: null,
  baseX: 0,
  baseY: 0,
  radius: 54,
  keyboard: new Set(),
};


const SKINS = {
  default: { id: 'default', form: 'classic', name: 'Klasik Hori', price: 0, outer: '#ffe15c', inner: '#ffffff', glow: '#ffef8a', sound: 'classic' },
  violet: { id: 'violet', form: 'classic', name: 'Mor Hori', price: 0, outer: '#9b5cff', inner: '#f4ddff', glow: '#b78cff', sound: 'violet' },
  cyan: { id: 'cyan', form: 'classic', name: 'Mavi Hori', price: 0, outer: '#2dd7ff', inner: '#e8fbff', glow: '#7afcff', sound: 'cyan' },
};

const economy = {
  totalHori: Number(localStorage.getItem('ets_hori_total') || 0),
  ownedSkins: JSON.parse(localStorage.getItem('ets_owned_skins') || '["default"]'),
  selectedSkin: localStorage.getItem('ets_selected_skin') || 'default',
};

function saveEconomy() {
  localStorage.setItem('ets_hori_total', String(economy.totalHori));
  localStorage.setItem('ets_owned_skins', JSON.stringify(economy.ownedSkins));
  localStorage.setItem('ets_selected_skin', economy.selectedSkin);
}

function ownsSkin(id) {
  return economy.ownedSkins.includes(id);
}

if (!SKINS[economy.selectedSkin]) economy.selectedSkin = 'default';

function currentSkin() {
  return SKINS[economy.selectedSkin] || SKINS.default;
}



function drawMockCountdownOverlay() {
  if (GAME.state !== 'countdown' || !GAME.mockTest) return;
  const left = typeof camera !== 'undefined' ? camera.x : 0;
  const top = typeof camera !== 'undefined' ? camera.y : 0;
  const n = Math.max(1, Math.ceil(GAME.mockCountdown / 60));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(left, top, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 86px Inter, Arial, sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.fillStyle = '#ffe15c';
  ctx.strokeText(String(n), left + width / 2, top + height / 2 - 14);
  ctx.fillText(String(n), left + width / 2, top + height / 2 - 14);
  ctx.font = '900 18px Inter, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.fillText('MOCK TEST BAŞLIYOR', left + width / 2, top + height / 2 + 58);
  ctx.restore();
}

function drawCanvasHoriPlayer() {
  const skin = currentSkin ? currentSkin() : { outer: '#ffe15c', inner: '#ffffff', glow: '#ffef8a' };
  const invulnPulse = player.invuln > 0 ? Math.sin(GAME.time * 0.8) * 0.25 + 0.75 : 1;
  const dash = player.dashFrames > 0;
  const pulse = 1 + Math.sin(GAME.time * 0.10) * 0.035;
  const lx = player.lastMoveX || 1;
  const ly = player.lastMoveY || 0;

  if (dash) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.50;
    ctx.strokeStyle = skin.glow;
    ctx.lineWidth = Math.max(4, player.r * 0.34);
    ctx.beginPath();
    ctx.moveTo(player.x - lx * player.r * 2.2, player.y - ly * player.r * 2.2);
    ctx.lineTo(player.x - lx * player.r * 0.42, player.y - ly * player.r * 0.42);
    ctx.stroke();

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#2dd7ff';
    ctx.lineWidth = Math.max(2, player.r * 0.18);
    ctx.beginPath();
    ctx.moveTo(player.x - lx * player.r * 2.8, player.y - ly * player.r * 2.8);
    ctx.lineTo(player.x - lx * player.r * 0.68, player.y - ly * player.r * 0.68);
    ctx.stroke();
    ctx.restore();
  }

  drawGlowCircle(player.x, player.y, 24 * pulse, skin.glow, 0.09 * invulnPulse);
  drawGlowCircle(player.x, player.y, player.r * pulse, skin.outer, invulnPulse);
  drawGlowCircle(player.x, player.y, player.r * 0.42 * pulse, skin.inner, invulnPulse);

  if (dash) {
    drawGlowCircle(player.x, player.y, player.r + 10, '#2dd7ff', 0.15);
  }
  if (player.invuln > 0) {
    drawGlowCircle(player.x, player.y, player.r + 9, '#2dd7ff', 0.18);
  }
}


function addHori(amount) {
  economy.totalHori = Math.max(0, economy.totalHori + amount);
  saveEconomy();
  updateEconomyUI();
}

function updateEconomyUI() {
  if (horiWalletEl) horiWalletEl.textContent = economy.totalHori;
  if (marketHoriEl) marketHoriEl.textContent = economy.totalHori;
  player.skin = economy.selectedSkin;
  renderMarket();
}

function buyOrSelectSkin(id) {
  const skin = SKINS[id] || SKINS.default;
  if (!ownsSkin(id)) {
    if (economy.totalHori < skin.price) {
      notify('HORI YETERSİZ', `${skin.price} Hori gerekli`, '#ffe15c', 72, 2);
      beep(190, 0.07, 'sawtooth', 0.018);
      return;
    }

    economy.totalHori -= skin.price;
    economy.ownedSkins.push(id);
  }

  economy.selectedSkin = id;
  saveEconomy();
  updateEconomyUI();
  beep(620, 0.055, 'triangle', 0.022);
}

function renderMarket() {
  if (!skinGrid) return;

  skinGrid.innerHTML = Object.values(SKINS).map(skin => {
    const owned = ownsSkin(skin.id);
    const selected = economy.selectedSkin === skin.id;
    const action = selected ? 'AKTİF' : owned ? 'SEÇ' : `${skin.price} HORI`;
    const locked = !owned && economy.totalHori < skin.price;

    return `
      <button class="skin-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}" data-skin="${skin.id}" type="button">
        <span class="skin-preview" style="--skin-outer:${skin.outer};--skin-inner:${skin.inner};--skin-glow:${skin.glow}"></span>
        <b>${skin.name}</b>
        <small>${action}</small>
      </button>
    `;
  }).join('');

  skinGrid.querySelectorAll('.skin-card').forEach(card => {
    card.addEventListener('click', () => buyOrSelectSkin(card.dataset.skin));
  });
}


const shadow = {
  points: [],
  delay: 62,
  r: SHADOW_BASE_RADIUS,
  dangerDistance: DANGER_BASE_DISTANCE,
  rageLevel: 0,
  lungeCooldown: 140,
  lungeCharge: 0,
  lungeAttack: 0,
  lungeRecover: 0,
  lungeDirX: 1,
  lungeDirY: 0,
  lungeOffsetX: 0,
  lungeOffsetY: 0,
  lungePower: 92,
  hunterX: 0,
  hunterY: 0,
  hunterVX: 0,
  hunterVY: 0,
  hunterEyeX: 1,
  hunterEyeY: 0,
  lungeStrikeX: 0,
  lungeStrikeY: 0,
};

const target = {
  x: 0,
  y: 0,
  r: TARGET_RADIUS,
  pulse: 0,
  isTrap: false,
};

const particles = [];
const shadowZones = [];
const shadowTraps = [];
const stars = [];
let audioCtx = null;

function bestForMode() {
  return Number(localStorage.getItem(currentMode.bestKey) || 0);
}

function saveBestForMode(value) {
  localStorage.setItem(currentMode.bestKey, String(value));
}

function vibrate(ms) {
  if (settings.vibration && navigator.vibrate) navigator.vibrate(ms);
}

function beep(freq = 440, duration = 0.055, type = 'sine', volume = 0.035) {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function showScreen(screen) {
  [mainMenu, marketMenu, settingsMenu, pauseMenu, gameOverPanel]
    .filter(Boolean)
    .forEach(el => el.classList.remove('active'));
  if (screen) screen.classList.add('active');
}

function setMode(modeId) {
  currentMode = MODS.hori_evolution;
  localStorage.setItem('ets_mode', currentMode.id);
  ui.classList.remove('mode-vert');
  ui.classList.add('mode-hori');
  if (modeBadge) modeBadge.textContent = currentMode.name;
  if (selectedModeText) selectedModeText.textContent = currentMode.name;
  if (quickPlaySub) quickPlaySub.textContent = 'Gölge zamanla güçlenir. Hayatta kalabildiğin kadar kal.';
  updateWorldSize();
  updateCamera();
  GAME.best = bestForMode();
  if (bestEl) bestEl.textContent = GAME.best;
  updateJoystickCenter();
}

function syncJoystickToggleTracks() {
  const isFree = settings.joystickMode === 'free';

  [
    [joystickFixedBtn, joystickFreeBtn],
    [pauseJoystickFixedBtn, pauseJoystickFreeBtn],
  ].forEach(([fixedBtn, freeBtn]) => {
    if (fixedBtn) fixedBtn.classList.toggle('selected', !isFree);
    if (freeBtn) freeBtn.classList.toggle('selected', isFree);

    const track = fixedBtn?.closest('.joystick-toggle') || freeBtn?.closest('.joystick-toggle');
    if (track) track.classList.toggle('free-selected', isFree);
  });
}

function updateSettingsUI() {
  soundToggle.textContent = settings.sound ? 'AÇIK' : 'KAPALI';
  vibrationToggle.textContent = settings.vibration ? 'AÇIK' : 'KAPALI';
  if (pauseSoundToggle) pauseSoundToggle.textContent = settings.sound ? 'AÇIK' : 'KAPALI';
  if (pauseVibrationToggle) pauseVibrationToggle.textContent = settings.vibration ? 'AÇIK' : 'KAPALI';
  syncJoystickToggleTracks();
}


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateWorldSize() {
  if (!width || !height) return;
  const landscape = currentMode.orientation === 'landscape';
  // Bigger-than-screen arena. Vert Mode is not a vertical tunnel; it uses
  // a broad, free arena so the player can move left/right as much as up/down.
  if (landscape) {
    world.width = Math.max(width, Math.floor(width * 2.55));
    world.height = Math.max(height, Math.floor(height * 2.05));
  } else {
    const arenaBase = Math.max(width, height);
    world.width = Math.max(width, Math.floor(arenaBase * 1.85));
    world.height = Math.max(height, Math.floor(arenaBase * 1.85));
  }
}

function updateCamera() {
  camera.x = clamp(player.x - width * 0.5, 0, Math.max(0, world.width - width));
  camera.y = clamp(player.y - height * 0.5, 0, Math.max(0, world.height - height));
}

function screenX(worldX) { return worldX - camera.x; }
function screenY(worldY) { return worldY - camera.y; }

function resize() {
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateWorldSize();
  createStars();
  if (GAME.state !== 'playing' && GAME.state !== 'paused') {
    player.x = world.width * currentMode.playerStartX;
    player.y = world.height * currentMode.playerStartY;
    updateCamera();
    if (width > 0 && height > 0 && world.width > 0 && world.height > 0) {
      spawnTarget(true);
    }
  } else {
    player.x = clamp(player.x, player.r, world.width - player.r);
    player.y = clamp(player.y, player.r, world.height - player.r);
    updateCamera();
    // Orientation changes can move the camera right after mode start.
    // For the first target, never allow an empty arena.
    if (GAME.score === 0) ensureFirstTargetVisible();
    else ensureTargetVisible();
  }
  updateJoystickCenter();
}

function createStars() {
  stars.length = 0;
  const count = Math.floor((width * height) / 8500);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.5 + 0.25,
      a: Math.random() * 0.58 + 0.1,
      s: Math.random() * 0.4 + 0.15,
    });
  }
}

async function activateFullscreenAndOrientation() {
  if (settings.fullscreen) {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_) {}

    try {
      const StatusBar = window.Capacitor?.Plugins?.StatusBar;
      if (StatusBar?.hide) await StatusBar.hide();
      if (StatusBar?.setOverlaysWebView) await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (_) {}
  }

  try {
    const orientationValue = currentMode.orientation === 'landscape' ? 'landscape' : 'portrait';
    const ScreenOrientation = window.Capacitor?.Plugins?.ScreenOrientation;
    if (ScreenOrientation?.lock) await ScreenOrientation.lock({ orientation: orientationValue });
    else if (screen.orientation?.lock) await screen.orientation.lock(orientationValue);
  } catch (_) {}
}

async function toggleFullscreenMode() {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      settings.fullscreen = false;
    } else {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      settings.fullscreen = true;
    }

    localStorage.setItem('ets_fullscreen', settings.fullscreen ? 'on' : 'off');
    updateSettingsUI();
  } catch (_) {}
}


function resetGame() {
  resize();
  const wasMockTest = !!GAME.mockTest;
  GAME.state = 'playing';
  GAME.score = wasMockTest ? 90 : 0;
  GAME.time = 0;
  GAME.shake = 0;
  GAME.flash = 0;
  GAME.nearDanger = 0;
  GAME.tutorialTimer = currentMode.polish ? 300 : 0;
  GAME.warningTick = 0;
  GAME.rageBanner = 0;
  GAME.rageLevel = 0;
  GAME.lungeBanner = 0;
  GAME.hunterBanner = 0;
  GAME.hunterFocus = 0;
  GAME.hunterConfused = 0;
  GAME.zoneBanner = 0;
  GAME.zoneDanger = 0;
  GAME.zoneWarning = 0;
  GAME.zonePoisonTimer = 0;
  GAME.zonePoisonFlash = 0;
  GAME.mirrorTimer = 0;
  GAME.mirrorBanner = 0;
  GAME.trapBanner = 0;
  GAME.dashLockTimer = 0;
  GAME.trapSlowStacks = [];
  GAME.evolutionBanner = 0;
  GAME.evolutionLevel = 0;
  GAME.evolutionTitle = '';
  GAME.mockTest = wasMockTest;
  if (GAME.mockTest) {
    GAME.evolutionLevel = 6;
    GAME.rageLevel = 4;
    GAME.evolutionBanner = 120;
    GAME.evolutionTitle = 'MOCK TEST: TÜM GÖLGELER AÇIK';
  }
  clearNotify();
  GAME.best = bestForMode();

  scoreEl.textContent = String(GAME.score);
  bestEl.textContent = GAME.best;
  updateEconomyUI();
  hud.classList.remove('hidden');
  pauseBtn.classList.remove('hidden');
  joystickEl.classList.remove('hidden');
  joystickEl.classList.toggle('free-mode', settings.joystickMode === 'free');
  joystickEl.classList.toggle('free-idle', settings.joystickMode === 'free');
  dashBtn.classList.toggle('hidden', !currentMode.dash);
  showScreen(null);
  resetInput();

  updateWorldSize();
  player.x = world.width * currentMode.playerStartX;
  player.y = world.height * currentMode.playerStartY;
  updateCamera();
  player.dashFrames = 0;
  player.dashCooldown = 0;
  player.shadowTrailLock = 0;
  player.shadowRejoin = false;
  player.invuln = 0;
  player.lastMoveX = 1;
  player.lastMoveY = 0;

  shadow.delay = 62;
  shadow.r = SHADOW_BASE_RADIUS;
  shadow.dangerDistance = DANGER_BASE_DISTANCE;
  shadow.rageLevel = 0;
  shadow.lungeCooldown = 130;
  shadow.lungeCharge = 0;
  shadow.lungeAttack = 0;
  shadow.lungeRecover = 0;
  shadow.lungeDirX = 1;
  shadow.lungeDirY = 0;
  shadow.lungeOffsetX = 0;
  shadow.lungeOffsetY = 0;
  shadow.lungePower = 92;
  shadow.hunterX = player.x - 120;
  shadow.hunterY = player.y;
  shadow.hunterVX = 0;
  shadow.hunterVY = 0;
  shadow.hunterEyeX = 1;
  shadow.hunterEyeY = 0;
  shadow.lungeStrikeX = player.x;
  shadow.lungeStrikeY = player.y;
  shadow.points.length = 0;
  particles.length = 0;
  shadowZones.length = 0;
  shadowTraps.length = 0;
  for (let i = 0; i < shadow.delay + 10; i++) shadow.points.push({ x: player.x, y: player.y });
  spawnTarget(true);

  // Some phones rotate/resize a moment after the mode starts.
  // Re-check the first target after layout settles so mod-selected games never start empty.
  setTimeout(() => {
    if (GAME.state === 'playing' && GAME.score === 0) {
      updateWorldSize();
      player.x = clamp(player.x, player.r, world.width - player.r);
      player.y = clamp(player.y, player.r, world.height - player.r);
      updateCamera();
      ensureFirstTargetVisible();
    }
  }, 180);

  setTimeout(() => {
    if (GAME.state === 'playing' && GAME.score === 0) {
      updateCamera();
      ensureFirstTargetVisible();
    }
  }, 420);
}

function returnToMenu() {
  GAME.mockTest = false;
  GAME.mockCountdown = 0;
  GAME.lastRunWasMock = false;
  GAME.state = 'menu';
  hud.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  joystickEl.classList.add('hidden');
  dashBtn.classList.add('hidden');
  showScreen(mainMenu);
  resetInput();
  
  try {
    const ScreenOrientation = window.Capacitor?.Plugins?.ScreenOrientation;
    if (ScreenOrientation?.unlock) ScreenOrientation.unlock();
    else if (screen.orientation?.unlock) screen.orientation.unlock();
  } catch (_) {}
}

function deathTipForReason(reason = '') {
  const text = String(reason).toLowerCase();
  if (text.includes('trap') || text.includes('dash')) return 'İpucu: Şüpheli ışığa dashsiz yaklaşma.';
  if (text.includes('mirror') || text.includes('ters')) return 'İpucu: Mor izden hızlı çık, sayaç dolmasın.';
  if (text.includes('zone') || text.includes('mor iz')) return 'İpucu: Mor izleri kesmek yerine çevresinden dolaş.';
  if (text.includes('lunge')) return 'İpucu: Kırmızı uyarıda yön değiştir veya dash at.';
  if (text.includes('hunter')) return 'İpucu: Hori’ye düz gitme, kısa yanıltma rotası çiz.';
  return 'İpucu: Dash’i sona sakla, düz kaçma.';
}

function gameOver(reason = 'Mor gölge sana temas etti.') {
  if (GAME.state !== 'playing') return;
  GAME.state = 'over';
  GAME.shake = 20;
  GAME.flash = 1;
  createBurst(player.x, player.y, '#ff2d55', 42);
  beep(120, 0.16, 'sawtooth', 0.05);
  vibrate([45, 35, 70]);

  if (GAME.score > GAME.best) {
    GAME.best = GAME.score;
    saveBestForMode(GAME.best);
  }

  bestEl.textContent = GAME.best;
  finalScoreEl.textContent = `Hori: ${GAME.score}`;
  deathReasonEl.textContent = reason;
  if (deathTipEl) deathTipEl.textContent = deathTipForReason(reason);
  joystickEl.classList.add('hidden');
  dashBtn.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  showScreen(gameOverPanel);
  resetInput();
}

function padZoneRects() {
  const rects = [];
  const pad = 42;
  if (currentMode.targetPadZones.includes('joystick') && !joystickEl.classList.contains('hidden')) {
    const r = joystickEl.getBoundingClientRect();
    rects.push({ left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad });
  }
  if (currentMode.targetPadZones.includes('dash') && !dashBtn.classList.contains('hidden')) {
    const r = dashBtn.getBoundingClientRect();
    rects.push({ left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad });
  }
  return rects;
}

function screenPointBlocked(txScreen, tyScreen, controls = padZoneRects()) {
  const inControl = controls.some(r => txScreen > r.left && txScreen < r.right && tyScreen > r.top && tyScreen < r.bottom);
  const topHudBlocked = tyScreen < 76 && txScreen > width * 0.22 && txScreen < width * 0.78;
  return inControl || topHudBlocked;
}

function isTargetVisible(extraPad = 0) {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;
  const sx = screenX(target.x);
  const sy = screenY(target.y);
  return sx > 32 + extraPad && sx < width - 32 - extraPad && sy > 38 + extraPad && sy < height - 38 - extraPad;
}

function ensureTargetVisible() {
  // After the first light, targets are allowed to spawn outside the camera view.
  // The mini map is now the navigation tool, so we do not force respawn into view.
}

function ensureFirstTargetVisible() {
  if (GAME.state !== 'playing' || GAME.score > 0) return;
  if (!isTargetVisible(0)) {
    spawnTarget(true);
  }
}

function spawnTarget(forceVisible = false) {
  const margin = 50;
  const controls = padZoneRects();
  const minDist = Math.max(125, Math.min(width, height) * 0.26);

  const canUsePoint = (x, y) => {
    const txScreen = screenX(x);
    const tyScreen = screenY(y);
    const playerDist = Math.hypot(x - player.x, y - player.y);
    if (playerDist < minDist) return false;
    for (const trap of shadowTraps) {
      if (Math.hypot(x - trap.x, y - trap.y) < TARGET_RADIUS * 3.2) return false;
    }
    // If the target is visible, keep it away from joystick/dash/HUD zones.
    // If it is outside the camera, screen controls do not matter.
    if (txScreen >= 0 && txScreen <= width && tyScreen >= 0 && tyScreen <= height) {
      if (screenPointBlocked(txScreen, tyScreen, controls)) return false;
    }
    return true;
  };

  if (forceVisible) {
    // First light only: spawn inside the CURRENT camera view so the player instantly understands the goal.
    const viewLeft = clamp(camera.x + margin, margin, Math.max(margin, world.width - margin));
    const viewRight = clamp(camera.x + width - margin, margin, Math.max(margin, world.width - margin));
    const viewTop = clamp(camera.y + margin, margin, Math.max(margin, world.height - margin));
    const viewBottom = clamp(camera.y + height - margin, margin, Math.max(margin, world.height - margin));
    const viewW = Math.max(20, viewRight - viewLeft);
    const viewH = Math.max(20, viewBottom - viewTop);

    for (let i = 0; i < 140; i++) {
      const x = viewLeft + Math.random() * viewW;
      const y = viewTop + Math.random() * viewH;
      if (canUsePoint(x, y)) {
        target.x = x;
        target.y = y;
        decideTargetTrap(forceVisible);
        return;
      }
    }

    target.x = clamp(camera.x + width * 0.5, margin, world.width - margin);
    target.y = clamp(camera.y + height * 0.5, margin, world.height - margin);
    decideTargetTrap(forceVisible);
    return;
  }

  // After the first light: spawn anywhere in the full arena.
  // This gives purpose to the mini map and makes the big map feel meaningful.
  for (let i = 0; i < 180; i++) {
    const x = margin + Math.random() * Math.max(20, world.width - margin * 2);
    const y = margin + Math.random() * Math.max(20, world.height - margin * 2);
    if (canUsePoint(x, y)) {
      target.x = x;
      target.y = y;
      return;
    }
  }

  // Fallback: place it somewhere away from the player, still inside the full arena.
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.min(Math.max(width, height) * 0.75, Math.min(world.width, world.height) * 0.45);
  target.x = clamp(player.x + Math.cos(angle) * dist, margin, world.width - margin);
  target.y = clamp(player.y + Math.sin(angle) * dist, margin, world.height - margin);
  decideTargetTrap(forceVisible);
}

function decideTargetTrap(forceVisible = false) {
  // Persistent trap system uses separate map traps, not fake target lights.
  target.isTrap = false;
}

function canUseTrapPoint(x, y) {
  const margin = 50;
  if (x < margin || y < margin || x > world.width - margin || y > world.height - margin) return false;
  if (Math.hypot(x - player.x, y - player.y) < 170) return false;
  if (Math.hypot(x - target.x, y - target.y) < TARGET_RADIUS * 4.2) return false;
  for (const t of shadowTraps) {
    if (Math.hypot(x - t.x, y - t.y) < TARGET_RADIUS * 3.2) return false;
  }
  return true;
}

function dropShadowTrap() {
  if (!shadowHas('trap')) return;

  const margin = 55;
  let x = margin + Math.random() * Math.max(20, world.width - margin * 2);
  let y = margin + Math.random() * Math.max(20, world.height - margin * 2);

  // Trap spawns like a normal light: random across the map, but never on top of target/traps/player.
  for (let i = 0; i < 180; i++) {
    const tx = margin + Math.random() * Math.max(20, world.width - margin * 2);
    const ty = margin + Math.random() * Math.max(20, world.height - margin * 2);
    if (canUseTrapPoint(tx, ty)) {
      x = tx;
      y = ty;
      break;
    }
  }

  shadowTraps.push({
    x,
    y,
    r: TARGET_RADIUS,
    pulse: Math.random() * Math.PI * 2,
    blinkSeed: Math.random() * 1000,
  });

  while (shadowTraps.length > MAX_SHADOW_TRAPS) shadowTraps.shift();

  createBurst(x, y, '#ffe15c', 12);
  notify('SAHTE HORİ', 'Sahte ışık oluştu', '#ffe15c', 54, 3);
}

function triggerShadowTrap(index) {
  const trap = shadowTraps[index];
  if (!trap) return;

  GAME.dashLockTimer = TRAP_DASH_LOCK_FRAMES;
  player.dashCooldown = Math.max(player.dashCooldown, TRAP_DASH_LOCK_FRAMES);
  GAME.trapSlowStacks.push(TRAP_SLOW_FRAMES);
  while (GAME.trapSlowStacks.length > MAX_TRAP_SLOW_STACKS) GAME.trapSlowStacks.shift();
  GAME.trapBanner = 120;
  GAME.flash = Math.max(GAME.flash, 0.35);
  GAME.shake = Math.max(GAME.shake, 12);
  createBurst(trap.x, trap.y, '#b74cff', 34);
  notify('SAHTE HORİ', `Atılma kilitli · -%${trapSlowPercent()} hız`, '#ff2d55', 86, 5);
  beep(105, 0.16, 'sawtooth', 0.055);
  vibrate([40, 24, 62]);
  shadowTraps.splice(index, 1);
}

function createBurst(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = Math.random() * 5.3 + 1.4;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: Math.random() * 24 + 18,
      maxLife: 42,
      r: (Math.random() * 2.2 + 1.1) * WORLD_VISUAL_SCALE,
      color,
    });
  }
}


function isEvolutionMode() {
  return currentMode.shadowMode === 'evolution';
}

function evolutionLevelForScore(score) {
  if (GAME.mockTest) return 6;
  if (!isEvolutionMode()) return 0;
  if (score >= 85) return 6;
  if (score >= 70) return 5;
  if (score >= 55) return 4;
  if (score >= 40) return 3;
  if (score >= 25) return 2;
  if (score >= 10) return 1;
  return 0;
}

function hasEvolutionPower(power) {
  if (GAME.mockTest) return ['rage', 'zone', 'lunge', 'hunter', 'trap'].includes(power);
  if (!isEvolutionMode()) return false;
  const thresholds = {
    rage: 10,
    zone: 25,
    lunge: 40,
    hunter: 55,
    trap: 70,
  };
  return GAME.score >= thresholds[power];
}

function shadowHas(power) {
  return hasEvolutionPower(power);
}

function shadowPowerLabel(power) {
  const labels = {
    rage: 'Öfke',
    zone: 'Zehirli İz',
    lunge: 'Sıçrama',
    hunter: 'Avcı',
    trap: 'Sahte Hori',
  };
  return labels[power] || power;
}

function shadowBuildIntroLines() {
  return null;
}

function currentModeIntroLines() {
  const build = shadowBuildIntroLines();
  if (build) return build;

  if (isEvolutionMode()) {
    return {
      title: 'SONSUZ EVRİM',
      body: 'Gölge aşama aşama güçlenir.',
      hint: 'Işığı topla, rotanı temiz tut.'
    };
  }

  if (shadowHas('lunge')) return {
    title: 'SIÇRAMA',
    body: 'Gölge yakındayken kırmızı saldırı çizgisi hazırlar.',
    hint: 'Uyarıyı görünce dash at veya yön değiştir.',
  };

  if (shadowHas('hunter')) return {
    title: 'AVCI',
    body: 'Gölge sadece arkadan gelmez, hedef yolunu kesmeye çalışır.',
    hint: 'Dash gölgeyi kısa süre şaşırtabilir.',
  };

  if (shadowHas('zone')) return {
    title: 'ZEHİRLİ İZ',
    body: 'Gölge mor izler bırakır. İzde kalırsan zehir sayacı dolar.',
    hint: 'Sayaç dolarsa kontroller 7 saniye ters döner.',
  };

  if (shadowHas('trap')) return {
    title: 'SAHTE HORİ',
    body: 'Bazı Hori ışıkları sahte olabilir.',
    hint: 'Sahte Hori atılmayı kilitler ve hızını düşürür.',
  };

  return {
    title: 'GÖLGEYİ YE',
    body: 'Hori topla.',
    hint: 'Mor gölgenin kırmızı halkasına girme.',
  };
}

function activeShadowPowerList() {
  const powers = [];
  if (shadowHas('rage')) powers.push('rage');
  if (shadowHas('zone')) powers.push('zone');
  if (shadowHas('lunge')) powers.push('lunge');
  if (shadowHas('hunter')) powers.push('hunter');
  if (shadowHas('trap')) powers.push('trap');
  return powers;
}

function shadowPowerDetail(power) {
  const details = {
    rage: {
      name: 'Gölge Öfkesi',
      desc: 'Gölge zamanla büyür, hızlanır ve temas alanı daha tehlikeli olur.',
      tactic: 'Düz kaçmak yerine geniş dönüş yap. Hedefe giderken gölgeyi mapin boş tarafına çek.',
    },
    zone: {
      name: 'Zehirli İz',
      desc: 'Gölge geçtiği yerde mor iz bırakır. İzde 1 saniye kalırsan Ters Kontrol başlar.',
      tactic: 'Mor izi kesip geçme; iz çevresinden rota çiz. Zone içindeysen hemen dışarı çık.',
    },
    lunge: {
      name: 'Gölge Sıçraması',
      desc: 'Gölge yakındayken kırmızı uyarı verip ani saldırı hazırlar.',
      tactic: 'Uyarıyı görünce dash at veya 90 derece yön değiştir. Uzakken boşa atlamaz.',
    },
    hunter: {
      name: 'Avcı Gölge',
      desc: 'Gölge sadece arkadan gelmez; hedefe giden yolunu kesmeye çalışır.',
      tactic: 'Hori’ye düz gitme. Kısa fake rota çiz, sonra dash ile asıl hedefe dön.',
    },
    trap: {
      name: 'Sahte Hori',
      desc: 'Haritada gerçek ışık gibi görünen sahte ışıklar bırakır. Sahte Hori atılmayı kilitler ve hızını düşürür.',
      tactic: 'Işığın 3 saniyelik mor blinkini yakalamaya çalış. Şüpheli ışığa dashsiz girme.',
    },
  };
  return details[power] || null;
}

function updatePauseShadowInfo() {
  if (!pauseShadowInfo) return;

  const powers = activeShadowPowerList();
  const modeName = 'Sonsuz Evrim';

  if (!powers.length) {
    pauseShadowInfo.innerHTML = `
      <div class="pause-mode-name">${modeName}</div>
      <div class="pause-empty">
        Şu an özel gölge gücü aktif değil. Temel hedef: sarı ışıkları topla ve mor gölgenin temas alanından uzak dur.
      </div>
    `;
    return;
  }

  const cards = powers.map(power => {
    const d = shadowPowerDetail(power);
    if (!d) return '';
    return `
      <div class="pause-shadow-card">
        <b>${d.name}</b>
        <p>${d.desc}</p>
        <small>TAKTİK: ${d.tactic}</small>
      </div>
    `;
  }).join('');

  const activeText = powers.map(shadowPowerLabel).join(' + ');

  pauseShadowInfo.innerHTML = `
    <div class="pause-mode-name">${modeName}</div>
    <div class="pause-active-line">${activeText}</div>
    ${cards}
  `;
}

function evolutionPowerName(level) {
  if (level === 1) return 'GÖLGE ÖFKESİ AÇILDI';
  if (level === 2) return 'ZEHİRLİ İZ AÇILDI';
  if (level === 3) return 'SIÇRAMA AÇILDI';
  if (level === 4) return 'AVCI GÖLGE AÇILDI';
  if (level === 5) return 'SAHTE HORİ AÇILDI';
  if (level >= 6) return 'KABUS EVRESİ';
  return '';
}

function updateEvolutionUnlocks() {
  if (!isEvolutionMode()) return;
  const level = evolutionLevelForScore(GAME.score);
  if (level > GAME.evolutionLevel) {
    GAME.evolutionLevel = level;
    GAME.evolutionTitle = evolutionPowerName(level);
    GAME.evolutionBanner = 0;
    notify(GAME.evolutionTitle || 'GÖLGE EVRİMLEŞTİ', `Evrim Seviyesi ${GAME.evolutionLevel} · Güçler birlikte aktif`, '#ff2d55', 118, 5);
    GAME.shake = Math.max(GAME.shake, 11);
    GAME.flash = Math.max(GAME.flash, 0.38);
    createBurst(player.x, player.y, '#ff2d55', 34);
    beep(120 + level * 35, 0.13, 'sawtooth', 0.05);
    vibrate([35, 24, 58]);
  }
}

function calculateRageLevel(score) {
  if (GAME.mockTest) return 4;
  if (hasEvolutionPower('rage')) {
    return Math.min(4, Math.floor((score - 10) / 18) + 1);
  }
  return 0;
}

function applyShadowDifficulty() {
  const rage = calculateRageLevel(GAME.score);
  const previous = shadow.rageLevel || 0;
  shadow.rageLevel = rage;
  GAME.rageLevel = rage;

  if (shadowHas('rage')) {
    const rageSoft = isEvolutionMode() ? 0.55 : 1;
    shadow.delay = Math.max(18, 62 - Math.floor(GAME.score * 1.35 * rageSoft) - Math.floor(rage * 5 * rageSoft));
    shadow.r = Math.min(SHADOW_RAGE_MAX_RADIUS, SHADOW_BASE_RADIUS + GAME.score * 0.13 * rageSoft + rage * 1.7 * rageSoft);
    shadow.dangerDistance = Math.min(DANGER_RAGE_MAX_DISTANCE, DANGER_BASE_DISTANCE + rage * 1.9 * rageSoft);
    if (rage > previous) {
      GAME.rageBanner = 0;
      notify(`GÖLGE ÖFKESİ ${GAME.rageLevel}`, 'Gölge büyür ve hızlanır', '#ff2d55', 82, 3);
      GAME.shake = Math.max(GAME.shake, 9);
      GAME.flash = Math.max(GAME.flash, 0.34);
      createBurst(player.x, player.y, '#ff2d55', 28);
      beep(150 + rage * 35, 0.12, 'sawtooth', 0.04);
      vibrate([28, 25, 42]);
    }
  } else if (shadowHas('lunge')) {
    shadow.delay = Math.max(26, 64 - Math.floor(GAME.score * 0.9));
    shadow.r = Math.min(SHADOW_LUNGE_MAX_RADIUS, SHADOW_BASE_RADIUS + GAME.score * 0.13);
    shadow.dangerDistance = DANGER_LUNGE_DISTANCE;
    shadow.lungePower = Math.min(128, 82 + GAME.score * 2.8);
  } else if (shadowHas('hunter')) {
    const focus = GAME.hunterFocus || 0;
    const confused = GAME.hunterConfused > 0 ? 1 : 0;
    shadow.delay = Math.max(28, 64 - Math.floor(GAME.score * 0.7));
    shadow.r = Math.min(SHADOW_HUNTER_MAX_RADIUS, SHADOW_BASE_RADIUS + GAME.score * 0.08 + focus * 7);
    shadow.dangerDistance = Math.min(DANGER_HUNTER_MAX_DISTANCE, DANGER_BASE_DISTANCE + focus * 9 - confused * 5);
  } else if (shadowHas('zone')) {
    shadow.delay = Math.max(26, 64 - Math.floor(GAME.score * 0.9));
    shadow.r = Math.min(SHADOW_CLASSIC_MAX_RADIUS + 2, SHADOW_BASE_RADIUS + GAME.score * 0.10);
    shadow.dangerDistance = DANGER_BASE_DISTANCE + 2;
  } else {
    shadow.delay = Math.max(22, 62 - Math.floor(GAME.score * 1.55));
    shadow.r = Math.min(SHADOW_CLASSIC_MAX_RADIUS, SHADOW_BASE_RADIUS + GAME.score * 0.18);
    shadow.dangerDistance = DANGER_BASE_DISTANCE;
  }
  applyEvolutionStackDifficulty();
}

function applyEvolutionStackDifficulty() {
  if (!isEvolutionMode()) return;
  const level = evolutionLevelForScore(GAME.score);
  if (level <= 0) return;
  shadow.delay = Math.max(16, shadow.delay - level * 3);
  shadow.r = Math.min(34, shadow.r + level * 0.7);
  shadow.dangerDistance = Math.min(42, shadow.dangerDistance + level * 1.2);
  if (level >= 6) {
    shadow.r = Math.min(36, shadow.r + 2);
    shadow.dangerDistance = Math.min(45, shadow.dangerDistance + 2);
  }
}

function er(baseHead) {
  if (!shadowHas('hunter')) {
    return baseHead;
  }

  // İlk ışık toplanana kadar klasik trail gibi davran; oyun başlamadan titreme yapmasın.
  if (GAME.score <= 0) {
    shadow.hunterX = baseHead.x;
    shadow.hunterY = baseHead.y;
    shadow.hunterVX = 0;
    shadow.hunterVY = 0;
    return baseHead;
  }

  if (GAME.hunterConfused > 0) GAME.hunterConfused -= 1;

  const distToTarget = Math.hypot(player.x - target.x, player.y - target.y);
  const distToPlayer = Math.hypot(player.x - shadow.hunterX, player.y - shadow.hunterY);
  const focus = clamp(1 - ((distToTarget - 90) / 300), 0, 1);
  GAME.hunterFocus = GAME.hunterFocus * 0.88 + focus * 0.12;

  if (focus > 0.45 && GAME.hunterBanner <= 0) {
    GAME.hunterBanner = 60;
    beep(190, 0.055, 'sawtooth', 0.022);
  }

  const moveMag = Math.hypot(player.lastMoveX || 0, player.lastMoveY || 0);
  const moving = moveMag > 0.12;

  let desiredX;
  let desiredY;

  if (moving) {
    // Oyuncu hareket ediyorsa Avcı hâlâ yol keser; fakat hedefe çizgi çizilmediği için
    // Sahte Hori seviyesi gerçek hedefi ele vermez.
    const leadX = player.x + player.lastMoveX * (80 + GAME.score * 2.2);
    const leadY = player.y + player.lastMoveY * (80 + GAME.score * 2.2);
    const cutX = player.x * 0.55 + target.x * 0.45;
    const cutY = player.y * 0.55 + target.y * 0.45;
    const interceptX = leadX * (0.55 - focus * 0.18) + cutX * (0.45 + focus * 0.18);
    const interceptY = leadY * (0.55 - focus * 0.18) + cutY * (0.45 + focus * 0.18);

    const trailWeight = GAME.hunterConfused > 0 ? 0.88 : 0.44 - focus * 0.18;
    const aiWeight = 1 - trailWeight;
    desiredX = baseHead.x * trailWeight + interceptX * aiWeight;
    desiredY = baseHead.y * trailWeight + interceptY * aiWeight;
  } else {
    // Oyuncu duruyorsa Avcı beklemez: doğrudan oyuncuya baskı kurar.
    // Biraz yan açı eklenir ki düz çizgide donuk görünmesin, ama ana hedef oyuncudur.
    const angle = Math.atan2(player.y - shadow.hunterY, player.x - shadow.hunterX);
    const orbit = Math.sin(GAME.time * 0.045) * Math.min(46, 18 + GAME.score * 0.25);
    desiredX = player.x + Math.cos(angle + Math.PI / 2) * orbit;
    desiredY = player.y + Math.sin(angle + Math.PI / 2) * orbit;
    GAME.hunterFocus = Math.max(GAME.hunterFocus, 0.62);
  }

  const dx = desiredX - shadow.hunterX;
  const dy = desiredY - shadow.hunterY;
  const dist = Math.hypot(dx, dy);

  if (dist < 2.2) {
    shadow.hunterVX *= 0.68;
    shadow.hunterVY *= 0.68;
  } else {
    const idlePressure = moving ? 0 : clamp(1 - distToPlayer / 280, 0.25, 1);
    const maxSpeed = GAME.hunterConfused > 0
      ? 2.8
      : 4.2 + GAME.score * 0.045 + focus * 2.2 + (moving ? 0 : 1.35 + idlePressure * 1.15);
    const ax = (dx / dist) * maxSpeed;
    const ay = (dy / dist) * maxSpeed;
    shadow.hunterVX = shadow.hunterVX * 0.80 + ax * 0.20;
    shadow.hunterVY = shadow.hunterVY * 0.80 + ay * 0.20;
  }

  shadow.hunterX = clamp(shadow.hunterX + shadow.hunterVX, shadow.r, world.width - shadow.r);
  shadow.hunterY = clamp(shadow.hunterY + shadow.hunterVY, shadow.r, world.height - shadow.r);

  const eyeDx = player.x - shadow.hunterX;
  const eyeDy = player.y - shadow.hunterY;
  const eyeLen = Math.hypot(eyeDx, eyeDy) || 1;
  shadow.hunterEyeX = eyeDx / eyeLen;
  shadow.hunterEyeY = eyeDy / eyeLen;

  applyShadowDifficulty();
  return { x: shadow.hunterX, y: shadow.hunterY };
}

function updateShadowLunge(baseHead) {
  const hunterLayerActive = shadowHas('hunter');
  const canLunge = shadowHas('lunge') && GAME.score >= 2;

  if (!canLunge) {
    shadow.lungeOffsetX *= 0.86;
    shadow.lungeOffsetY *= 0.86;
    return baseHead;
  }

  // When Hunter is active, Hunter owns the real shadow position.
  // Lunge becomes a separate strike layer, not a second position controller.
  const source = hunterLayerActive
    ? { x: shadow.hunterX || baseHead.x, y: shadow.hunterY || baseHead.y }
    : baseHead;

  const distToPlayer = Math.hypot(player.x - source.x, player.y - source.y);
  const lungeTriggerRange = hunterLayerActive
    ? 230 + Math.min(70, GAME.score * 2.2)
    : 185 + Math.min(65, GAME.score * 2.0);

  const active = shadow.lungeCharge > 0 || shadow.lungeAttack > 0 || shadow.lungeRecover > 0;
  if (!active) {
    // Lunge artık her cooldown bittiğinde otomatik atlamaz.
    // Önce cooldown bitsin, sonra oyuncu menzile girerse saldırı hazırlasın.
    shadow.lungeCooldown -= 1;

    if (distToPlayer > lungeTriggerRange) {
      shadow.lungeCooldown = Math.max(shadow.lungeCooldown, 18);
      shadow.lungeOffsetX *= 0.86;
      shadow.lungeOffsetY *= 0.86;
    } else if (shadow.lungeCooldown <= 0) {
      const dx = player.x - source.x;
      const dy = player.y - source.y;
      const len = Math.hypot(dx, dy) || 1;
      shadow.lungeDirX = dx / len;
      shadow.lungeDirY = dy / len;
      shadow.lungeCharge = hunterLayerActive ? 30 : 40;
      shadow.lungeStrikeX = source.x + shadow.lungeDirX * shadow.lungePower;
      shadow.lungeStrikeY = source.y + shadow.lungeDirY * shadow.lungePower;
      GAME.lungeBanner = 0;
      notify('SIÇRAMA', hunterLayerActive ? 'Avcı saldırıyor' : 'Atıl', '#ff2d55', 54, 4);
      GAME.shake = Math.max(GAME.shake, 4);
      GAME.flash = Math.max(GAME.flash, 0.12);
      beep(180, 0.08, 'sawtooth', 0.03);
      vibrate(18);
    }
  }

  if (shadow.lungeCharge > 0) {
    shadow.lungeCharge -= 1;
    shadow.lungeOffsetX *= 0.72;
    shadow.lungeOffsetY *= 0.72;
    shadow.lungeStrikeX = source.x + shadow.lungeDirX * shadow.lungePower;
    shadow.lungeStrikeY = source.y + shadow.lungeDirY * shadow.lungePower;
    if (shadow.lungeCharge % 12 === 0) beep(230, 0.035, 'sawtooth', 0.018);
    if (shadow.lungeCharge === 0) {
      shadow.lungeAttack = hunterLayerActive ? 10 : 14;
      GAME.shake = Math.max(GAME.shake, 9);
      beep(95, 0.09, 'square', 0.04);
      vibrate([22, 18, 28]);
    }
  } else if (shadow.lungeAttack > 0) {
    const total = hunterLayerActive ? 10 : 14;
    const progress = (total - shadow.lungeAttack + 1) / total;
    const eased = Math.sin(progress * Math.PI * 0.5);

    if (hunterLayerActive) {
      // Keep real shadow stable; expose a strike point for collision/rendering.
      const power = shadow.lungePower * (0.65 + 0.35 * eased);
      shadow.lungeStrikeX = source.x + shadow.lungeDirX * power;
      shadow.lungeStrikeY = source.y + shadow.lungeDirY * power;
      shadow.lungeOffsetX *= 0.68;
      shadow.lungeOffsetY *= 0.68;
    } else {
      shadow.lungeOffsetX = shadow.lungeDirX * shadow.lungePower * eased;
      shadow.lungeOffsetY = shadow.lungeDirY * shadow.lungePower * eased;
      shadow.lungeStrikeX = source.x + shadow.lungeOffsetX;
      shadow.lungeStrikeY = source.y + shadow.lungeOffsetY;
    }

    shadow.lungeAttack -= 1;
    if (shadow.lungeAttack === 0) shadow.lungeRecover = hunterLayerActive ? 22 : 28;
  } else if (shadow.lungeRecover > 0) {
    shadow.lungeOffsetX *= 0.82;
    shadow.lungeOffsetY *= 0.82;
    shadow.lungeRecover -= 1;
    if (shadow.lungeRecover === 0) {
      shadow.lungeOffsetX = 0;
      shadow.lungeOffsetY = 0;
      shadow.lungeCooldown = Math.max(72, 145 - GAME.score * 2.2);
    }
  }

  if (hunterLayerActive) {
    return baseHead;
  }

  return { x: baseHead.x + shadow.lungeOffsetX, y: baseHead.y + shadow.lungeOffsetY };
}

function getShadowDrawPoint(baseHead) {
  if (shadowHas('hunter')) return { x: shadow.hunterX, y: shadow.hunterY };
  if (!shadowHas('lunge')) return baseHead;
  return { x: baseHead.x + shadow.lungeOffsetX, y: baseHead.y + shadow.lungeOffsetY };
}

function addShadowZone(x, y, intensity = 1) {
  if (!shadowHas('zone') || GAME.score <= 0) return;
  const last = shadowZones[shadowZones.length - 1];
  if (last && Math.hypot(x - last.x, y - last.y) < 34) return;

  const scoreBoost = Math.min(10, GAME.score) * 0.7;
  shadowZones.push({
    x,
    y,
    r: 28 + scoreBoost + Math.random() * 5,
    life: 190 + Math.min(90, GAME.score * 4),
    maxLife: 190 + Math.min(90, GAME.score * 4),
    danger: 0,
    intensity,
  });

  while (shadowZones.length > 58) shadowZones.shift();
}

function updateShadowZones() {
  GAME.zoneDanger = 0;
  if (!shadowHas('zone')) {
    shadowZones.length = 0;
    GAME.zonePoisonTimer = 0;
    return;
  }

  let insideAnyZone = false;

  for (let i = shadowZones.length - 1; i >= 0; i--) {
    const z = shadowZones[i];
    z.life -= 1;
    z.danger = Math.min(1, z.danger + 0.045);

    const dist = Math.hypot(player.x - z.x, player.y - z.y);
    const activeR = z.r * (0.72 + 0.28 * z.danger);
    const inside = dist < activeR;

    if (inside && player.invuln <= 0 && GAME.mirrorTimer <= 0) {
      insideAnyZone = true;
      const closeness = 1 - dist / activeR;
      GAME.zoneDanger = Math.max(GAME.zoneDanger, 0.35 + closeness * 0.65);

      // Zone poison stage:
      // Mor izde 1 saniye kalırsan Ters Kontrol tetiklenir.
      GAME.zonePoisonTimer = Math.min(ZONE_POISON_FRAMES, GAME.zonePoisonTimer + 1.35 + closeness * 0.75);
      GAME.zonePoisonFlash = Math.max(GAME.zonePoisonFlash, 8);

      // Hafif baskı var ama kontrolü hemen bozmaz.
      player.x -= input.x * (0.25 + closeness * 0.28);
      player.y -= input.y * (0.25 + closeness * 0.28);
      GAME.shake = Math.max(GAME.shake, 1.2 + closeness * 1.5);

      if (GAME.zoneWarning <= 0) {
        GAME.zoneWarning = 34;
        notify('ZEHİRLİ İZ', 'Mor izden çık', '#b74cff', 42, 3);
        beep(240, 0.04, 'sawtooth', 0.018);
        vibrate(10);
      }

      if (GAME.zonePoisonTimer >= ZONE_POISON_FRAMES) {
        GAME.zonePoisonTimer = 0;
        GAME.mirrorTimer = MIRROR_DURATION_FRAMES;
        GAME.mirrorBanner = Math.max(GAME.mirrorBanner, 78);
        GAME.zoneBanner = 0;
        notify('MIRROR', 'Kontroller ters', '#b74cff', 68, 5);
        beep(160, 0.08, 'sawtooth', 0.03);
        vibrate([18, 12, 28]);
      }
    }

    if (z.life <= 0) shadowZones.splice(i, 1);
  }

  // Zone'dan çıkınca zehir geri sayımı hızlıca azalır.
  if (!insideAnyZone && GAME.zonePoisonTimer > 0) {
    GAME.zonePoisonTimer = Math.max(0, GAME.zonePoisonTimer - 3.2);
  }

  if (GAME.zoneWarning > 0) GAME.zoneWarning -= 1;
}

function collectTarget() {
  GAME.score += 1;
  addHori(1);
  scoreEl.textContent = GAME.score;
  updateEvolutionUnlocks();
  createBurst(target.x, target.y, '#ffe15c', 24);
  GAME.shake = Math.min(GAME.shake + 2, 8);
  beep(640 + Math.min(GAME.score, 20) * 10, 0.05, 'triangle', 0.03);
  vibrate(12);

  if (shadowHas('trap') && GAME.score > 0 && GAME.score % TRAP_EVERY_LIGHTS === 0) {
    dropShadowTrap();
  }



  if (shadowHas('hunter')) {
    GAME.hunterBanner = 0;
    notify('AVCI', 'Avcı Gölge Hori yolunu kesiyor', '#ff2d55', 68, 3);
    GAME.hunterFocus = Math.max(GAME.hunterFocus, 0.65);
    createBurst(target.x, target.y, '#b74cff', 14);
  }

  if (shadowHas('zone')) {
    GAME.zoneBanner = 0;
    notify('ZEHİRLİ İZ', 'Zehirli iz yerde kalır', '#b74cff', 68, 3);
    createBurst(target.x, target.y, '#8b1cff', 12);
  }

  applyShadowDifficulty();
  if (currentMode.polish) {
    GAME.flash = Math.max(GAME.flash, 0.12);
  }
  spawnTarget(false);
}

function updateJoystickCenter() {
  if (!joystickEl) return;
  const rect = joystickEl.getBoundingClientRect();
  input.baseX = rect.left + rect.width / 2;
  input.baseY = rect.top + rect.height / 2;
  input.radius = rect.width * 0.38;
}

function joystickAllowedAt(clientX, clientY) {
  if (GAME.state !== 'playing') return false;

  const targetEl = document.elementFromPoint(clientX, clientY);
  if (targetEl && (targetEl.closest('#pauseBtn') || targetEl.closest('#dashBtn') || targetEl.closest('.screen'))) {
    return false;
  }

  if (currentMode.orientation === 'landscape') {
    // Hori: sol taraf joystick alanı, sağ taraf dash/oyun görüş alanı.
    return clientX <= width * 0.58;
  }

  // Vert: üst HUD/pause alanına basınca joystick oluşmasın.
  return clientY >= height * 0.22;
}

function placeFreeJoystick(clientX, clientY) {
  if (!joystickEl) return;
  const rect = joystickEl.getBoundingClientRect();
  const size = rect.width || joystickEl.offsetWidth || 118;
  const half = size / 2;

  const x = clamp(clientX, half + 8, width - half - 8);
  const y = clamp(clientY, half + 8, height - half - 8);

  // Move the actual joystick slot so the base appears exactly under the finger.
  joystickEl.style.left = `${x - half}px`;
  joystickEl.style.top = `${y - half}px`;
  joystickEl.style.right = 'auto';
  joystickEl.style.bottom = 'auto';
  joystickEl.style.transform = 'none';

  input.baseX = x;
  input.baseY = y;
  input.radius = size * 0.38;
}

function restoreFixedJoystickPosition() {
  if (!joystickEl || settings.joystickMode === 'free') return;
  joystickEl.style.left = '';
  joystickEl.style.top = '';
  joystickEl.style.right = '';
  joystickEl.style.bottom = '';
  joystickEl.style.transform = '';
  updateJoystickCenter();
}

function setJoystickKnob(dx, dy) {
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetInput() {
  input.x = 0;
  input.y = 0;
  input.active = false;
  input.pointerId = null;
  setJoystickKnob(0, 0);
  if (settings.joystickMode === 'free' && joystickEl) {
    joystickEl.classList.add('free-idle');
  }
}

function updateJoystick(clientX, clientY) {
  if (GAME.state !== 'playing') return;
  const dx = clientX - input.baseX;
  const dy = clientY - input.baseY;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, input.radius);
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;

  input.x = nx * (clamped / input.radius);
  input.y = ny * (clamped / input.radius);
  setJoystickKnob(nx * clamped, ny * clamped);
}

function doDash() {
  if (GAME.state !== 'playing' || !currentMode.dash || player.dashCooldown > 0 || GAME.dashLockTimer > 0) return;
  player.dashFrames = 10;
  player.dashCooldown = 92;
  player.shadowTrailLock = 16;
  player.shadowRejoin = true;
  player.invuln = 12;
  if (shadowHas('hunter')) {
    GAME.hunterConfused = 72;
    GAME.hunterBanner = 0;
    notify('GÖLGE ŞAŞIRDI', 'Dash gölgeyi kısa süre şaşırttı', '#2dd7ff', 54, 4);
  }
  createBurst(player.x, player.y, '#2dd7ff', 20);
  beep(920, 0.065, 'square', 0.025);
  vibrate(18);
}

function beginJoystickPointer(e, freeStart = false) {
  if (GAME.state !== 'playing') return false;
  if (input.active) return false;

  if (settings.joystickMode === 'free') {
    if (!joystickAllowedAt(e.clientX, e.clientY)) return false;
    placeFreeJoystick(e.clientX, e.clientY);
    joystickEl.classList.remove('free-idle');
  } else {
    updateJoystickCenter();
  }

  e.preventDefault();
  e.stopPropagation();
  input.active = true;
  input.pointerId = e.pointerId;
  try {
    if (e.currentTarget && e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    else if (joystickEl.setPointerCapture) joystickEl.setPointerCapture(e.pointerId);
  } catch (_) {}
  updateJoystick(e.clientX, e.clientY);
  return true;
}

joystickEl.addEventListener('pointerdown', (e) => {
  if (settings.joystickMode !== 'fixed') return;
  beginJoystickPointer(e, false);
});

canvas.addEventListener('pointerdown', (e) => {
  if (settings.joystickMode !== 'free') return;
  beginJoystickPointer(e, true);
}, { passive: false });

window.addEventListener('pointermove', (e) => {
  if (!input.active || e.pointerId !== input.pointerId) return;
  e.preventDefault();
  updateJoystick(e.clientX, e.clientY);
}, { passive: false });

function releaseJoystick(e) {
  if (e && input.pointerId !== e.pointerId) return;
  resetInput();
  if (settings.joystickMode === 'fixed') restoreFixedJoystickPosition();
}

window.addEventListener('pointerup', releaseJoystick);
window.addEventListener('pointercancel', releaseJoystick);
dashBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doDash(); });

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if ([' ', 'spacebar', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) || e.code === 'Space') {
    e.preventDefault();
  }

  input.keyboard.add(key);

  if (e.repeat && ['p', 'escape', 'r', 'm', 'f'].includes(key)) return;

  if (e.code === 'Space') {
    doDash();
    return;
  }

  if (key === 'p' || key === 'escape') {
    if (GAME.state === 'playing') pauseGame();
    else if (GAME.state === 'paused') resumeGame();
    return;
  }

  if (key === 'r') {
    if (GAME.state === 'playing' || GAME.state === 'paused' || GAME.state === 'over') {
      startCurrentMode();
    }
    return;
  }

  if (key === 'm') {
    if (GAME.state === 'playing' || GAME.state === 'paused' || GAME.state === 'over') {
      returnToMenu();
    }
    return;
  }

  if (key === 'f') {
    toggleFullscreenMode();
    return;
  }
});

window.addEventListener('keyup', (e) => input.keyboard.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => input.keyboard.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden) input.keyboard.clear(); });
window.addEventListener('resize', resize);

async function startCurrentMode() {
  setMode('hori_evolution');
  await activateFullscreenAndOrientation();
  setTimeout(resize, 250);
  resetGame();
}

function pauseGame() {
  if (GAME.state !== 'playing') return;
  GAME.state = 'paused';
  updatePauseShadowInfo();
  updateSettingsUI();
  joystickEl.classList.add('hidden');
  dashBtn.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  showScreen(pauseMenu);
  resetInput();
}

function resumeGame() {
  if (GAME.state !== 'paused') return;
  GAME.state = 'playing';
  joystickEl.classList.remove('hidden');
  joystickEl.classList.toggle('free-mode', settings.joystickMode === 'free');
  joystickEl.classList.toggle('free-idle', settings.joystickMode === 'free');
  dashBtn.classList.toggle('hidden', !currentMode.dash);
  pauseBtn.classList.remove('hidden');
  showScreen(null);
}





function startMockShadowTest() {
  setMode('hori_evolution');
  GAME.mockTest = true;
  GAME.lastRunWasMock = true;
  startCurrentMode();
  GAME.mockCountdown = 180; // 3 saniye
  GAME.state = 'countdown';
  resetInput();
}

function startFinalEvolution() {
  GAME.mockTest = false;
  GAME.lastRunWasMock = false;
  setMode('hori_evolution');
  startCurrentMode();
}


function retryLastRun() {
  if (GAME.lastRunWasMock) {
    startMockShadowTest();
  } else {
    startFinalEvolution();
  }
}

if (retryBtn) retryBtn.addEventListener('click', retryLastRun);
if (menuBtn) menuBtn.addEventListener('click', returnToMenu);
if (pauseBtn) pauseBtn.addEventListener('click', pauseGame);
if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
if (quitBtn) quitBtn.addEventListener('click', returnToMenu);
if (marketMenuBtn) marketMenuBtn.addEventListener('click', () => {
  updateEconomyUI();
  showScreen(marketMenu);
});
if (backFromSettings) backFromSettings.addEventListener('click', () => showScreen(mainMenu));
if (backFromMarket) backFromMarket.addEventListener('click', () => showScreen(mainMenu));


soundToggle.addEventListener('click', () => {
  settings.sound = !settings.sound;
  localStorage.setItem('ets_sound', settings.sound ? 'on' : 'off');
  updateSettingsUI();
  beep(520, 0.05);
});

vibrationToggle.addEventListener('click', () => {
  settings.vibration = !settings.vibration;
  localStorage.setItem('ets_vibration', settings.vibration ? 'on' : 'off');
  updateSettingsUI();
  vibrate(20);
});

function setJoystickMode(mode) {
  settings.joystickMode = mode === 'free' ? 'free' : 'fixed';
  localStorage.setItem('ets_joystick_mode', settings.joystickMode);
  resetInput();
  joystickEl.classList.toggle('free-mode', settings.joystickMode === 'free');
  joystickEl.classList.toggle('free-idle', settings.joystickMode === 'free');
  if (settings.joystickMode === 'fixed') restoreFixedJoystickPosition();
  updateSettingsUI();
  beep(settings.joystickMode === 'free' ? 620 : 480, 0.045, 'triangle', 0.02);
}

if (joystickFixedBtn) joystickFixedBtn.addEventListener('click', () => setJoystickMode('fixed'));
if (joystickFreeBtn) joystickFreeBtn.addEventListener('click', () => setJoystickMode('free'));
if (pauseJoystickFixedBtn) pauseJoystickFixedBtn.addEventListener('click', () => setJoystickMode('fixed'));
if (pauseJoystickFreeBtn) pauseJoystickFreeBtn.addEventListener('click', () => setJoystickMode('free'));


if (pauseSoundToggle) {
  pauseSoundToggle.addEventListener('click', () => {
    settings.sound = !settings.sound;
    localStorage.setItem('ets_sound', settings.sound ? 'on' : 'off');
    updateSettingsUI();
    beep(520, 0.05);
  });
}

if (pauseVibrationToggle) {
  pauseVibrationToggle.addEventListener('click', () => {
    settings.vibration = !settings.vibration;
    localStorage.setItem('ets_vibration', settings.vibration ? 'on' : 'off');
    updateSettingsUI();
    vibrate(20);
  });
}


function update() {
  if (GAME.state === 'countdown') {
    GAME.time += 1;
    GAME.mockCountdown -= 1;
    if (GAME.mockCountdown <= 0) {
      GAME.mockCountdown = 0;
      GAME.state = 'playing';
    }
    return;
  }
  GAME.time += 1;
  if (GAME.tutorialTimer > 0 && GAME.state === 'playing') GAME.tutorialTimer -= 1;
  if (GAME.rageBanner > 0 && GAME.state === 'playing') GAME.rageBanner -= 1;
  if (GAME.lungeBanner > 0 && GAME.state === 'playing') GAME.lungeBanner -= 1;
  if (GAME.hunterBanner > 0 && GAME.state === 'playing') GAME.hunterBanner -= 1;
  if (GAME.zoneBanner > 0 && GAME.state === 'playing') GAME.zoneBanner -= 1;
  if (GAME.zonePoisonFlash > 0 && GAME.state === 'playing') GAME.zonePoisonFlash -= 1;
  if (GAME.mirrorBanner > 0 && GAME.state === 'playing') GAME.mirrorBanner -= 1;
  if (GAME.mirrorTimer > 0 && GAME.state === 'playing') GAME.mirrorTimer -= 1;
  if (GAME.trapBanner > 0 && GAME.state === 'playing') GAME.trapBanner -= 1;
  if (GAME.dashLockTimer > 0 && GAME.state === 'playing') GAME.dashLockTimer -= 1;
  if (GAME.state === 'playing' && GAME.trapSlowStacks && GAME.trapSlowStacks.length) {
    GAME.trapSlowStacks = GAME.trapSlowStacks.map(v => v - 1).filter(v => v > 0);
  }
  if (GAME.evolutionBanner > 0 && GAME.state === 'playing') GAME.evolutionBanner -= 1;
  if (NOTIFY.timer > 0 && GAME.state === 'playing') {
    NOTIFY.timer -= 1;
    if (NOTIFY.timer <= 0) clearNotify();
  }

  if (GAME.state === 'playing') {
    let moveX = input.x;
    let moveY = input.y;

    const left = input.keyboard.has('arrowleft') || input.keyboard.has('a');
    const right = input.keyboard.has('arrowright') || input.keyboard.has('d');
    const up = input.keyboard.has('arrowup') || input.keyboard.has('w');
    const down = input.keyboard.has('arrowdown') || input.keyboard.has('s');
    if (left || right || up || down) {
      moveX = (right ? 1 : 0) - (left ? 1 : 0);
      moveY = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(moveX, moveY) || 1;
      moveX /= len;
      moveY /= len;
    }

    if (GAME.mirrorTimer > 0 && player.dashFrames <= 0) {
      moveX *= -1;
      moveY *= -1;
    }

    const mag = Math.hypot(moveX, moveY);
    if (mag > 0.08) {
      player.lastMoveX = moveX / mag;
      player.lastMoveY = moveY / mag;
    }

    let speed = player.maxSpeed * trapSlowMultiplier();
    if (player.dashFrames > 0) {
      speed = player.dashSpeed;
      moveX = player.lastMoveX;
      moveY = player.lastMoveY;
      player.dashFrames -= 1;
      GAME.shake = Math.max(GAME.shake, 4);
      createBurst(player.x, player.y, '#2dd7ff', 2);
    }

    player.x += moveX * speed;
    player.y += moveY * speed;
    player.x = clamp(player.x, player.r, world.width - player.r);
    player.y = clamp(player.y, player.r, world.height - player.r);
    updateCamera();
    ensureTargetVisible();

    if (player.dashCooldown > 0) player.dashCooldown -= 1;
    if (player.shadowTrailLock > 0) player.shadowTrailLock -= 1;
    if (player.invuln > 0) player.invuln -= 1;
    if (currentMode.dash) {
      const cooldownRatio = Math.max(0, player.dashCooldown / 92);
      const lockRatio = Math.max(0, GAME.dashLockTimer / TRAP_DASH_LOCK_FRAMES);
      const ratio = Math.max(cooldownRatio, lockRatio);
      dashCooldownEl.style.height = `${ratio * 100}%`;
      dashBtn.classList.toggle('cooldown', player.dashCooldown > 0 || GAME.dashLockTimer > 0);
      dashBtn.classList.toggle('locked', GAME.dashLockTimer > 0);
      const label = dashBtn.querySelector('span');
      if (label) label.textContent = GAME.dashLockTimer > 0 ? `${Math.ceil(GAME.dashLockTimer / 60)}s` : 'ATIL';
    }

    // Dash is a player escape move. The shadow must NOT copy the instant dash.
    // Important: after dash, do not add one far-away point into the trail.
    // That creates a long gap and makes the shadow look like it teleports later.
    // Instead, rejoin the trail slowly with capped-distance points.
    const lastTrail = shadow.points[shadow.points.length - 1];
    const dxTrail = player.x - lastTrail.x;
    const dyTrail = player.y - lastTrail.y;
    const distTrail = Math.hypot(dxTrail, dyTrail);
    const maxTrailStep = player.maxSpeed * 0.95;

    if (player.shadowTrailLock <= 0) {
      if (distTrail > maxTrailStep) {
        shadow.points.push({
          x: lastTrail.x + (dxTrail / distTrail) * maxTrailStep,
          y: lastTrail.y + (dyTrail / distTrail) * maxTrailStep,
        });
      } else {
        shadow.points.push({ x: player.x, y: player.y });
        player.shadowRejoin = false;
      }
    } else if (player.shadowRejoin && distTrail > maxTrailStep) {
      // During the dash lock, the trail keeps extending slowly from the old route.
      // This makes the shadow chase normally instead of freezing then teleporting.
      shadow.points.push({
        x: lastTrail.x + (dxTrail / distTrail) * maxTrailStep,
        y: lastTrail.y + (dyTrail / distTrail) * maxTrailStep,
      });
    }
    const maxTrail = shadow.delay + 84;
    while (shadow.points.length > maxTrail) shadow.points.shift();
    const shadowIndex = Math.max(0, shadow.points.length - shadow.delay);
    const baseShadowHead = shadow.points[shadowIndex];
    let shadowHead = updateShadowLunge(baseShadowHead);
    shadowHead = er(shadowHead);
    addShadowZone(shadowHead.x, shadowHead.y, 1);
    updateShadowZones();

    const collectDist = Math.hypot(player.x - target.x, player.y - target.y);
    if (collectDist < player.r + target.r + 3) collectTarget();

    if (shadowHas('trap') && player.invuln <= 0) {
      for (let i = shadowTraps.length - 1; i >= 0; i--) {
        const trap = shadowTraps[i];
        const trapDist = Math.hypot(player.x - trap.x, player.y - trap.y);
        if (trapDist < player.r + trap.r) {
          triggerShadowTrap(i);
          break;
        }
      }
    }

    let dangerDist = Math.hypot(player.x - shadowHead.x, player.y - shadowHead.y);
    if (shadowHas('lunge') && shadowHas('hunter') && shadow.lungeAttack > 0) {
      const strikeDist = Math.hypot(player.x - shadow.lungeStrikeX, player.y - shadow.lungeStrikeY);
      dangerDist = Math.min(dangerDist, strikeDist);
    }
    const dangerLimit = shadow.dangerDistance + shadow.r * 0.2;
    if (currentMode.polish && GAME.score > 0) {
      const warningRange = 78;
      GAME.nearDanger = Math.max(0, Math.min(1, 1 - ((dangerDist - dangerLimit) / warningRange)));
      if (shadowHas('zone')) GAME.nearDanger = Math.max(GAME.nearDanger, GAME.zoneDanger || 0);
      if (GAME.nearDanger > 0.72) {
        GAME.warningTick += 1;
        GAME.shake = Math.max(GAME.shake, 2.2 + GAME.nearDanger * 3);
        if (GAME.warningTick % 18 === 0) beep(210, 0.035, 'sawtooth', 0.018);
      } else {
        GAME.warningTick = 0;
      }
    } else {
      GAME.nearDanger *= 0.9;
    }
    if (GAME.score > 0 && player.invuln <= 0 && dangerDist < dangerLimit) {
      const reason = shadowHas('lunge')
        ? 'Gölge Sıçraması’na yakalandın. Kırmızı saldırı çizgisini görünce atıl veya yön değiştir.'
        : shadowHas('hunter')
          ? 'Avcı Gölge yolunu kesti. Hori’ye düz gitme; atılma ile gölgeyi şaşırtıp rota değiştir.'
              : shadowHas('zone')
                ? 'Zehirli İz önce 1 saniyelik sayaç doldurur; dolarsa kontroller ters döner.'
                : isEvolutionMode()
                  ? 'Sonsuz Evrim modunda gölge güçleri birleşir. Aktif güçlere göre rotanı sürekli değiştir.'
                  : currentMode.polish
              ? 'Mor gölgenin kırmızı ölüm halkasına girdin. Gölge senin eski rotanı takip eder.'
              : 'Mor gölge sana temas etti. Kendi eski rotana çok yaklaştın.';
      gameOver(reason);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= 1;
    if (p.life <= 0) particles.splice(i, 1);
  }

  GAME.shake *= 0.88;
  GAME.flash *= 0.88;
  target.pulse += 0.08;
}

function drawGlowCircle(x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = r * 2.45;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawCenteredLabel(text, x, y, alpha = 1, size = 15) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.fillStyle = '#ffffff';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}


function getCurrentShadowMiniPoint() {
  if (shadow.points.length <= 2) return { x: player.x, y: player.y };
  const shadowIndex = Math.max(0, shadow.points.length - shadow.delay);
  const base = shadow.points[shadowIndex] || shadow.points[0];
  return getShadowDrawPoint(base);
}

function drawMiniMap() {
  // Minimal polish: calmer minimap
  const oldMiniAlpha = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.78);
  if (GAME.state !== 'playing' && GAME.state !== 'paused') return;
  if (!world.width || !world.height) return;

  // Same clean look in every mode.
  const maxW = 132;
  const maxH = 78;
  const ratio = world.height / world.width;
  let mw = maxW;
  let mh = mw * ratio;
  if (mh > maxH) {
    mh = maxH;
    mw = mh / ratio;
  }

  const x = Math.max(12, (window.visualViewport?.offsetLeft || 0) + 12);
  const y = Math.max(72, (window.visualViewport?.offsetTop || 0) + 72);
  const scaleX = mw / world.width;
  const scaleY = mh / world.height;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(9, 14, 34, 0.78)';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, mw, mh, 10);
  ctx.fill();
  ctx.stroke();
  ctx.clip();

  const drawDot = (wx, wy, r, color, glow = color) => {
    const dx = x + wx * scaleX;
    const dy = y + wy * scaleY;
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const sh = getCurrentShadowMiniPoint();
  drawDot(sh.x, sh.y, 3.2, '#8b1cff', '#8b1cff');
  for (const trap of shadowTraps) {
    drawDot(trap.x, trap.y, 3.6, '#ffe15c', '#ffe15c');
  }
  drawDot(target.x, target.y, 3.6, '#ffe15c', '#ffe15c');
  drawDot(player.x, player.y, 3.8, '#ffffff', '#ffe15c');

  ctx.restore();
  ctx.globalAlpha = oldMiniAlpha;
}

function drawUnifiedNotification(sx, sy) {
  if (GAME.state !== 'playing' || NOTIFY.timer <= 0) return;

  const progress = NOTIFY.timer / Math.max(1, NOTIFY.duration);
  const fadeIn = Math.min(1, (NOTIFY.duration - NOTIFY.timer) / 10);
  const fadeOut = Math.min(1, NOTIFY.timer / 18);
  const a = Math.max(0, Math.min(fadeIn, fadeOut));
  if (a <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = a;
  const boxW = Math.min(width - 46, 430);
  const boxH = 66;
  const x = width / 2 - boxW / 2;
  const y = Math.max(74, height * 0.115);
  const pulse = 1 + Math.sin(GAME.time * 0.18) * 0.015;

  ctx.translate(width / 2, y + boxH / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-width / 2, -(y + boxH / 2));

  ctx.fillStyle = 'rgba(6, 8, 18, 0.72)';
  ctx.strokeStyle = NOTIFY.color;
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 24;
  ctx.shadowColor = NOTIFY.color;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = NOTIFY.color;
  ctx.font = '900 20px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(NOTIFY.title, width / 2, y + 28);

  if (NOTIFY.subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '800 12px Inter, Arial, sans-serif';
    ctx.fillText(NOTIFY.subtitle, width / 2, y + 48);
  }

  ctx.globalAlpha = a * 0.75;
  ctx.fillStyle = NOTIFY.color;
  ctx.beginPath();
  ctx.roundRect(x + 14, y + boxH - 8, (boxW - 28) * progress, 3, 2);
  ctx.fill();
  ctx.restore();
}


function drawTrapSlowHud() {
  const stacks = activeTrapSlowStacks();
  if (GAME.state !== 'playing' || stacks <= 0) return;

  const timerFrames = maxTrapSlowTime();
  const slowPct = trapSlowPercent();
  const progress = Math.max(0, Math.min(1, timerFrames / TRAP_SLOW_FRAMES));

  ctx.save();
  const safeX = (window.visualViewport && window.visualViewport.offsetLeft) ? window.visualViewport.offsetLeft : 0;
  const safeY = (window.visualViewport && window.visualViewport.offsetTop) ? window.visualViewport.offsetTop : 0;
  const bw = 150;
  const bh = 50;
  const bx = Math.max(12, width - bw - 12 - safeX);
  const by = Math.max(76, safeY + 76);

  ctx.globalAlpha = 0.94;
  ctx.fillStyle = 'rgba(9, 10, 24, 0.82)';
  ctx.strokeStyle = 'rgba(183, 76, 255, 0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#d7a3ff';
  ctx.font = '900 10px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`YAVAŞLAMA x${stacks}`, bx + 10, by + 15);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 13px Inter, Arial, sans-serif';
  ctx.fillText(`-%${slowPct} HIZ`, bx + 10, by + 32);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe15c';
  ctx.font = '900 12px Inter, Arial, sans-serif';
  ctx.fillText(formatFramesMMSS(timerFrames), bx + bw - 10, by + 20);

  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.roundRect(bx + 10, by + bh - 9, bw - 20, 4, 2);
  ctx.fill();

  ctx.fillStyle = '#b74cff';
  ctx.beginPath();
  ctx.roundRect(bx + 10, by + bh - 9, (bw - 20) * progress, 4, 2);
  ctx.fill();

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, width, height);
  const sx = (Math.random() - 0.5) * GAME.shake;
  const sy = (Math.random() - 0.5) * GAME.shake;
  ctx.save();
  ctx.translate(sx, sy);

  const bg = ctx.createRadialGradient(width * 0.5, height * 0.42, 20, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
  bg.addColorStop(0, '#12172e');
  bg.addColorStop(0.54, '#050713');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(-sx, -sy, width, height);

  for (const s of stars) {
    ctx.globalAlpha = s.a + Math.sin(GAME.time * 0.02 + s.x) * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // World-space rendering starts here. Objects are drawn in the larger map,
  // while the camera follows the player.
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = currentMode.orientation === 'landscape' ? '#2dd7ff' : '#7afcff';
  ctx.lineWidth = 1;
  const step = currentMode.orientation === 'landscape' ? 46 : 52;
  for (let y = 0; y < world.height; y += step) {
    ctx.beginPath();
    for (let x = 0; x <= world.width; x += 18) {
      const yy = y + Math.sin((x + GAME.time * 2) * 0.012) * 5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Visible arena border so the player understands this is a larger map.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, world.width - 24, world.height - 24);
  ctx.restore();

  if (shadowZones.length > 0) {
    for (const z of shadowZones) {
      const age = Math.max(0, z.life / z.maxLife);
      const alive = Math.sin(GAME.time * 0.16 + z.x * 0.01) * 0.08 + 0.92;
      const rr = z.r * (0.72 + 0.28 * z.danger) * alive;
      ctx.save();
      ctx.globalAlpha = Math.min(0.34, age * (0.15 + z.danger * 0.22));
      ctx.fillStyle = 'rgba(88,0,150,0.62)';
      ctx.beginPath();
      ctx.arc(z.x, z.y, rr, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = Math.min(0.52, age * (0.25 + z.danger * 0.28));
      ctx.strokeStyle = GAME.zoneDanger > 0.3 ? '#ff2d55' : '#8b1cff';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(z.x, z.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  if (shadow.points.length > 2) {
    for (let i = 0; i < shadow.points.length; i++) {
      const p = shadow.points[i];
      const t = i / shadow.points.length;
      const ageAlpha = Math.pow(t, 2.8);
      const radius = 3.6 + shadow.r * ageAlpha;
      drawGlowCircle(p.x, p.y, radius, '#2a0048', 0.078 * ageAlpha);
    }
    const shadowIndex = Math.max(0, shadow.points.length - shadow.delay);
    const baseH = shadow.points[shadowIndex];
    const h = getShadowDrawPoint(baseH);
    if (currentMode.polish && GAME.score > 0) {
      const dangerLimit = shadow.dangerDistance + shadow.r * 0.2;
      ctx.save();
      ctx.globalAlpha = 0.24 + GAME.nearDanger * 0.42;
      ctx.strokeStyle = GAME.nearDanger > 0.55 ? '#ff2d55' : '#b74cff';
      ctx.lineWidth = 1.5 + GAME.nearDanger * 1.5;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(h.x, h.y, dangerLimit, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (GAME.nearDanger > 0.32) {
        ctx.save();
        ctx.globalAlpha = 0.25 + GAME.nearDanger * 0.3;
        ctx.strokeStyle = '#ff2d55';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(h.x, h.y);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (shadowHas('lunge') && GAME.score > 1 && (shadow.lungeCharge > 0 || (shadowHas('hunter') && shadow.lungeAttack > 0))) {
      const chargeAlpha = 0.35 + Math.sin(GAME.time * 0.55) * 0.22;
      const startX = shadowHas('hunter') ? h.x : baseH.x;
      const startY = shadowHas('hunter') ? h.y : baseH.y;
      const endX = shadowHas('hunter') ? shadow.lungeStrikeX : baseH.x + shadow.lungeDirX * shadow.lungePower;
      const endY = shadowHas('hunter') ? shadow.lungeStrikeY : baseH.y + shadow.lungeDirY * shadow.lungePower;
      ctx.save();
      ctx.globalAlpha = shadow.lungeAttack > 0 ? 0.72 : Math.max(0.2, chargeAlpha);
      ctx.strokeStyle = shadow.lungeAttack > 0 ? '#ff003c' : '#ff2d55';
      ctx.lineWidth = shadow.lungeAttack > 0 ? 7 : 5;
      ctx.setLineDash(shadow.lungeAttack > 0 ? [] : [14, 9]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = shadow.lungeAttack > 0 ? 'rgba(255,0,60,0.22)' : 'rgba(255,45,85,0.14)';
      ctx.beginPath();
      ctx.arc(endX, endY, shadow.r + (shadow.lungeAttack > 0 ? 18 : 13), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawCenteredLabel(shadow.lungeAttack > 0 ? 'SALDIRI' : 'SIÇRAMA', startX, startY - shadow.r - 22, 0.85, 12);
    }

    const rage = shadow.rageLevel || 0;
    const lungeActive = shadowHas('lunge') && (shadow.lungeCharge > 0 || shadow.lungeAttack > 0);
    const hunterActive = shadowHas('hunter');
    const hunterConfused = hunterActive && GAME.hunterConfused > 0;
    const shadowOuter = shadowHas('rage') && rage > 0 ? '#ff2d55' : lungeActive ? '#ff2d55' : hunterConfused ? '#2dd7ff' : hunterActive ? '#ff2d55' : '#8b1cff';
    const shadowInner = shadowHas('rage') && rage > 0 ? '#160006' : lungeActive || hunterActive ? '#1b0008' : '#050008';
    drawGlowCircle(h.x, h.y, shadow.r + Math.sin(GAME.time * 0.18) * (2 + rage * 0.25 + (hunterActive ? GAME.hunterFocus * 3 : 0)), shadowOuter, 0.82);
    drawGlowCircle(h.x, h.y, shadow.r * 0.45, shadowInner, 1);
    if (shadowHas('hunter')) {
      ctx.save();
      const eyeX = h.x + shadow.hunterEyeX * shadow.r * 0.28;
      const eyeY = h.y + shadow.hunterEyeY * shadow.r * 0.28;
      ctx.shadowBlur = 12;
      ctx.shadowColor = GAME.hunterConfused > 0 ? '#2dd7ff' : '#ff2d55';
      ctx.fillStyle = GAME.hunterConfused > 0 ? '#bff8ff' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, shadow.r * 0.34, shadow.r * 0.22, Math.atan2(shadow.hunterEyeY, shadow.hunterEyeX), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GAME.hunterConfused > 0 ? '#0052ff' : '#ff003c';
      ctx.beginPath();
      ctx.arc(eyeX + shadow.hunterEyeX * 2.5, eyeY + shadow.hunterEyeY * 2.5, Math.max(2.2, shadow.r * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (currentMode.polish && GAME.nearDanger > 0.55) {
      drawCenteredLabel('TEHLİKE', h.x, h.y - shadow.r - 19, GAME.nearDanger, 12);
    }
    // Öfke seviyesi artık gölgenin altında değil, alt durum barında gösteriliyor.
    if (shadowHas('lunge') && shadow.lungeAttack > 0) {
      drawCenteredLabel(shadowHas('hunter') ? 'SALDIRI' : 'SALDIRI', h.x, h.y + shadow.r + 19, 0.8, 11);
    }
    // Avcı etiketi artık gölgenin altında değil, alt durum barında gösteriliyor.
  }

    // Avcı hedef çizgisi kaldırıldı: Sahte Hori gerçek hedefi ele vermesin.

  if (shadowTraps.length > 0) {
    for (const trap of shadowTraps) {
      trap.pulse += 0.08;
      const trp = TARGET_RADIUS + Math.sin(trap.pulse) * 2.2;

      // Trap looks like a normal target almost all the time.
      // Every 3 seconds it gives a very brief purple blink in the world only.
      const blink = (Math.floor(GAME.time + trap.blinkSeed) % 180) < 12;
      const outerColor = blink ? '#b74cff' : '#ffe15c';
      const innerColor = blink ? '#d7a3ff' : '#fff7bd';

      drawGlowCircle(trap.x, trap.y, trp * 2.4, outerColor, blink ? 0.18 : 0.12);
      drawGlowCircle(trap.x, trap.y, trp, '#ffe15c', 1);
      drawGlowCircle(trap.x, trap.y, trp * 0.42, innerColor, 1);
    }
  }

  if (GAME.state !== 'over') {
    const tr = target.r + Math.sin(target.pulse) * 2.2;
    const trapPulse = target.isTrap ? (0.35 + Math.sin(GAME.time * 0.42) * 0.25) : 0;
    drawGlowCircle(target.x, target.y, tr * 2.4, target.isTrap ? '#b74cff' : '#ffe15c', target.isTrap ? 0.18 : 0.12);
    drawGlowCircle(target.x, target.y, tr, '#ffe15c', 1);
    drawGlowCircle(target.x, target.y, tr * 0.42, target.isTrap ? '#d7a3ff' : '#fff7bd', 1);
    if (target.isTrap) {
      ctx.save();
      ctx.globalAlpha = 0.55 + trapPulse;
      ctx.strokeStyle = '#b74cff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(target.x, target.y, tr + 8 + Math.sin(GAME.time * 0.25) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (Math.sin(GAME.time * 0.28) > 0.35) {
        drawCenteredLabel('SAHTE?', target.x, target.y - 25, 0.75, 10);
      }
    }
    if (currentMode.polish && GAME.tutorialTimer > 0) {
      drawCenteredLabel(target.isTrap ? 'DİKKAT' : 'TOPLA', target.x, target.y - 25, Math.min(1, GAME.tutorialTimer / 40), 11);
    }
  }

  drawCanvasHoriPlayer();

  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    drawGlowCircle(p.x, p.y, p.r, p.color, a);
  }

  ctx.restore(); // end world-space camera transform

  if (currentMode.polish && GAME.state === 'playing' && GAME.nearDanger > 0.02) {
    ctx.globalAlpha = Math.min(0.34, GAME.nearDanger * 0.28);
    const px = screenX(player.x);
    const py = screenY(player.y);
    const dangerBg = ctx.createRadialGradient(px, py, 10, px, py, Math.max(width, height) * 0.62);
    dangerBg.addColorStop(0, 'rgba(255,45,85,0)');
    dangerBg.addColorStop(0.68, 'rgba(255,45,85,0.04)');
    dangerBg.addColorStop(1, 'rgba(255,45,85,0.55)');
    ctx.fillStyle = dangerBg;
    ctx.fillRect(-sx, -sy, width, height);
    ctx.globalAlpha = 1;
  }

  if (GAME.zonePoisonTimer > 0 && GAME.mirrorTimer <= 0 && GAME.state === 'playing') {
    ctx.save();
    const progress = Math.max(0, Math.min(1, GAME.zonePoisonTimer / ZONE_POISON_FRAMES));
    const boxW = Math.min(220, width - 34);
    const boxH = 50;
    const boxX = width / 2 - boxW / 2;
    const boxY = Math.max(72, height * 0.145);

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = GAME.zonePoisonFlash > 0 ? 'rgba(42, 6, 68, 0.82)' : 'rgba(10, 6, 22, 0.72)';
    ctx.strokeStyle = 'rgba(215,163,255,0.68)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 17);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d7a3ff';
    ctx.font = '900 14px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZEHİRLİ İZ', width / 2, boxY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px Inter, Arial, sans-serif';
    ctx.fillText('ÇIK YOKSA MIRROR', width / 2, boxY + 36);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(boxX + 14, boxY + boxH - 7, boxW - 28, 4, 2);
    ctx.fill();

    ctx.fillStyle = '#b74cff';
    ctx.beginPath();
    ctx.roundRect(boxX + 14, boxY + boxH - 7, (boxW - 28) * progress, 4, 2);
    ctx.fill();
    ctx.restore();
  }

  if (GAME.mirrorTimer > 0 && GAME.state === 'playing') {
    ctx.save();
    const progress = Math.max(0, Math.min(1, GAME.mirrorTimer / MIRROR_DURATION_FRAMES));
    const secondsLeft = Math.ceil(GAME.mirrorTimer / 60);
    const a = Math.min(0.30, 0.10 + progress * 0.14);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(139,28,255,0.24)';
    ctx.fillRect(-sx, -sy, width, height);

    const boxW = Math.min(250, width - 34);
    const boxH = 58;
    const boxX = width / 2 - boxW / 2;
    const boxY = Math.max(72, height * 0.145);

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(10, 6, 22, 0.74)';
    ctx.strokeStyle = 'rgba(215,163,255,0.72)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d7a3ff';
    ctx.font = '900 15px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MIRROR CONTROLS', width / 2, boxY + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px Inter, Arial, sans-serif';
    ctx.fillText(`${secondsLeft}s`, width / 2, boxY + 43);

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(boxX + 16, boxY + boxH - 8, boxW - 32, 4, 2);
    ctx.fill();

    ctx.fillStyle = '#d7a3ff';
    ctx.beginPath();
    ctx.roundRect(boxX + 16, boxY + boxH - 8, (boxW - 32) * progress, 4, 2);
    ctx.fill();

    if (GAME.mirrorBanner > 0) {
      ctx.globalAlpha = Math.min(1, GAME.mirrorBanner / 18) * 0.85;
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.font = '800 11px Inter, Arial, sans-serif';
      ctx.fillText('Joystick yönleri ters', width / 2, boxY + boxH + 16);
    }

    ctx.restore();
  }

  if (currentMode.polish && GAME.tutorialTimer > 0 && GAME.state === 'playing') {
    const a = Math.min(1, GAME.tutorialTimer / 55);
    const lines = currentModeIntroLines();
    ctx.save();
    ctx.globalAlpha = a;
    const boxW = Math.min(width - 34, 440);
    const boxH = 88;
    const x = width / 2 - boxW / 2;
    const y = Math.max(78, height * 0.105);
    ctx.fillStyle = 'rgba(6,8,18,0.76)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe15c';
    ctx.font = '900 15px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lines.title, width / 2, y + 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = '850 13px Inter, Arial, sans-serif';
    ctx.fillText(lines.body, width / 2, y + 54);

    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.font = '800 11px Inter, Arial, sans-serif';
    const maxTextWidth = boxW - 34;
    const hint = lines.hint || '';
    if (ctx.measureText(hint).width > maxTextWidth && hint.includes(' · ')) {
      const parts = hint.split(' · ');
      ctx.fillText(parts[0], width / 2, y + 76);
      ctx.fillText(parts.slice(1).join(' · '), width / 2, y + 92);
    } else {
      ctx.fillText(hint, width / 2, y + (74));
    }
    ctx.restore();
  }


  drawMiniMap();

  if (GAME.dashLockTimer > 0 && GAME.state === 'playing') {
    ctx.save();
    const secondsLeft = Math.ceil(GAME.dashLockTimer / 60);
    const progress = GAME.dashLockTimer / TRAP_DASH_LOCK_FRAMES;
    const boxW = Math.min(230, width - 34);
    const boxH = 44;
    const boxX = width / 2 - boxW / 2;
    const boxY = Math.max(132, height * 0.245);

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(18, 4, 32, 0.74)';
    ctx.strokeStyle = 'rgba(183,76,255,0.72)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d7a3ff';
    ctx.font = '900 12px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ATILMA KİLİTLİ · ${secondsLeft}s`, width / 2, boxY + 19);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(boxX + 14, boxY + 30, boxW - 28, 4, 2);
    ctx.fill();

    ctx.fillStyle = '#b74cff';
    ctx.beginPath();
    ctx.roundRect(boxX + 14, boxY + 30, (boxW - 28) * progress, 4, 2);
    ctx.fill();
    ctx.restore();
  }

  if (isEvolutionMode() && GAME.state === 'playing') {
    const powers = [];
    if (GAME.mockTest) powers.push('MOCK TEST');
    if (shadowHas('rage')) powers.push(`ÖFKE ${shadow.rageLevel || 1}`);
    if (shadowHas('zone')) powers.push('ZEHİRLİ İZ');
    if (shadowHas('lunge')) powers.push('SIÇRAMA');
    if (shadowHas('hunter')) powers.push(GAME.hunterConfused > 0 ? 'AVCI ŞAŞKIN' : 'AVCI GÖLGE');
    if (shadowHas('trap')) powers.push('SAHTE HORİ');
    if (powers.length) {
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = 'rgba(6,8,18,0.56)';
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      const txt = powers.join(' + ');
      ctx.font = '900 11px Inter, Arial, sans-serif';
      const tw = ctx.measureText(txt).width + 22;
      const bx = width / 2 - tw / 2;
      const by = height - 34;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, 22, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe15c';
      ctx.textAlign = 'center';
      ctx.fillText(txt, width / 2, by + 15);
      ctx.restore();
    }
  }

  if (GAME.flash > 0.02) {
    ctx.globalAlpha = GAME.flash * 0.34;
    ctx.fillStyle = '#ff2d55';
    ctx.fillRect(-sx, -sy, width, height);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  drawMockCountdownOverlay();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

setMode('hori_evolution');
updateSettingsUI();
updateEconomyUI();
resize();
showScreen(mainMenu);
loop();


try { bindFinalCleanMenuButtons(); } catch (e) {}
try { document.addEventListener('DOMContentLoaded', bindFinalCleanMenuButtons); } catch (e) {}
try { window.addEventListener('load', bindFinalCleanMenuButtons); } catch (e) {}




function bindFinalMenuButtons() {
  if (quickPlayBtn) quickPlayBtn.onclick = startFinalEvolution;
  if (marketMenuBtn) marketMenuBtn.onclick = () => {
    updateEconomyUI();
    renderMarket();
    showScreen(marketMenu);
  };
  if (settingsMenuBtn) settingsMenuBtn.onclick = () => {
    updateSettingsUI();
    showScreen(settingsMenu);
  };
  if (mockTestBtn) mockTestBtn.onclick = startMockShadowTest;
}


try { bindFinalMenuButtons(); } catch (e) { console.error('menu bind failed', e); }
try { document.addEventListener('DOMContentLoaded', bindFinalMenuButtons); } catch (e) {}
try { window.addEventListener('load', bindFinalMenuButtons); } catch (e) {}
