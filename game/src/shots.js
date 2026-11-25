// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real
// rules forward from a fresh world, steered by a small autopilot that works through
// one ticket at a time — take the raw ingredient, chop or grill it, lay it on the
// plate, serve it — so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { CHEF, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, ITEMS, STEP, STATIONS } from './config.js';
import { EVENT_OVER, orderForPlate } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_LIMIT_SECONDS = 70;
const SERVE_LIMIT_SECONDS = 100;
const END_LIMIT_SECONDS = 60;
/** How close the autopilot walks before it calls a station reached. */
const ARRIVE = 10;

function stationById(id) {
  return STATIONS.find((station) => station.id === id);
}

/** The raw ingredient that becomes `needed` after its prep (or itself when it needs none). */
function rawFor(needed) {
  for (const [id, def] of Object.entries(ITEMS)) {
    if (def.servesAs === needed && def.prep) return id;
  }
  return needed;
}

/** The items of `order` the plate does not already hold, counts included. */
function stillNeeded(order, plate) {
  const rest = [...plate];
  const needed = [];
  for (const item of order.items) {
    const index = rest.indexOf(item);
    if (index === -1) needed.push(item);
    else rest.splice(index, 1);
  }
  return needed;
}

/** True when every item on the plate belongs to `order` (the plate is on its way). */
function plateFits(order, plate) {
  const rest = [...order.items];
  for (const item of plate) {
    const index = rest.indexOf(item);
    if (index === -1) return false;
    rest.splice(index, 1);
  }
  return true;
}

function createAutopilot() {
  let tasks = [];
  let targetOrderId = null;

  function buildPlan(state) {
    tasks = [];
    if (state.orders.length === 0) {
      tasks.push({ type: 'wait', until: (s) => s.orders.length > 0, budget: 600 });
      return;
    }
    // Prefer the ticket the plate already fits; otherwise take the first ticket.
    const order = state.orders.find((open) => plateFits(open, state.plate)) ?? state.orders[0];
    targetOrderId = order.id;

    const ready = orderForPlate(state);
    if (ready) {
      tasks.push({ type: 'goto', x: stationById('serve').x });
      tasks.push({ type: 'use' });
      return;
    }

    for (const needed of stillNeeded(order, state.plate)) {
      const raw = rawFor(needed);
      const prep = ITEMS[raw].prep;
      const bin = STATIONS.find((station) => station.kind === 'bin' && station.item === raw);
      tasks.push({ type: 'goto', x: bin.x });
      tasks.push({ type: 'use' });
      if (prep === 'chop') {
        tasks.push({ type: 'goto', x: stationById('board').x });
        tasks.push({ type: 'use' }); // put it on the board
        tasks.push({ type: 'use' }); // chop
        tasks.push({ type: 'use' }); // chop
        tasks.push({ type: 'use' }); // chop — done
        tasks.push({ type: 'use' }); // take the slices
      } else if (prep === 'grill') {
        tasks.push({ type: 'goto', x: stationById('grill').x });
        tasks.push({ type: 'use' }); // put it on the grill
        tasks.push({
          type: 'wait',
          until: (s) => s.grill.some((slot) => slot.item && slot.progress >= GRILL_COOK_SECONDS && slot.progress < GRILL_BURN_SECONDS),
          budget: 720,
        });
        tasks.push({ type: 'goto', x: stationById('grill').x });
        tasks.push({ type: 'use' }); // take the cooked patty
      }
      tasks.push({ type: 'goto', x: stationById('plate').x });
      tasks.push({ type: 'use' }); // lay it on the plate
    }
    tasks.push({ type: 'goto', x: stationById('serve').x });
    tasks.push({ type: 'use' }); // serve the finished dish
  }

  /** One frame of steering: { move: -1 | 0 | 1, use: boolean }. */
  function next(state) {
    if (targetOrderId !== null && !state.orders.some((order) => order.id === targetOrderId)) {
      tasks = [];
      targetOrderId = null;
    }
    if (tasks.length === 0) buildPlan(state);
    const task = tasks[0];
    if (!task) return { move: 0, use: false };

    if (task.type === 'goto') {
      const dx = task.x - state.chef.x;
      if (Math.abs(dx) <= ARRIVE) {
        tasks.shift();
        return { move: 0, use: false };
      }
      return { move: Math.sign(dx), use: false };
    }
    if (task.type === 'use') {
      tasks.shift();
      return { move: 0, use: true };
    }
    // wait
    if (task.until(state)) {
      tasks.shift();
      return { move: 0, use: false };
    }
    task.budget -= 1;
    if (task.budget <= 0) {
      tasks = [];
      targetOrderId = null;
    }
    return { move: 0, use: false };
  }

  return { next };
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  const pilot = createAutopilot();

  if (name === 'end') {
    // A short shift so the game ends while the autopilot is still cooking — long
    // enough to serve at least one dish first, so the end screen has a score.
    state.timeLeft = 35;
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const steering = pilot.next(state);
      if (world.step(STEP, steering.move, steering.use, false) & EVENT_OVER) break;
    }
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }

  if (name === 'serve') {
    const serveX = stationById('serve').x;
    for (let index = 0; index < SERVE_LIMIT_SECONDS / STEP; index += 1) {
      // Stop with the finished plate in hand at the window, just before serving.
      if (orderForPlate(state) && Math.abs(state.chef.x - serveX) <= ARRIVE + 4) break;
      const steering = pilot.next(state);
      if (world.step(STEP, steering.move, steering.use, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }

  // play: stop once the plate holds two items of the dish — a dish visibly
  // mid-assembly, with the rest of the recipe still to come.
  for (let index = 0; index < PLAY_LIMIT_SECONDS / STEP; index += 1) {
    const steering = pilot.next(state);
    if (world.step(STEP, steering.move, steering.use, false) & EVENT_OVER) break;
    if (state.plate.length >= 2) break;
  }
  return { screen: SCREEN_PLAY, best: state.score };
}
