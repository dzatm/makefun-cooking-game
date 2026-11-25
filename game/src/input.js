// Keyboard and pointer input. Held keys steer the chef; one-shot presses (use a
// station, pause, mute) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. A mouse click on the
// kitchen floor or a station sets a walk target the chef walks to on their own.

export const ACTION_USE = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const USE = new Set(['Space', 'Enter', 'KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let actions = 0;
  /** Kitchen x (logical 1280-wide coordinates) the chef is walking to, or null. */
  let walkTarget = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (USE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_USE;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    // The canvas is scaled to the window; convert the click back to kitchen coordinates.
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    walkTarget = Math.max(0, Math.min(1280, x));
    // No use press here on purpose: the chef walks first, and the world uses the
    // station on arrival (chef.arrived), so a click never works the wrong station.
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The walk target set by the last click, or null when there is none. */
    takeWalkTarget() {
      const target = walkTarget;
      walkTarget = null;
      return target;
    },
    /** Forget any walk target (a key press steers by hand instead). */
    clearWalkTarget() {
      walkTarget = null;
    },
  };
}
