// Everything the player sees, painted on one canvas: the kitchen, the order board,
// the stations with their food, the chef and their hands, and the title, pause and
// end screens. All art is drawn with canvas paths — no image files, no network.
import {
  CHEF, FIELD, FONT, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, ITEMS, ORDER,
  PALETTE, SHIFT_SECONDS, STATIONS, TARGET_SCORE,
} from './config.js';
import { nearestStation, orderForPlate } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const COUNTER_Y = 392;
const COUNTER_H = 92;
const FLOOR_Y = COUNTER_Y + COUNTER_H;
const CHEF_Y = 648;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, align = 'left', weight = 700) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Draw one ingredient at (x, y); `s` is its rough radius in pixels. */
export function drawFood(ctx, id, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'bun': {
      ctx.fillStyle = ITEMS.bun.dark;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.25, s, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ITEMS.bun.colour;
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      for (const [dx, dy] of [[-s * 0.4, -s * 0.45], [0, -s * 0.65], [s * 0.4, -s * 0.45]]) {
        ctx.beginPath();
        ctx.ellipse(dx, dy, s * 0.12, s * 0.07, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'tomato': {
      ctx.fillStyle = ITEMS.tomato.colour;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a8a2e';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(-s * 0.35, -s * 0.5);
      ctx.lineTo(0, -s * 0.65);
      ctx.lineTo(s * 0.35, -s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.35, -s * 0.35, s * 0.25, s * 0.15, -0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tomatoChopped': {
      ctx.fillStyle = ITEMS.tomato.colour;
      for (const [dx, dy, r] of [[-s * 0.45, s * 0.2, s * 0.55], [s * 0.4, s * 0.25, s * 0.5], [0, -s * 0.4, s * 0.55]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ff9a8a';
      ctx.beginPath();
      ctx.arc(-s * 0.45, s * 0.2, s * 0.25, 0, Math.PI * 2);
      ctx.arc(s * 0.4, s * 0.25, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = ITEMS.lettuce.colour;
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * s * 0.45, Math.sin(angle) * s * 0.45, s * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8ed97a';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lettuceChopped': {
      ctx.strokeStyle = ITEMS.lettuce.colour;
      ctx.lineWidth = s * 0.28;
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [
        [-s * 0.7, -s * 0.3, -s * 0.1, -s * 0.6],
        [-s * 0.5, s * 0.4, s * 0.2, s * 0.1],
        [s * 0.1, -s * 0.5, s * 0.7, -s * 0.2],
        [-s * 0.2, s * 0.6, s * 0.6, s * 0.5],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = ITEMS.cheese.colour;
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.6);
      ctx.lineTo(s, s * 0.6);
      ctx.lineTo(0, -s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ITEMS.cheese.dark;
      for (const [dx, dy] of [[-s * 0.25, s * 0.25], [s * 0.3, s * 0.35], [0, -s * 0.2]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pattyRaw': {
      ctx.fillStyle = ITEMS.pattyRaw.colour;
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      roundRect(ctx, -s * 0.8, -s * 0.4, s * 1.6, s * 0.3, s * 0.15);
      ctx.fill();
      break;
    }
    case 'pattyCooked': {
      ctx.fillStyle = ITEMS.pattyCooked.colour;
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.4);
      ctx.fill();
      ctx.strokeStyle = ITEMS.pattyCooked.dark;
      ctx.lineWidth = s * 0.12;
      for (const dx of [-s * 0.5, 0, s * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(dx, -s * 0.45);
        ctx.lineTo(dx, s * 0.45);
        ctx.stroke();
      }
      break;
    }
    case 'pattyBurnt': {
      ctx.fillStyle = ITEMS.pattyBurnt.colour;
      roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.4);
      ctx.fill();
      ctx.strokeStyle = '#6b6560';
      ctx.lineWidth = s * 0.1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.3);
      ctx.lineTo(s * 0.6, s * 0.3);
      ctx.moveTo(s * 0.6, -s * 0.3);
      ctx.lineTo(-s * 0.6, s * 0.3);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawHeart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = filled ? '#e84a3a' : 'rgba(43,33,24,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.8);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.6, -s, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.6, -s, s * 1.2, -s * 0.1, 0, s * 0.8);
  ctx.fill();
  ctx.restore();
}

function drawOrderTicket(ctx, order, x, y, w, h) {
  ctx.fillStyle = PALETTE.ticket;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = order.colour;
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, order.name, x + 12, y + 20, 17, PALETTE.text);
  text(ctx, `${Math.ceil(order.patience)} dtk`, x + w - 12, y + 20, 15, order.patience < 12 ? PALETTE.danger : '#6b5a44', 'right');
  order.items.forEach((item, index) => {
    drawFood(ctx, item, x + 26 + index * 34, y + 48, 13);
  });
  const barW = w - 24;
  const frac = Math.max(0, order.patience / order.max);
  ctx.fillStyle = '#e8dcc4';
  roundRect(ctx, x + 12, y + h - 14, barW, 7, 3);
  ctx.fill();
  ctx.fillStyle = frac < 0.25 ? PALETTE.danger : frac < 0.5 ? '#e8590c' : PALETTE.good;
  roundRect(ctx, x + 12, y + h - 14, barW * frac, 7, 3);
  ctx.fill();
}

function drawChef(ctx, state, t) {
  const chef = state.chef;
  const x = chef.x;
  const bob = Math.sin(t * 10) * (chef.walkTarget !== null ? 2 : 0);
  const y = CHEF_Y + bob;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 62, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(-16, 28, 13, 32);
  ctx.fillRect(3, 28, 13, 32);
  // Body and apron.
  ctx.fillStyle = '#f4f6f8';
  roundRect(ctx, -24, -18, 48, 50, 12);
  ctx.fill();
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(-24, 8, 48, 10);
  // Arms.
  ctx.strokeStyle = '#f4f6f8';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.lineTo(-30, 14);
  ctx.moveTo(20, -8);
  ctx.lineTo(30, 14);
  ctx.stroke();
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -34, 17, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-12, -52, 10, 0, Math.PI * 2);
  ctx.arc(0, -56, 12, 0, Math.PI * 2);
  ctx.arc(12, -52, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-16, -54, 32, 8);
  // Eyes and smile, looking the way the chef faces.
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(-6 + chef.facing * 2, -34, 2.2, 0, Math.PI * 2);
  ctx.arc(6 + chef.facing * 2, -34, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(chef.facing * 2, -28, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // What the chef carries, held up in both hands.
  chef.holding.forEach((item, index) => {
    const hx = chef.holding.length === 1 ? 0 : index === 0 ? -26 : 26;
    const hy = chef.holding.length === 1 ? -78 : -72;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(hx, hy, 20, 0, Math.PI * 2);
    ctx.fill();
    drawFood(ctx, item, hx, hy, 14);
  });
  ctx.restore();
}

function drawStation(ctx, station, state, t) {
  const x = station.x;
  const top = COUNTER_Y - 58;
  const active = nearestStation(state.chef.x) === station;
  if (active) {
    ctx.fillStyle = 'rgba(246, 201, 69, 0.35)';
    roundRect(ctx, x - 52, top - 16, 104, 78, 12);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.steelDark;
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (station.kind === 'bin') {
    ctx.fillStyle = '#7a4a21';
    roundRect(ctx, x - 34, top + 6, 68, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#a9743f';
    roundRect(ctx, x - 34, top + 6, 68, 12, 8);
    ctx.fill();
    drawFood(ctx, station.item, x, top + 2, 20);
    text(ctx, station.label, x, COUNTER_Y + 66, 13, PALETTE.cream, 'center');
  } else if (station.kind === 'board') {
    const board = state.board;
    ctx.fillStyle = '#e8c890';
    roundRect(ctx, x - 44, top + 14, 88, 26, 6);
    ctx.fill();
    ctx.strokeStyle = '#b98d54';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (board.item) {
      const chopped = board.progress >= 1;
      drawFood(ctx, chopped ? ITEMS[board.item].servesAs : board.item, x, top + 2, 18);
      if (!chopped) {
        ctx.fillStyle = '#e8dcc4';
        roundRect(ctx, x - 30, top + 34, 60, 6, 3);
        ctx.fill();
        ctx.fillStyle = '#e8590c';
        roundRect(ctx, x - 30, top + 34, 60 * board.progress, 6, 3);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#b98d54';
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText('✂', x, top + 26);
    }
    text(ctx, station.label, x, COUNTER_Y + 66, 13, PALETTE.cream, 'center');
  } else if (station.kind === 'grill') {
    ctx.fillStyle = '#3a3f4a';
    roundRect(ctx, x - 62, top - 6, 124, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#22252c';
    roundRect(ctx, x - 56, top, 112, 42, 6);
    ctx.fill();
    // Grill grate, so the station reads as a grill even when it is empty.
    ctx.strokeStyle = '#4a4f59';
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i += 1) {
      const gy = top + i * 10;
      ctx.beginPath();
      ctx.moveTo(x - 52, gy);
      ctx.lineTo(x + 52, gy);
      ctx.stroke();
    }
    // Heat glow under a cooking patty.
    state.grill.forEach((slot, index) => {
      const sx = x - 30 + index * 60;
      if (slot.item) {
        const cooking = slot.progress < GRILL_COOK_SECONDS;
        const burnt = slot.progress >= GRILL_BURN_SECONDS;
        if (cooking) {
          const flicker = 0.5 + Math.sin(t * 9 + index * 2) * 0.2;
          ctx.fillStyle = `rgba(232, 89, 12, ${0.25 + flicker * 0.2})`;
          ctx.beginPath();
          ctx.ellipse(sx, top + 36, 26, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawFood(ctx, burnt ? 'pattyBurnt' : slot.item, sx, top + 18, 17);
        const frac = Math.min(1, slot.progress / GRILL_COOK_SECONDS);
        ctx.fillStyle = '#555b66';
        roundRect(ctx, sx - 22, top + 40, 44, 5, 2);
        ctx.fill();
        ctx.fillStyle = burnt ? PALETTE.danger : frac >= 1 ? PALETTE.good : '#f6a93c';
        roundRect(ctx, sx - 22, top + 40, 44 * frac, 5, 2);
        ctx.fill();
      }
    });
    text(ctx, station.label, x, COUNTER_Y + 66, 13, PALETTE.cream, 'center');
  } else if (station.kind === 'plate') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, top + 34, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8ccd4';
    ctx.lineWidth = 2;
    ctx.stroke();
    state.plate.forEach((item, index) => {
      drawFood(ctx, item, x, top + 22 - index * 12, 16);
    });
    if (state.plate.length > 0 && orderForPlate(state)) {
      const pulse = 0.7 + Math.sin(t * 5) * 0.3;
      ctx.fillStyle = `rgba(47, 158, 68, ${pulse})`;
      roundRect(ctx, x - 46, top - 22, 92, 22, 11);
      ctx.fill();
      text(ctx, 'SIAP SAJI!', x, top - 11, 13, '#ffffff', 'center');
    }
    text(ctx, station.label, x, COUNTER_Y + 66, 13, PALETTE.cream, 'center');
  } else if (station.kind === 'serve') {
    ctx.fillStyle = '#6e4525';
    roundRect(ctx, x - 52, top - 14, 104, 64, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe9b8';
    roundRect(ctx, x - 44, top - 6, 88, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#e8590c';
    ctx.beginPath();
    ctx.arc(x, top - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText('🔔', x, top - 1);
    text(ctx, station.label, x, COUNTER_Y + 66, 13, PALETTE.cream, 'center');
  }
}

function drawKitchen(ctx, state, t) {
  // Wall and floor.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, COUNTER_Y);
  ctx.fillStyle = PALETTE.wallStripe;
  ctx.fillRect(0, 96, FIELD.width, 10);
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, FLOOR_Y, FIELD.width, FIELD.height - FLOOR_Y);
  ctx.fillStyle = PALETTE.floorTile;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const offset = row % 2 === 0 ? 0 : 80;
      ctx.fillRect(col * 160 + offset - 80, FLOOR_Y + 18 + row * 72, 150, 62);
    }
  }
  // Hanging lamps and a wall clock over the counter.
  for (const lx of [200, 640, 1080]) {
    ctx.strokeStyle = '#6e4525';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 96);
    ctx.lineTo(lx, 130);
    ctx.stroke();
    ctx.fillStyle = '#f6c945';
    ctx.beginPath();
    ctx.moveTo(lx - 18, 150);
    ctx.lineTo(lx + 18, 150);
    ctx.lineTo(lx + 8, 128);
    ctx.lineTo(lx - 8, 128);
    ctx.closePath();
    ctx.fill();
  }
  // A shelf with pots and a framed menu poster, so the back wall reads as a kitchen.
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(360, 212, 560, 10);
  ctx.fillStyle = '#6e4525';
  ctx.fillRect(360, 222, 560, 5);
  const potColours = ['#4a90d9', '#e8590c', '#2f9e44'];
  potColours.forEach((colour, index) => {
    const px = 420 + index * 130;
    ctx.fillStyle = colour;
    roundRect(ctx, px - 26, 178, 52, 34, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(ctx, px - 26, 178, 52, 10, 8);
    ctx.fill();
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(px - 32, 192, 8, 6);
    ctx.fillRect(px + 24, 192, 8, 6);
  });
  // A potted herb at the end of the shelf.
  ctx.fillStyle = '#b5502a';
  ctx.fillRect(836, 192, 30, 20);
  ctx.fillStyle = '#5fbf4a';
  ctx.beginPath();
  ctx.arc(851, 182, 14, 0, Math.PI * 2);
  ctx.arc(840, 190, 10, 0, Math.PI * 2);
  ctx.arc(862, 190, 10, 0, Math.PI * 2);
  ctx.fill();
  // Menu poster on the right of the wall.
  ctx.fillStyle = PALETTE.cream;
  roundRect(ctx, 1108, 168, 118, 132, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a5a33';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'MENU', 1167, 190, 16, PALETTE.accent, 'center');
  text(ctx, 'Burger Kilat', 1167, 220, 12, PALETTE.text, 'center', 400);
  text(ctx, 'Salad Pelangi', 1167, 242, 12, PALETTE.text, 'center', 400);
  text(ctx, 'Keju Leleh', 1167, 264, 12, PALETTE.text, 'center', 400);
  text(ctx, 'Double Sizzle', 1167, 286, 12, PALETTE.text, 'center', 400);
  // The counter.
  ctx.fillStyle = PALETTE.counter;
  ctx.fillRect(0, COUNTER_Y, FIELD.width, COUNTER_H);
  ctx.fillStyle = PALETTE.counterTop;
  ctx.fillRect(0, COUNTER_Y - 8, FIELD.width, 16);
  ctx.fillStyle = PALETTE.counterEdge;
  ctx.fillRect(0, COUNTER_Y + COUNTER_H - 10, FIELD.width, 10);

  for (const station of STATIONS) drawStation(ctx, station, state, t);
}

function drawHud(ctx, state) {
  // Order board: tickets on the left, shift clock and score on the right.
  ctx.fillStyle = 'rgba(43, 33, 24, 0.08)';
  roundRect(ctx, 16, 12, 700, 92, 12);
  ctx.fill();
  if (state.orders.length === 0) {
    text(ctx, 'Belum ada pesanan — bersiaplah!', 32, 58, 16, PALETTE.text);
  }
  state.orders.forEach((order, index) => {
    drawOrderTicket(ctx, order, 28 + index * 224, 20, 212, 76);
  });

  const panelX = 740;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, panelX, 12, 524, 92, 12);
  ctx.fill();
  const urgent = state.timeLeft <= 30;
  text(ctx, `⏱ ${formatTime(state.timeLeft)}`, panelX + 18, 44, 30, urgent ? PALETTE.danger : PALETTE.text);
  text(ctx, `Skor ${state.score}`, panelX + 18, 82, 18, PALETTE.text);
  text(ctx, `Target ${TARGET_SCORE}`, panelX + 210, 82, 15, '#6b5a44');
  for (let i = 0; i < 3; i += 1) drawHeart(ctx, panelX + 330 + i * 30, 44, 11, i < state.hearts);
  if (state.combo >= 2) {
    ctx.fillStyle = '#e8590c';
    roundRect(ctx, panelX + 420, 28, 88, 32, 16);
    ctx.fill();
    text(ctx, `KOMBO x${state.combo}`, panelX + 464, 45, 15, '#ffffff', 'center');
  }
  text(ctx, `Disajikan: ${state.served}`, panelX + 330, 82, 15, '#6b5a44');
}

function drawPrompt(ctx, state) {
  const station = nearestStation(state.chef.x);
  if (!station) return;
  const ready = station.kind === 'plate' && state.plate.length > 0 && orderForPlate(state);
  const label = ready ? 'Sajikan di Jendela Saji!' : station.kind === 'serve' ? 'Tekan E untuk menyajikan' : `E — ${station.label}`;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillStyle = 'rgba(43, 33, 24, 0.8)';
  const w = ctx.measureText(label).width + 90;
  roundRect(ctx, station.x - w / 2, COUNTER_Y - 118, w, 30, 15);
  ctx.fill();
  text(ctx, label, station.x, COUNTER_Y - 103, 14, '#ffffff', 'center');
  // Arrow pointing down at the station.
  ctx.fillStyle = 'rgba(43, 33, 24, 0.8)';
  ctx.beginPath();
  ctx.moveTo(station.x - 8, COUNTER_Y - 88);
  ctx.lineTo(station.x + 8, COUNTER_Y - 88);
  ctx.lineTo(station.x, COUNTER_Y - 76);
  ctx.closePath();
  ctx.fill();
}

function drawOverlay(ctx, lines, title, colour) {
  ctx.fillStyle = 'rgba(43, 33, 24, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.cream;
  roundRect(ctx, 340, 130, 600, 440, 18);
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.stroke();
  text(ctx, title, 640, 190, 44, colour, 'center', 800);
  let y = 250;
  for (const line of lines) {
    text(ctx, line, 640, y, 19, PALETTE.text, 'center', 400);
    y += 34;
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best) {
    const t = state.time;
    // Fit the 1280x720 kitchen into the window, letterboxed.
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    drawKitchen(ctx, state, t);
    drawHud(ctx, state);
    drawChef(ctx, state, t);
    if (screen === SCREEN_PLAY) drawPrompt(ctx, state);

    if (state.flashTime > 0 && screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(43, 33, 24, 0.85)';
      const w = ctx.measureText(state.flash).width + 36;
      roundRect(ctx, 640 - w / 2, 528, w, 34, 17);
      ctx.fill();
      text(ctx, state.flash, 640, 546, 16, '#ffffff', 'center');
    }

    if (screen === SCREEN_TITLE) {
      drawOverlay(ctx, [
        'Ambil bahan, iris, panggang, rakit di piring, lalu sajikan!',
        '',
        '← → / A D — jalan    E / Spasi — pakai stasiun',
        'Klik stasiun — chef berjalan sendiri ke sana',
        'P — jeda    M — suara',
        '',
        `Satu shift ${Math.floor(SHIFT_SECONDS / 60)}½ menit. Capai ${TARGET_SCORE} poin untuk menang.`,
        `Skor terbaik: ${best}`,
        '',
        'Tekan SPASI atau klik untuk mulai memasak!',
      ], 'SIZZLE & SERVE', '#e8590c');
      text(ctx, 'DAPUR KILAT', 640, 224, 20, '#6b5a44', 'center', 700);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, [
        'Istirahat sebentar — kompor tetap menyala di kepala.',
        '',
        'Tekan P atau Spasi untuk lanjut.',
      ], 'JEDA', '#4a90d9');
    } else if (screen === SCREEN_OVER) {
      const won = state.won;
      drawOverlay(ctx, [
        won ? 'Shift selesai — dapur bersorak!' : 'Shift selesai — dapur masih bisa lebih baik.',
        '',
        `Skor akhir: ${state.score}   (target ${TARGET_SCORE})`,
        `Hidangan disajikan: ${state.served}    Pesanan hangus: ${state.missed}`,
        `Kombo terbaik: x${state.bestCombo}`,
        `Skor terbaik: ${best}`,
        '',
        'Tekan SPASI atau klik untuk main lagi!',
      ], won ? 'MENANG!' : 'SHIFT SELESAI', won ? '#2f9e44' : '#e8590c');
    }
  }

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { draw, resize };
}
