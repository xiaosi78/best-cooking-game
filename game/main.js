// main.js — entry point: game state, the loop, and the shift clock.
// Wires input, kitchen, orders and rendering together; nothing else lives here.
import { createInput, moveVector, consumeAction } from './input.js';
import { freshKitchen, movePlayer, updateKitchen, interact, nearestStation } from './kitchen.js';
import { makeOrder, spawnInterval, tickOrders, serveOrder } from './orders.js';
import { render } from './render.js';
import { applyShot } from './shots.js';
import { unlockAudio, sfx, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);

const SHIFT_SECONDS = 150;

export function freshState() {
  return {
    screen: 'title', // 'title' | 'playing' | 'over'
    score: 0,
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    timeLeft: SHIFT_SECONDS,
    orders: [],
    spawnT: 2,
    message: '',
    messageT: 0,
  };
}

let state = freshState();
let kitchen = freshKitchen();
let lastTick = 0;
let lastTime = performance.now();

// A staged screenshot state (?shot=start|assembly|serve|rush) or plain title.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(state, kitchen, shot);
  state.screen = 'playing';
}

function startShift() {
  state = freshState();
  kitchen = freshKitchen();
  state.screen = 'playing';
  state.orders = [makeOrder(0, 0), makeOrder(0, 0)];
  state.message = 'Shift started! First orders are up — go!';
  state.messageT = 3;
  unlockAudio();
}

function endShift() {
  state.screen = 'over';
  sfx.fail();
}

function update(dt) {
  if (state.screen !== 'playing') return;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endShift();
    return;
  }
  if (state.timeLeft <= 10.5 && Math.ceil(state.timeLeft) !== Math.ceil(state.timeLeft + dt)) sfx.tick();

  // Difficulty grows as the shift runs out: 0 at the start, 1 at the end.
  const difficulty = 1 - state.timeLeft / SHIFT_SECONDS;
  state.spawnT -= dt;
  if (state.spawnT <= 0 && state.orders.length < 5) {
    state.orders.push(makeOrder(difficulty, 0));
    state.spawnT = spawnInterval(difficulty);
  }
  tickOrders(state, dt);
  updateKitchen(kitchen, state, dt);

  const vec = moveVector(input);
  movePlayer(kitchen, vec, dt);

  if (consumeAction(input)) {
    unlockAudio();
    const result = interact(kitchen, state);
    if (result && result.serve) {
      serveOrder(state, result.serve);
      sfx.serve();
    }
  }

  if (state.messageT > 0) state.messageT -= dt;
  lastTick = Math.floor(state.timeLeft);
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (input.startQueued && state.screen === 'title') startShift();
  if (input.restartQueued && state.screen !== 'title') startShift();
  if (input.mouse.clicked && state.screen !== 'playing') startShift();
  input.startQueued = false;
  input.restartQueued = false;
  input.mouse.clicked = false;

  // Mute toggle lives on its own key so it never interferes with play.
  if (input.muteQueued) { toggleMute(); input.muteQueued = false; }

  update(dt);
  const hover = state.screen === 'playing'
    ? nearestStation(kitchen, kitchen.player.x, kitchen.player.y)
    : null;
  render(ctx, state, kitchen, hover);
  statusEl.textContent = state.screen === 'playing'
    ? `Score ${state.score}, ${state.served} served, ${Math.ceil(state.timeLeft)} seconds left.`
    : state.screen === 'over'
      ? `Shift over. Score ${state.score}, ${state.served} dishes served.`
      : 'Rush Hour Kitchen. Press Enter to start.';
  requestAnimationFrame(frame);
}

// Mute key is handled here (not in input.js) to keep input.js to movement/actions.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') input.muteQueued = true;
});

requestAnimationFrame(frame);
