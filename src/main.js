const BASE_GAME_WIDTH = 540;
const BASE_GAME_HEIGHT = 960;
const START_Y = 840;
const GENERATION_BUFFER = 2200;
const FALL_LIMIT = 280;
const WALL_JUMP_COYOTE = 0.16;
const WALL_JUMP_LOCK = 0.15;
const WALL_SLIDE_SPEED = 260;
const MAX_PLATFORM_EDGE_GAP = 52;

const touchState = {
  left: false,
  right: false,
  jump: false,
};

class TowerRushScene extends Phaser.Scene {
  constructor() {
    super("tower-rush");
  }

  init() {
    this.runSpeed = 0;
    this.jumpBuffer = 0;
    this.coyoteTime = 0;
    this.wallCoyoteTime = 0;
    this.wallJumpLock = 0;
    this.wallJumpDirection = 0;
    this.bestHeight = 0;
    this.highestPlatformY = START_Y + 80;
    this.lastPlatformX = BASE_GAME_WIDTH / 2;
    this.lastPlatformWidth = 220;
    this.gameOver = false;
  }

  preload() {
    this.createTextures();
  }

  create() {
    this.createBackdrop();

    this.applyViewportSize(this.scale.width, this.scale.height);

    this.platforms = this.physics.add.staticGroup();
    this.populateStartingPlatforms();

    this.player = this.physics.add.sprite(this.scale.width / 2, START_Y - 110, "player-idle");
    this.player.setCollideWorldBounds(true);
    this.player.setSize(30, 60);
    this.player.setOffset(17, 14);
    this.player.setGravityY(1900);
    this.player.setMaxVelocity(440, 1400);
    this.player.setDragX(1400);

    this.physics.add.collider(
      this.player,
      this.platforms,
      this.handlePlatformLanding,
      this.shouldCollideWithPlatform,
      this
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      leftAlt: Phaser.Input.Keyboard.KeyCodes.A,
      rightAlt: Phaser.Input.Keyboard.KeyCodes.D,
      jumpAlt: Phaser.Input.Keyboard.KeyCodes.W,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.scoreText = this.add
      .text(20, 20, "0 m", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "30px",
        color: "#f7fbff",
        stroke: "#0c2237",
        strokeThickness: 6,
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.hintText = this.add
      .text(20, 66, "Rozpedz sie i korzystaj z wall jumpow", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#b7d0e6",
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.gameOverPanel = this.add
      .container(this.scale.width / 2, this.scale.height / 2)
      .setDepth(25)
      .setScrollFactor(0)
      .setVisible(false);

    const panelBg = this.add.rectangle(0, 0, 340, 180, 0x071421, 0.88);
    panelBg.setStrokeStyle(2, 0xffd166, 0.9);
    const panelTitle = this.add.text(0, -38, "Koniec biegu", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "34px",
      color: "#f7fbff",
    });
    panelTitle.setOrigin(0.5);
    this.gameOverScore = this.add.text(0, 8, "", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "20px",
      color: "#b7d0e6",
    });
    this.gameOverScore.setOrigin(0.5);
    const panelHint = this.add.text(0, 56, "Nacisnij R albo kliknij, by zagrac jeszcze raz", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "18px",
      color: "#ffd166",
    });
    panelHint.setOrigin(0.5);
    this.gameOverPanel.add([panelBg, panelTitle, this.gameOverScore, panelHint]);

    this.input.on("pointerdown", () => {
      if (this.gameOver) {
        this.restartRun();
      }
    });

    this.currentCameraTop = START_Y - this.scale.height + 160;
    this.cameras.main.setScroll(0, this.currentCameraTop);
    this.cameras.main.fadeIn(400, 8, 21, 34);
    this.scale.on("resize", this.handleResize, this);
  }

  update(_, delta) {
    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
        this.restartRun();
      }
      return;
    }

    const dt = delta / 1000;
    this.wallJumpLock = Math.max(0, this.wallJumpLock - dt);

    const leftPressed = this.cursors.left.isDown || this.keys.leftAlt.isDown || touchState.left;
    const rightPressed =
      this.cursors.right.isDown || this.keys.rightAlt.isDown || touchState.right;
    const jumpHeld =
      this.cursors.space.isDown ||
      this.cursors.up.isDown ||
      this.keys.jumpAlt.isDown ||
      touchState.jump;

    if (jumpHeld) {
      this.jumpBuffer = 0.16;
    } else {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    }

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const touchingLeftWall = this.player.body.blocked.left;
    const touchingRightWall = this.player.body.blocked.right;

    if (onGround) {
      this.coyoteTime = 0.12;
    } else {
      this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    }

    if (!onGround && (touchingLeftWall || touchingRightWall)) {
      this.wallCoyoteTime = WALL_JUMP_COYOTE;
      this.wallJumpDirection = touchingLeftWall ? 1 : -1;
      if (this.player.body.velocity.y > WALL_SLIDE_SPEED) {
        this.player.setVelocityY(WALL_SLIDE_SPEED);
      }
    } else {
      this.wallCoyoteTime = Math.max(0, this.wallCoyoteTime - dt);
    }

    this.applyHorizontalMovement(leftPressed, rightPressed);

    if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
      this.performJump();
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
      this.wallCoyoteTime = 0;
    } else if (this.jumpBuffer > 0 && !onGround && this.wallCoyoteTime > 0) {
      this.performWallJump();
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
      this.wallCoyoteTime = 0;
    }

    if (!jumpHeld && this.player.body.velocity.y < -180) {
      this.player.setVelocityY(this.player.body.velocity.y + 1200 * dt);
    }

    this.updatePlayerAppearance();
    this.updateCamera();
    this.extendTower();
    this.cleanupPlatforms();
    this.updateScore();
    this.checkFailureState();
  }

  createTextures() {
    if (!this.textures.exists("player-idle")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      this.drawPlayerTexture(graphics, "player-idle", {
        armLeft: { x: 13, y: 36, w: 10, h: 20, angle: -12 },
        armRight: { x: 41, y: 36, w: 10, h: 20, angle: 10 },
        legLeft: { x: 23, y: 56, w: 10, h: 18, angle: 0 },
        legRight: { x: 37, y: 56, w: 10, h: 18, angle: 0 },
        bodyTilt: 0,
        scarfTail: -5,
        eyeOffsetY: 0,
      });
      this.drawPlayerTexture(graphics, "player-run-a", {
        armLeft: { x: 14, y: 37, w: 10, h: 20, angle: -38 },
        armRight: { x: 41, y: 35, w: 10, h: 20, angle: 28 },
        legLeft: { x: 24, y: 58, w: 10, h: 18, angle: 26 },
        legRight: { x: 37, y: 56, w: 10, h: 18, angle: -24 },
        bodyTilt: -5,
        scarfTail: -12,
        eyeOffsetY: -1,
      });
      this.drawPlayerTexture(graphics, "player-run-b", {
        armLeft: { x: 13, y: 35, w: 10, h: 20, angle: 24 },
        armRight: { x: 42, y: 37, w: 10, h: 20, angle: -36 },
        legLeft: { x: 24, y: 56, w: 10, h: 18, angle: -22 },
        legRight: { x: 37, y: 58, w: 10, h: 18, angle: 26 },
        bodyTilt: 5,
        scarfTail: 8,
        eyeOffsetY: 1,
      });
      this.drawPlayerTexture(graphics, "player-jump", {
        armLeft: { x: 14, y: 31, w: 10, h: 20, angle: -58 },
        armRight: { x: 41, y: 31, w: 10, h: 20, angle: 54 },
        legLeft: { x: 25, y: 58, w: 10, h: 16, angle: -16 },
        legRight: { x: 36, y: 58, w: 10, h: 16, angle: 16 },
        bodyTilt: 0,
        scarfTail: -16,
        eyeOffsetY: -1,
      });
      this.drawPlayerTexture(graphics, "player-fall", {
        armLeft: { x: 13, y: 39, w: 10, h: 20, angle: 26 },
        armRight: { x: 41, y: 39, w: 10, h: 20, angle: -24 },
        legLeft: { x: 24, y: 58, w: 10, h: 18, angle: 10 },
        legRight: { x: 37, y: 58, w: 10, h: 18, angle: -10 },
        bodyTilt: 0,
        scarfTail: 10,
        eyeOffsetY: 1,
      });
      this.drawPlayerTexture(graphics, "player-wall", {
        armLeft: { x: 12, y: 35, w: 10, h: 20, angle: -72 },
        armRight: { x: 42, y: 36, w: 10, h: 20, angle: 12 },
        legLeft: { x: 24, y: 58, w: 10, h: 17, angle: -10 },
        legRight: { x: 37, y: 58, w: 10, h: 17, angle: 28 },
        bodyTilt: -8,
        scarfTail: -9,
        eyeOffsetY: 0,
      });

      graphics.fillStyle(0xf4f7fb, 1);
      graphics.fillRoundedRect(0, 0, 160, 22, 11);
      graphics.fillStyle(0xa7d6f1, 1);
      graphics.fillRoundedRect(6, 5, 148, 10, 5);
      graphics.generateTexture("platform", 160, 22);
      graphics.destroy();
    }
  }

  drawPlayerTexture(graphics, key, pose) {
    graphics.clear();

    const outline = 0x10263d;
    const coat = 0x3aa7b4;
    const coatShadow = 0x267c8d;
    const scarf = 0xffd166;
    const hair = 0x19324d;
    const skin = 0xffd7b5;
    const boot = 0xf25f5c;
    const glove = 0xf7fbff;

    const drawLimb = (x, y, w, h, angle, color) => {
      graphics.save();
      graphics.translateCanvas(x, y);
      graphics.rotateCanvas(Phaser.Math.DegToRad(angle));
      graphics.fillStyle(outline, 1);
      graphics.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 6);
      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      graphics.restore();
    };

    graphics.fillStyle(outline, 0.2);
    graphics.fillEllipse(32, 76, 26, 8);

    drawLimb(pose.legLeft.x, pose.legLeft.y, pose.legLeft.w, pose.legLeft.h, pose.legLeft.angle, boot);
    drawLimb(
      pose.legRight.x,
      pose.legRight.y,
      pose.legRight.w,
      pose.legRight.h,
      pose.legRight.angle,
      boot
    );
    drawLimb(pose.armLeft.x, pose.armLeft.y, pose.armLeft.w, pose.armLeft.h, pose.armLeft.angle, glove);
    drawLimb(
      pose.armRight.x,
      pose.armRight.y,
      pose.armRight.w,
      pose.armRight.h,
      pose.armRight.angle,
      glove
    );

    graphics.save();
    graphics.translateCanvas(32, 41);
    graphics.rotateCanvas(Phaser.Math.DegToRad(pose.bodyTilt));

    graphics.fillStyle(outline, 1);
    graphics.fillRoundedRect(-16, -4, 32, 38, 12);
    graphics.fillStyle(coat, 1);
    graphics.fillRoundedRect(-14, -2, 28, 34, 11);
    graphics.fillStyle(coatShadow, 1);
    graphics.fillRoundedRect(-5, -2, 8, 34, 5);

    graphics.fillStyle(scarf, 1);
    graphics.fillRoundedRect(-15, -7, 30, 10, 5);
    graphics.fillTriangle(10, -2, 18, pose.scarfTail, 4, 8);

    graphics.fillStyle(outline, 1);
    graphics.fillCircle(0, -17, 16);
    graphics.fillStyle(skin, 1);
    graphics.fillCircle(0, -18, 14);

    graphics.fillStyle(hair, 1);
    graphics.fillCircle(-2, -23, 13);
    graphics.fillRoundedRect(-14, -31, 26, 10, 4);
    graphics.fillTriangle(-14, -22, -2, -35, 8, -21);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(-5, -19 + pose.eyeOffsetY, 2.6);
    graphics.fillCircle(5, -19 + pose.eyeOffsetY, 2.6);
    graphics.fillStyle(outline, 1);
    graphics.fillCircle(-5, -19 + pose.eyeOffsetY, 1.1);
    graphics.fillCircle(5, -19 + pose.eyeOffsetY, 1.1);
    graphics.fillRoundedRect(-5, -12, 10, 3, 2);

    graphics.fillStyle(0xffffff, 0.22);
    graphics.fillRoundedRect(-10, 3, 9, 16, 4);

    graphics.restore();

    graphics.generateTexture(key, 64, 80);
  }

  createBackdrop() {
    this.backdropSky = this.add.rectangle(
      this.scale.width / 2,
      -50000,
      this.scale.width,
      52000,
      0x12304d
    );
    this.backdropSky.setOrigin(0.5, 0);

    for (let i = 0; i < 80; i += 1) {
      const dot = this.add.circle(
        Phaser.Math.Between(20, this.scale.width - 20),
        Phaser.Math.Between(-48000, this.scale.height),
        Phaser.Math.Between(1, 3),
        i % 3 === 0 ? 0xffd166 : 0xd8f3ff,
        0.75
      );
      dot.alpha = Phaser.Math.FloatBetween(0.25, 0.8);
      dot.setScrollFactor(0.15 + (i % 4) * 0.08);
    }

    for (let i = 0; i < 14; i += 1) {
      const stripe = this.add.rectangle(
        Phaser.Math.Between(20, this.scale.width - 20),
        START_Y - i * 440,
        Phaser.Math.Between(100, 220),
        8,
        0xffffff,
        0.05
      );
      stripe.angle = Phaser.Math.Between(-20, 20);
      stripe.setScrollFactor(0.3);
    }
  }

  populateStartingPlatforms() {
    this.addPlatform(this.scale.width / 2, START_Y, 220);
    let y = START_Y - 120;
    for (let i = 0; i < 18; i += 1) {
      const width = Phaser.Math.Between(112, 176);
      const x = this.pickReachablePlatformX(width);
      this.addPlatform(x, y, width);
      y -= Phaser.Math.Between(92, 126);
    }
    this.highestPlatformY = y;
  }

  addPlatform(x, y, width) {
    const platform = this.platforms.create(x, y, "platform");
    platform.displayWidth = width;
    platform.displayHeight = 22;
    platform.refreshBody();
    platform.setTint(Phaser.Display.Color.GetColor(244, 247, 251));
    this.lastPlatformX = x;
    this.lastPlatformWidth = width;
    return platform;
  }

  extendTower() {
    const threshold = this.cameras.main.scrollY - GENERATION_BUFFER;
    while (this.highestPlatformY > threshold) {
      this.highestPlatformY -= Phaser.Math.Between(92, 126);
      const width = Phaser.Math.Between(100, 170);
      const x = this.pickReachablePlatformX(width);
      this.addPlatform(x, this.highestPlatformY, width);
    }
  }

  pickReachablePlatformX(width) {
    const halfWidth = width / 2;
    const minX = halfWidth + 16;
    const maxX = this.scale.width - halfWidth - 16;
    const previousHalfWidth = this.lastPlatformWidth / 2;
    const maxCenterDelta = previousHalfWidth + halfWidth + MAX_PLATFORM_EDGE_GAP;
    const minCenterDelta = Math.min(52, Math.max(18, previousHalfWidth * 0.3));

    const preferredDirection =
      this.lastPlatformX < this.scale.width * 0.3
        ? 1
        : this.lastPlatformX > this.scale.width * 0.7
          ? -1
          : Phaser.Math.RND.pick([-1, 1]);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const direction = attempt < 3 ? preferredDirection : -preferredDirection;
      const centerDelta = Phaser.Math.Between(minCenterDelta, maxCenterDelta);
      const candidateX = Phaser.Math.Clamp(
        this.lastPlatformX + direction * centerDelta,
        minX,
        maxX
      );

      if (Math.abs(candidateX - this.lastPlatformX) >= minCenterDelta * 0.75) {
        return candidateX;
      }
    }

    return Phaser.Math.Clamp(this.lastPlatformX + preferredDirection * minCenterDelta, minX, maxX);
  }

  cleanupPlatforms() {
    const bottomLimit = this.cameras.main.scrollY + this.scale.height + 260;
    this.platforms.children.each((platform) => {
      if (platform.y > bottomLimit) {
        platform.destroy();
      }
    });
  }

  applyHorizontalMovement(leftPressed, rightPressed) {
    const controlMultiplier = this.wallJumpLock > 0 ? 0.38 : 1;
    const acceleration = 1550 * controlMultiplier;
    if (leftPressed && !rightPressed) {
      this.player.setAccelerationX(-acceleration);
    } else if (rightPressed && !leftPressed) {
      this.player.setAccelerationX(acceleration);
    } else {
      this.player.setAccelerationX(0);
    }

    const maxHorizontalSpeed = this.wallJumpLock > 0 ? 430 : 340;
    const clampedVelocity = Phaser.Math.Clamp(
      this.player.body.velocity.x,
      -maxHorizontalSpeed,
      maxHorizontalSpeed
    );
    if (clampedVelocity !== this.player.body.velocity.x) {
      this.player.setVelocityX(clampedVelocity);
    }
    this.runSpeed = Phaser.Math.Linear(this.runSpeed, Math.abs(this.player.body.velocity.x), 0.16);
  }

  performJump() {
    const speedBonus = Phaser.Math.Clamp(this.runSpeed * 0.9, 0, 220);
    this.player.setVelocityY(-820 - speedBonus);
  }

  performWallJump() {
    const speedBonus = Phaser.Math.Clamp(this.runSpeed * 0.45, 0, 90);
    this.wallJumpLock = WALL_JUMP_LOCK;
    this.player.setAccelerationX(0);
    this.player.setVelocityX(this.wallJumpDirection * (390 + speedBonus));
    this.player.setVelocityY(-960 - speedBonus);
    this.cameras.main.shake(110, 0.0028);
  }

  handlePlatformLanding(player) {
    if (player.body.velocity.y > 60) {
      this.cameras.main.shake(90, 0.002);
    }
  }

  shouldCollideWithPlatform(player, platform) {
    return player.body.velocity.y >= -10 && player.body.bottom <= platform.body.top + 18;
  }

  updatePlayerAppearance() {
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const speed = Math.abs(this.player.body.velocity.x);
    const risingFast = this.player.body.velocity.y < -860;
    let textureKey = "player-idle";

    if (!onGround) {
      if (this.wallCoyoteTime > 0 && this.player.body.velocity.y > 40) {
        textureKey = "player-wall";
      } else if (this.player.body.velocity.y < -120) {
        textureKey = "player-jump";
      } else {
        textureKey = "player-fall";
      }
    } else if (speed > 120) {
      textureKey = Math.floor(this.time.now / 90) % 2 === 0 ? "player-run-a" : "player-run-b";
    }

    this.player.setTexture(textureKey);
    this.player.setFlipX(this.player.body.velocity.x < -10);
    this.player.setAngle(Phaser.Math.Clamp(this.player.body.velocity.x * 0.035, -8, 8));
    this.player.setTint(risingFast ? 0xfff0ad : 0xffffff);
  }

  updateCamera() {
    const targetTop = Math.min(this.currentCameraTop, this.player.y - this.scale.height * 0.62);
    this.currentCameraTop = Phaser.Math.Linear(this.currentCameraTop, targetTop, 0.12);
    this.cameras.main.scrollY = this.currentCameraTop;
  }

  updateScore() {
    this.bestHeight = Math.max(this.bestHeight, START_Y - this.player.y);
    const meters = Math.max(0, Math.floor(this.bestHeight / 12));
    this.scoreText.setText(`${meters} m`);
  }

  checkFailureState() {
    const fellBelowCamera =
      this.player.body.top > this.cameras.main.scrollY + this.scale.height + FALL_LIMIT;
    const hitWorldFloor = this.player.body.bottom >= this.physics.world.bounds.bottom - 2;

    if (fellBelowCamera || hitWorldFloor) {
      this.endRun();
    }
  }

  endRun() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.gameOverScore.setText(`Wysokosc: ${Math.floor(this.bestHeight / 12)} m`);
    this.gameOverPanel.setVisible(true);
    this.cameras.main.flash(180, 255, 209, 102, false);
  }

  restartRun() {
    this.physics.resume();
    this.scene.restart();
  }

  handleResize(gameSize) {
    this.applyViewportSize(gameSize.width, gameSize.height);

    if (this.backdropSky) {
      this.backdropSky.setPosition(gameSize.width / 2, -50000);
      this.backdropSky.setDisplaySize(gameSize.width, 52000);
    }

    if (this.gameOverPanel) {
      this.gameOverPanel.setPosition(gameSize.width / 2, gameSize.height / 2);
    }

    if (this.currentCameraTop !== undefined && this.player) {
      this.currentCameraTop = Math.min(this.currentCameraTop, this.player.y - gameSize.height * 0.62);
      this.cameras.main.setScroll(0, this.currentCameraTop);
    }
  }

  applyViewportSize(width, height) {
    this.physics.world.setBounds(0, -50000, width, 52000);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, -50000, width, 52000);

    if (!this.player) {
      this.lastPlatformX = width / 2;
    }
  }
}

function wireTouchButton(buttonId, stateKey, consumeOnPress = false) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }

  const activate = (event) => {
    event.preventDefault();
    touchState[stateKey] = true;
    button.classList.add("is-active");
    if (consumeOnPress) {
      window.setTimeout(() => {
        touchState[stateKey] = false;
        button.classList.remove("is-active");
      }, 110);
    }
  };

  const deactivate = (event) => {
    event.preventDefault();
    if (!consumeOnPress) {
      touchState[stateKey] = false;
    }
    button.classList.remove("is-active");
  };

  button.addEventListener("pointerdown", activate);
  button.addEventListener("pointerup", deactivate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("pointercancel", deactivate);
}

function createGame() {
  wireTouchButton("left-button", "left");
  wireTouchButton("right-button", "right");
  wireTouchButton("jump-button", "jump");

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
