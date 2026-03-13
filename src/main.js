import { BASE_GAME_HEIGHT, BASE_GAME_WIDTH } from "./game/constants.js";
import { TowerRushScene } from "./game/TowerRushScene.js";
import { initTouchControls } from "./game/touchControls.js";

function createGame() {
  initTouchControls();

  const root = document.getElementById("game-root");
  const width = Math.max(320, Math.round(root?.clientWidth || BASE_GAME_WIDTH));
  const height = Math.max(420, Math.round(root?.clientHeight || BASE_GAME_HEIGHT));

  const config = {
    type: Phaser.AUTO,
    width,
    height,
    parent: "game-root",
    backgroundColor: "#10263d",
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [TowerRushScene],
  };

  return new Phaser.Game(config);
}

window.addEventListener("DOMContentLoaded", createGame);
