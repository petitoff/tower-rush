export const touchState = {
  left: false,
  right: false,
  jump: false,
};

function wireTouchButton(buttonId, stateKey) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }

  const activate = (event) => {
    event.preventDefault();
    touchState[stateKey] = true;
    button.classList.add("is-active");
  };

  const deactivate = (event) => {
    event.preventDefault();
    touchState[stateKey] = false;
    button.classList.remove("is-active");
  };

  button.addEventListener("pointerdown", activate);
  button.addEventListener("pointerup", deactivate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("pointercancel", deactivate);
}

export function initTouchControls() {
  wireTouchButton("left-button", "left");
  wireTouchButton("right-button", "right");
  wireTouchButton("jump-button", "jump");
}
