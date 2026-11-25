// Boot and the one loop: input is read every frame, the kitchen advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between four screens: title, play, paused and over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BURNT, EVENT_CHOP, EVENT_COOKED, EVENT_DENIED, EVENT_MISSED,
  EVENT_OVER, EVENT_PICKUP, EVENT_PLACE, EVENT_SERVED,
} from './world.js';
import { ACTION_MUTE, ACTION_PAUSE, ACTION_USE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

// Exposed for play-testing from the console and the screenshot script; not part of play.
window.__world = world;

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playSound(events) {
  if (events & EVENT_SERVED) audio.served();
  else if (events & EVENT_MISSED) audio.missed();
  else if (events & EVENT_OVER) audio.over(world.state.won);
  else if (events & EVENT_BURNT) audio.burnt();
  else if (events & EVENT_COOKED) audio.cooked();
  else if (events & EVENT_CHOP) audio.chop();
  else if (events & EVENT_PICKUP) audio.pickup();
  else if (events & EVENT_PLACE) audio.place();
  else if (events & EVENT_DENIED) audio.denied();
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Memasak! Ambil bahan, iris, panggang, rakit, sajikan.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift selesai. Skor ${world.state.score}. Terbaik ${best}.`);
  }

  function stepPlay() {
    const walkTarget = input.takeWalkTarget();
    if (walkTarget !== null) world.state.chef.walkTarget = walkTarget;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
      return;
    }
    const use = Boolean(actions & ACTION_USE);
    const events = world.step(STEP, input.direction(), use, false);
    playSound(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_MISSED) {
      announce(`Pesanan hangus! ${world.state.hearts} hati tersisa.`);
    } else if (events & EVENT_SERVED) {
      announce(`Disajikan! Skor ${world.state.score}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    // A click anywhere starts (or restarts) the game from the title and over screens.
    const walkTarget = input.takeWalkTarget();
    if (walkTarget !== null && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_USE && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_USE) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Lanjut memasak.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepPlay();
        accumulator -= STEP;
      }
      if (screen !== SCREEN_PLAY) accumulator = 0;
    } else if (screen === SCREEN_TITLE) {
      // The title screen runs the kitchen behind it as a living backdrop.
      while (accumulator >= STEP) {
        world.step(STEP, 0, false, true);
        accumulator -= STEP;
      }
      handleActions();
    } else {
      accumulator = 0;
      handleActions();
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  world.reset();
  announce('Sizzle and Serve, Dapur Kilat. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
