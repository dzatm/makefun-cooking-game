// The kitchen itself: orders, stations, the chef's hands and the shift clock. No drawing
// lives here, only rules — the renderer paints whatever this state holds, and the
// screenshot autopilot plays by calling the same step() a player does.
import {
  CHEF, CHOP_PER_PRESS, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, HEARTS, ITEMS,
  ORDER, RECIPES, SCORE, SHIFT_SECONDS, STATIONS, TARGET_SCORE,
} from './config.js';
import { pick } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_CHOP = 4;
export const EVENT_COOKED = 8;
export const EVENT_BURNT = 16;
export const EVENT_SERVED = 32;
export const EVENT_MISSED = 64;
export const EVENT_OVER = 128;
export const EVENT_DENIED = 256;

/** The station whose centre is nearest the chef, when the chef stands within reach. */
export function nearestStation(x) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of STATIONS) {
    const distance = Math.abs(station.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return bestDistance <= CHEF.reach ? best : null;
}

/** True when the plate holds exactly the dish an open ticket asks for. */
export function orderForPlate(state) {
  for (const order of state.orders) {
    if (sameDish(state.plate, order.items)) return order;
  }
  return null;
}

function sameDish(a, b) {
  if (a.length !== b.length) return false;
  const rest = [...b];
  for (const item of a) {
    const index = rest.indexOf(item);
    if (index === -1) return false;
    rest.splice(index, 1);
  }
  return true;
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      time: 0,
      timeLeft: SHIFT_SECONDS,
      score: 0,
      combo: 0,
      bestCombo: 0,
      hearts: HEARTS,
      served: 0,
      missed: 0,
      orders: [],
      spawnIn: ORDER.firstDelay,
      spawnInterval: ORDER.interval,
      nextOrderId: 1,
      chef: { x: 640, facing: 1, holding: [], walkTarget: null, arrived: false },
      board: { item: null, progress: 0 },
      grill: [
        { item: null, progress: 0 },
        { item: null, progress: 0 },
      ],
      plate: [],
      over: false,
      won: false,
      /** Short-lived feedback line the renderer shows under the counter. */
      flash: '',
      flashTime: 0,
    };
  }

  function reset() {
    Object.assign(state, freshState());
    spawnOrder();
  }

  function spawnOrder() {
    const recipe = pick(random, RECIPES);
    state.orders.push({
      id: state.nextOrderId,
      name: recipe.name,
      colour: recipe.colour,
      items: [...recipe.items],
      patience: ORDER.patience,
      max: ORDER.patience,
    });
    state.nextOrderId += 1;
  }

  function flash(message) {
    state.flash = message;
    state.flashTime = 2.2;
  }

  /** Use the station the chef stands at. Returns the events the use caused. */
  function useStation() {
    const station = nearestStation(state.chef.x);
    if (!station) return EVENT_NONE;
    const chef = state.chef;
    let events = EVENT_NONE;

    if (station.kind === 'bin') {
      if (chef.holding.length >= CHEF.hands) {
        flash('Tangan penuh!');
        return EVENT_DENIED;
      }
      chef.holding.push(station.item);
      flash(`Ambil ${ITEMS[station.item].name}.`);
      return EVENT_PICKUP;
    }

    if (station.kind === 'board') {
      const board = state.board;
      if (board.item === null) {
        const index = chef.holding.findIndex((id) => ITEMS[id].prep === 'chop');
        if (index === -1) {
          flash('Taruh tomat atau selada di talenan.');
          return EVENT_DENIED;
        }
        board.item = chef.holding.splice(index, 1)[0];
        board.progress = 0;
        flash('Potong-potong! Tekan lagi untuk mengiris.');
        return EVENT_PLACE;
      }
      if (board.progress < 1) {
        board.progress = Math.min(1, board.progress + CHOP_PER_PRESS);
        events = EVENT_CHOP;
        if (board.progress >= 1) flash(`${ITEMS[board.item].name} sudah teriris!`);
        return events;
      }
      if (chef.holding.length >= CHEF.hands) {
        flash('Tangan penuh!');
        return EVENT_DENIED;
      }
      chef.holding.push(ITEMS[board.item].servesAs);
      board.item = null;
      board.progress = 0;
      flash('Irisan siap!');
      return EVENT_PICKUP;
    }

    if (station.kind === 'grill') {
      const cooked = state.grill.find((slot) => slot.item && slot.progress >= GRILL_COOK_SECONDS && slot.progress < GRILL_BURN_SECONDS);
      if (cooked) {
        if (chef.holding.length >= CHEF.hands) {
          flash('Tangan penuh!');
          return EVENT_DENIED;
        }
        chef.holding.push(ITEMS[cooked.item].servesAs);
        cooked.item = null;
        cooked.progress = 0;
        flash('Daging panggang siap!');
        return EVENT_PICKUP;
      }
      const burnt = state.grill.find((slot) => slot.item && slot.progress >= GRILL_BURN_SECONDS);
      if (burnt) {
        burnt.item = null;
        burnt.progress = 0;
        flash('Daging gosong dibuang.');
        return EVENT_PLACE;
      }
      const free = state.grill.find((slot) => slot.item === null);
      const rawIndex = chef.holding.indexOf('pattyRaw');
      if (free && rawIndex !== -1) {
        free.item = chef.holding.splice(rawIndex, 1)[0];
        free.progress = 0;
        flash('Daging mulai dipanggang…');
        return EVENT_PLACE;
      }
      if (!free) flash('Panggangan penuh.');
      else flash('Bawa daging mentah ke panggangan.');
      return EVENT_DENIED;
    }

    if (station.kind === 'plate') {
      if (chef.holding.length >= CHEF.hands) {
        // Hands full at the plate: throw the top item off the plate instead, so a
        // wrong dish can still be fixed.
        if (state.plate.length > 0) {
          state.plate.pop();
          flash('Bahan teratas dibuang dari piring.');
          return EVENT_PLACE;
        }
        flash('Tangan penuh!');
        return EVENT_DENIED;
      }
      if (chef.holding.length > 0) {
        state.plate.push(chef.holding.pop());
        return EVENT_PLACE;
      }
      if (state.plate.length > 0) {
        state.plate.pop();
        flash('Bahan diambil kembali dari piring.');
        return EVENT_PICKUP;
      }
      flash('Piring kosong — letakkan bahan di sini.');
      return EVENT_DENIED;
    }

    if (station.kind === 'serve') {
      const order = orderForPlate(state);
      if (!order) {
        flash('Belum ada pesanan yang cocok dengan piring ini.');
        return EVENT_DENIED;
      }
      const tip = Math.round((SCORE.tipMax * order.patience) / order.max);
      const comboBonus = SCORE.comboBonus * state.combo;
      const earned = SCORE.base + tip + comboBonus;
      state.score += earned;
      state.served += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.orders = state.orders.filter((open) => open.id !== order.id);
      state.plate = [];
      flash(`Disajikan! ${order.name} +${earned} poin${state.combo > 1 ? ` (kombo x${state.combo})` : ''}`);
      return EVENT_SERVED;
    }

    return events;
  }

  /**
   * Advance the kitchen by `dt` seconds. `move` is -1, 0 or 1; `use` is true on the
   * frame the player presses the use key. In attract mode (the title screen) orders
   * keep coming but never expire and the shift clock does not run.
   */
  function step(dt, move, use, attract) {
    let events = EVENT_NONE;
    state.time += dt;
    if (state.flashTime > 0) state.flashTime -= dt;

    const chef = state.chef;
    if (move !== 0) {
      chef.walkTarget = null;
      chef.facing = move;
      chef.x = Math.max(CHEF.minX, Math.min(CHEF.maxX, chef.x + move * CHEF.speed * dt));
    } else if (chef.walkTarget !== null) {
      const dx = chef.walkTarget - chef.x;
      if (Math.abs(dx) <= 8) {
        chef.walkTarget = null;
        chef.arrived = true;
      } else {
        chef.facing = dx > 0 ? 1 : -1;
        chef.x = Math.max(CHEF.minX, Math.min(CHEF.maxX, chef.x + Math.sign(dx) * CHEF.speed * dt));
      }
    }

    for (const slot of state.grill) {
      if (slot.item === null) continue;
      const before = slot.progress;
      slot.progress += dt;
      if (before < GRILL_COOK_SECONDS && slot.progress >= GRILL_COOK_SECONDS) events |= EVENT_COOKED;
      if (before < GRILL_BURN_SECONDS && slot.progress >= GRILL_BURN_SECONDS) {
        events |= EVENT_BURNT;
        flash('Daging gosong! Buang dari panggangan.');
      }
    }

    if (use || chef.arrived) {
      chef.arrived = false;
      events |= useStation();
    }

    if (!attract) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.over = true;
        state.won = state.score >= TARGET_SCORE;
        return events | EVENT_OVER;
      }
    }

    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      if (state.orders.length < ORDER.maxActive) spawnOrder();
      state.spawnInterval = Math.max(ORDER.intervalMin, state.spawnInterval * ORDER.intervalStep);
      state.spawnIn = state.spawnInterval * (0.85 + random() * 0.3);
    }

    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        if (attract) {
          // On the title screen a ticket just fades and a new one takes its place.
          state.orders.splice(index, 1);
        } else {
          state.orders.splice(index, 1);
          state.hearts -= 1;
          state.missed += 1;
          state.combo = 0;
          flash(`Pesanan ${order.name} hangus!`);
          events |= EVENT_MISSED;
          if (state.hearts <= 0) {
            state.over = true;
            state.won = false;
            return events | EVENT_OVER;
          }
        }
      }
    }

    return events;
  }

  return { state, reset, step, useStation, nearestStation, orderForPlate };
}
