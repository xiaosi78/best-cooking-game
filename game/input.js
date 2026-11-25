// input.js — keyboard and mouse input, shared by the game loop and the kitchen.
// Movement keys are tracked as a held set; action presses are edge-triggered
// (consumed once by the kitchen each frame) so one keypress is one interaction.

export function createInput(canvas) {
  const input = {
    held: new Set(),
    actionQueued: false,
    mouse: { x: 0, y: 0, clicked: false },
  };

  const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];

  window.addEventListener('keydown', (e) => {
    if (MOVE_KEYS.includes(e.code)) {
      input.held.add(e.code);
      e.preventDefault();
    }
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (!e.repeat) input.actionQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyR') input.restartQueued = true;
    if (e.code === 'Enter') input.startQueued = true;
  });
  window.addEventListener('keyup', (e) => input.held.delete(e.code));

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.mouse.clicked = true;
    input.actionQueued = true;
  });

  return input;
}

export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.held.has('ArrowLeft') || input.held.has('KeyA')) x -= 1;
  if (input.held.has('ArrowRight') || input.held.has('KeyD')) x += 1;
  if (input.held.has('ArrowUp') || input.held.has('KeyW')) y -= 1;
  if (input.held.has('ArrowDown') || input.held.has('KeyS')) y += 1;
  if (x !== 0 && y !== 0) {
    const n = Math.hypot(x, y);
    x /= n;
    y /= n;
  }
  return { x, y };
}

export function consumeAction(input) {
  const q = input.actionQueued;
  input.actionQueued = false;
  return q;
}
