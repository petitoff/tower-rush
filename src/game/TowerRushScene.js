import {
  BASE_GAME_WIDTH,
  FALL_LIMIT,
  GENERATION_BUFFER,
  HUD_TEXT_STYLE,
  LEVEL_THEMES,
  MAX_PLATFORM_EDGE_GAP,
  PLATFORM_TEXTURE_KEYS,
  PLAYER_TEXTURE_KEYS,
  PLATFORM_AUTO_BREAK_LOOKAHEAD,
  PLATFORM_AUTO_BREAK_MULTIPLIER,
  PLATFORM_AUTO_BREAK_TARGETS,
  PLATFORM_STAND_BREAK_MULTIPLIER,
  START_Y,
  WALL_JUMP_COYOTE,
  WALL_JUMP_LOCK,
  WALL_SLIDE_SPEED,
} from "./constants.js";
import { ensurePlayerTextures } from "./playerTextures.js";
import { touchState } from "./touchControls.js";

export class TowerRushScene extends Phaser.Scene {
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
    this.platformMaintenanceTimer = 0;
    this.currentPlayerTextureKey = PLAYER_TEXTURE_KEYS.idle;
    this.currentPlayerFacingLeft = false;
    this.currentPlayerAngle = 0;
    this.currentPlayerTint = 0xffffff;
    this.displayedMeters = -1;
    this.currentThemeIndex = 0;
    this.currentTheme = LEVEL_THEMES[0];
    this.themeTransition = null;
    this.currentStandingPlatform = null;
    this.currentPlatformTint = this.currentTheme.platformTint;
    this.gameOver = false;
  }

  preload() {
    ensurePlayerTextures(this);
  }

  create() {
    this.createBackdrop();
    this.applyViewportSize(this.scale.width, this.scale.height);

    this.platforms = this.physics.add.staticGroup();
    this.populateStartingPlatforms();

    this.player = this.physics.add.sprite(
      this.scale.width / 2,
      START_Y - 110,
      PLAYER_TEXTURE_KEYS.idle
    );
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

    this.createHud();
    this.createGameOverPanel();

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

    const dt = Math.min(delta / 1000, 1 / 30);
    this.wallJumpLock = Math.max(0, this.wallJumpLock - dt);
    this.platformMaintenanceTimer = Math.max(0, this.platformMaintenanceTimer - dt);

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

    this.applyHorizontalMovement(leftPressed, rightPressed, dt);

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
    this.updateCamera(dt);
    this.maintainPlatforms();
    this.updateCrumblingPlatforms(dt, onGround);
    this.updateScore();
    this.updateThemeByHeight();
    this.checkFailureState();
  }

  createHud() {
    this.scoreText = this.add
      .text(20, 20, "0 m", {
        ...HUD_TEXT_STYLE,
        fontSize: "30px",
        stroke: "#0c2237",
        strokeThickness: 6,
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.hintText = this.add
      .text(20, 66, "Rozpedz sie i korzystaj z wall jumpow", {
        ...HUD_TEXT_STYLE,
        fontSize: "16px",
        color: "#b7d0e6",
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.themeText = this.add
      .text(20, 92, this.currentTheme.name, {
        ...HUD_TEXT_STYLE,
        fontSize: "18px",
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.applyThemeUi(this.currentTheme);
  }

  createGameOverPanel() {
    this.gameOverPanel = this.add
      .container(this.scale.width / 2, this.scale.height / 2)
      .setDepth(25)
      .setScrollFactor(0)
      .setVisible(false);

    const panelBg = this.add.rectangle(0, 0, 340, 180, 0x071421, 0.88);
    panelBg.setStrokeStyle(2, 0xffd166, 0.9);

    const panelTitle = this.add.text(0, -38, "Koniec biegu", {
      ...HUD_TEXT_STYLE,
      fontSize: "34px",
    });
    panelTitle.setOrigin(0.5);

    this.gameOverScore = this.add.text(0, 8, "", {
      ...HUD_TEXT_STYLE,
      fontSize: "20px",
      color: "#b7d0e6",
    });
    this.gameOverScore.setOrigin(0.5);

    const panelHint = this.add.text(0, 56, "Nacisnij R albo kliknij, by zagrac jeszcze raz", {
      ...HUD_TEXT_STYLE,
      fontSize: "18px",
      color: "#ffd166",
    });
    panelHint.setOrigin(0.5);

    this.gameOverPanel.add([panelBg, panelTitle, this.gameOverScore, panelHint]);
  }

  createBackdrop() {
    this.backdropDots = [];
    this.backdropStripes = [];
    this.backdropSky = this.add.rectangle(
      this.scale.width / 2,
      -50000,
      this.scale.width,
      52000,
      this.currentTheme.skyColor
    );
    this.backdropSky.setOrigin(0.5, 0);

    this.backdropGlow = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        this.currentTheme.glowColor,
        this.currentTheme.glowAlpha
      )
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(-5);

    for (let i = 0; i < 80; i += 1) {
      const variant = i % 3 === 0 ? "primary" : "secondary";
      const alpha = Phaser.Math.FloatBetween(0.25, 0.8);
      const dot = this.add.circle(
        Phaser.Math.Between(20, this.scale.width - 20),
        Phaser.Math.Between(-48000, this.scale.height),
        Phaser.Math.Between(1, 3),
        variant === "primary" ? this.currentTheme.dotPrimary : this.currentTheme.dotSecondary,
        alpha
      );
      dot.setScrollFactor(0.15 + (i % 4) * 0.08);
      this.backdropDots.push({ dot, variant, alpha });
    }

    for (let i = 0; i < 14; i += 1) {
      const alpha = this.currentTheme.stripeAlpha;
      const stripe = this.add.rectangle(
        Phaser.Math.Between(20, this.scale.width - 20),
        START_Y - i * 440,
        Phaser.Math.Between(100, 220),
        8,
        this.currentTheme.stripeColor,
        alpha
      );
      stripe.angle = Phaser.Math.Between(-20, 20);
      stripe.setScrollFactor(0.3);
      this.backdropStripes.push({ stripe, alpha });
    }
  }

  populateStartingPlatforms() {
    this.addPlatform(this.scale.width / 2, START_Y, 220, {
      breakable: false,
      breakDelay: 999,
    });
    let y = START_Y - 120;
    for (let i = 0; i < 18; i += 1) {
      const profile = this.getDifficultyProfileForY(y);
      const width = Phaser.Math.Between(profile.widthMin, profile.widthMax);
      const x = this.pickReachablePlatformX(width, profile);
      this.addPlatform(x, y, width, profile);
      y -= Phaser.Math.Between(profile.verticalMin, profile.verticalMax);
    }
    this.highestPlatformY = y;
  }

  addPlatform(x, y, width, profile = this.getDifficultyProfileForY(y)) {
    const platform = this.platforms.create(x, y, PLATFORM_TEXTURE_KEYS.solid);
    platform.displayWidth = width;
    platform.displayHeight = 22;
    platform.refreshBody();
    platform.breakable = profile.breakable !== false;
    platform.breakDelay = profile.breakDelay ?? 999;
    platform.breakTimer = platform.breakDelay;
    platform.breakProgress = 0;
    platform.breakStarted = false;
    platform.breakArmed = false;
    platform.isBroken = false;
    platform.currentCrackStage = -1;
    platform.body.checkCollision.none = false;
    this.applyPlatformVisual(platform, this.currentPlatformTint);
    this.lastPlatformX = x;
    this.lastPlatformWidth = width;
    return platform;
  }

  extendTower() {
    const threshold = this.cameras.main.scrollY - GENERATION_BUFFER;
    let generatedPlatforms = 0;

    while (this.highestPlatformY > threshold && generatedPlatforms < 5) {
      const profile = this.getDifficultyProfileForY(this.highestPlatformY);
      this.highestPlatformY -= Phaser.Math.Between(profile.verticalMin, profile.verticalMax);
      const nextProfile = this.getDifficultyProfileForY(this.highestPlatformY);
      const width = Phaser.Math.Between(nextProfile.widthMin, nextProfile.widthMax);
      const x = this.pickReachablePlatformX(width, nextProfile);
      this.addPlatform(x, this.highestPlatformY, width, nextProfile);
      generatedPlatforms += 1;
    }
  }

  pickReachablePlatformX(width, profile = this.getDifficultyProfileForY(this.highestPlatformY)) {
    const halfWidth = width / 2;
    const minX = halfWidth + 16;
    const maxX = this.scale.width - halfWidth - 16;
    const previousHalfWidth = this.lastPlatformWidth / 2;
    const maxCenterDelta =
      previousHalfWidth + halfWidth + Math.max(MAX_PLATFORM_EDGE_GAP, profile.edgeGap);
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
        if (platform === this.currentStandingPlatform) {
          this.currentStandingPlatform = null;
        }
        platform.destroy();
      }
    });
  }

  maintainPlatforms() {
    if (this.platformMaintenanceTimer > 0) {
      return;
    }

    this.extendTower();
    this.cleanupPlatforms();
    this.platformMaintenanceTimer = 0.1;
  }

  applyHorizontalMovement(leftPressed, rightPressed, dt) {
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
    const speedSmoothing = 1 - Math.exp(-12 * dt);
    this.runSpeed = Phaser.Math.Linear(
      this.runSpeed,
      Math.abs(this.player.body.velocity.x),
      speedSmoothing
    );
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
    this.currentStandingPlatform = null;
    this.cameras.main.shake(110, 0.0028);
  }

  handlePlatformLanding(player) {
    if (player.body.velocity.y > 60) {
      this.cameras.main.shake(70, 0.0012);
    }
  }

  shouldCollideWithPlatform(player, platform) {
    return player.body.velocity.y >= -10 && player.body.bottom <= platform.body.top + 18;
  }

  updatePlayerAppearance() {
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const speed = Math.abs(this.player.body.velocity.x);
    const risingFast = this.player.body.velocity.y < -860;
    let textureKey = PLAYER_TEXTURE_KEYS.idle;

    if (!onGround) {
      if (this.wallCoyoteTime > 0 && this.player.body.velocity.y > 40) {
        textureKey = PLAYER_TEXTURE_KEYS.wall;
      } else if (this.player.body.velocity.y < -120) {
        textureKey = PLAYER_TEXTURE_KEYS.jump;
      } else {
        textureKey = PLAYER_TEXTURE_KEYS.fall;
      }
    } else if (speed > 120) {
      textureKey =
        Math.floor(this.time.now / 90) % 2 === 0
          ? PLAYER_TEXTURE_KEYS.runA
          : PLAYER_TEXTURE_KEYS.runB;
    }

    if (textureKey !== this.currentPlayerTextureKey) {
      this.player.setTexture(textureKey);
      this.currentPlayerTextureKey = textureKey;
    }

    const facingLeft = this.player.body.velocity.x < -10;
    if (facingLeft !== this.currentPlayerFacingLeft) {
      this.player.setFlipX(facingLeft);
      this.currentPlayerFacingLeft = facingLeft;
    }

    const nextAngle = Phaser.Math.Clamp(this.player.body.velocity.x * 0.035, -8, 8);
    if (Math.abs(nextAngle - this.currentPlayerAngle) > 0.1) {
      this.player.setAngle(nextAngle);
      this.currentPlayerAngle = nextAngle;
    }

    const nextTint = risingFast ? 0xfff0ad : 0xffffff;
    if (nextTint !== this.currentPlayerTint) {
      this.player.setTint(nextTint);
      this.currentPlayerTint = nextTint;
    }
  }

  updateCamera(dt) {
    const targetTop = Math.min(this.currentCameraTop, this.player.y - this.scale.height * 0.62);
    const cameraLerp = 1 - Math.exp(-8 * dt);
    this.currentCameraTop = Phaser.Math.Linear(this.currentCameraTop, targetTop, cameraLerp);
    this.cameras.main.scrollY = this.currentCameraTop;
  }

  updateScore() {
    this.bestHeight = Math.max(this.bestHeight, START_Y - this.player.y);
    const meters = Math.max(0, Math.floor(this.bestHeight / 12));
    if (meters !== this.displayedMeters) {
      this.scoreText.setText(`${meters} m`);
      this.displayedMeters = meters;
    }
  }

  updateCrumblingPlatforms(dt, onGround) {
    const standingPlatform = onGround ? this.findStandingPlatform() : null;
    this.currentStandingPlatform = standingPlatform && !standingPlatform.isBroken ? standingPlatform : null;
    const autoBreakTargets = this.getAutoBreakTargets();

    this.platforms.children.each((platform) => {
      if (!platform.active || platform.isBroken || !platform.breakable) {
        return;
      }

      if (!platform.breakArmed && autoBreakTargets.includes(platform)) {
        platform.breakArmed = true;
      }

      if (!platform.breakArmed) {
        return;
      }

      const standingOnPlatform = platform === this.currentStandingPlatform;
      const breakMultiplier = standingOnPlatform
        ? PLATFORM_STAND_BREAK_MULTIPLIER
        : PLATFORM_AUTO_BREAK_MULTIPLIER;

      platform.breakStarted = true;
      platform.breakTimer = Math.max(0, platform.breakTimer - dt * breakMultiplier);
      platform.breakProgress =
        1 - platform.breakTimer / Math.max(platform.breakDelay, 0.001);
      this.applyPlatformVisual(platform, this.currentPlatformTint);

      if (platform.breakTimer <= 0) {
        this.breakPlatform(platform);
      }
    });
  }

  getAutoBreakTargets() {
    const candidates = [];

    this.platforms.children.each((platform) => {
      if (!platform.active || platform.isBroken || !platform.breakable) {
        return;
      }

      const verticalDistance = this.player.y - platform.y;
      const inFrontOfPlayer = verticalDistance > 24;
      const inLookaheadRange = verticalDistance <= PLATFORM_AUTO_BREAK_LOOKAHEAD;
      const inVisibleBand = platform.y >= this.cameras.main.scrollY - 40;

      if (inFrontOfPlayer && inLookaheadRange && inVisibleBand) {
        candidates.push({ platform, verticalDistance });
      }
    });

    candidates.sort((a, b) => a.verticalDistance - b.verticalDistance);
    return candidates.slice(0, PLATFORM_AUTO_BREAK_TARGETS).map(({ platform }) => platform);
  }

  findStandingPlatform() {
    const playerBottom = this.player.body.bottom;
    const playerCenterX = this.player.body.center.x;
    let found = null;

    this.platforms.children.each((platform) => {
      if (found || !platform.active || platform.isBroken) {
        return;
      }

      const platformTop = platform.body.top;
      const withinVertical = Math.abs(playerBottom - platformTop) <= 18;
      const withinHorizontal =
        playerCenterX >= platform.body.left - 6 && playerCenterX <= platform.body.right + 6;

      if (withinVertical && withinHorizontal) {
        found = platform;
      }
    });

    return found;
  }

  breakPlatform(platform) {
    if (!platform || platform.isBroken) {
      return;
    }

    platform.isBroken = true;
    platform.breakProgress = 1;
    platform.body.enable = false;
    platform.setAlpha(0.18);
    platform.setTexture(PLATFORM_TEXTURE_KEYS.crackHeavy);

    if (platform === this.currentStandingPlatform) {
      this.currentStandingPlatform = null;
    }

    this.tweens.add({
      targets: platform,
      alpha: 0,
      angle: Phaser.Math.Between(-10, 10),
      duration: 140,
      onComplete: () => {
        if (platform.active) {
          platform.destroy();
        }
      },
    });
  }

  updateThemeByHeight() {
    const meters = Math.max(0, Math.floor(this.bestHeight / 12));
    const nextThemeIndex = this.getThemeIndexForMeters(meters);
    if (nextThemeIndex !== this.currentThemeIndex) {
      this.transitionToTheme(nextThemeIndex);
    }
  }

  getThemeIndexForMeters(meters) {
    let index = 0;
    for (let i = 0; i < LEVEL_THEMES.length; i += 1) {
      if (meters >= LEVEL_THEMES[i].minMeters) {
        index = i;
      }
    }
    return index;
  }

  transitionToTheme(nextThemeIndex) {
    const fromTheme = this.currentTheme;
    const nextTheme = LEVEL_THEMES[nextThemeIndex];

    this.currentThemeIndex = nextThemeIndex;
    this.currentTheme = nextTheme;
    this.applyThemeUi(nextTheme);

    if (this.themeTransition) {
      this.themeTransition.stop();
    }

    this.themeTransition = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 700,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this.applyThemeBlend(fromTheme, nextTheme, tween.getValue());
      },
      onComplete: () => {
        this.applyThemeBlend(nextTheme, nextTheme, 1);
        this.themeTransition = null;
      },
    });
  }

  applyThemeUi(theme) {
    if (this.themeText) {
      this.themeText.setText(theme.name);
      this.themeText.setTint(theme.uiTint);
    }

    if (this.scoreText) {
      this.scoreText.setTint(0xffffff);
    }

    if (this.hintText) {
      this.hintText.setTint(theme.uiTint);
    }
  }

  applyThemeBlend(fromTheme, toTheme, progress) {
    const skyColor = this.interpolateColor(fromTheme.skyColor, toTheme.skyColor, progress);
    const glowColor = this.interpolateColor(fromTheme.glowColor, toTheme.glowColor, progress);
    const platformTint = this.interpolateColor(
      fromTheme.platformTint,
      toTheme.platformTint,
      progress
    );
    const stripeColor = this.interpolateColor(
      fromTheme.stripeColor,
      toTheme.stripeColor,
      progress
    );
    const dotPrimary = this.interpolateColor(
      fromTheme.dotPrimary,
      toTheme.dotPrimary,
      progress
    );
    const dotSecondary = this.interpolateColor(
      fromTheme.dotSecondary,
      toTheme.dotSecondary,
      progress
    );
    const stripeAlpha = Phaser.Math.Linear(fromTheme.stripeAlpha, toTheme.stripeAlpha, progress);
    const glowAlpha = Phaser.Math.Linear(fromTheme.glowAlpha, toTheme.glowAlpha, progress);
    this.currentPlatformTint = platformTint;

    this.backdropSky.setFillStyle(skyColor, 1);

    if (this.backdropGlow) {
      this.backdropGlow.setFillStyle(glowColor, glowAlpha);
    }

    this.backdropDots.forEach(({ dot, variant, alpha }) => {
      dot.setFillStyle(variant === "primary" ? dotPrimary : dotSecondary, alpha);
    });

    this.backdropStripes.forEach(({ stripe }) => {
      stripe.setFillStyle(stripeColor, stripeAlpha);
    });

    this.platforms.children.each((platform) => {
      this.applyPlatformVisual(platform, platformTint);
    });
  }

  interpolateColor(fromColor, toColor, progress) {
    const from = Phaser.Display.Color.IntegerToColor(fromColor);
    const to = Phaser.Display.Color.IntegerToColor(toColor);

    return Phaser.Display.Color.GetColor(
      Phaser.Math.Linear(from.red, to.red, progress),
      Phaser.Math.Linear(from.green, to.green, progress),
      Phaser.Math.Linear(from.blue, to.blue, progress)
    );
  }

  applyPlatformVisual(platform, baseTint) {
    if (!platform || !platform.active) {
      return;
    }

    if (!platform.breakable) {
      if (platform.currentCrackStage !== 0) {
        platform.setTexture(PLATFORM_TEXTURE_KEYS.solid);
        platform.currentCrackStage = 0;
      }
      platform.setTint(baseTint);
      platform.setAlpha(1);
      return;
    }

    const progress = Phaser.Math.Clamp(platform.breakProgress || 0, 0, 1);
    const crackStage =
      progress > 0.78 ? 3 : progress > 0.5 ? 2 : progress > 0.24 ? 1 : 0;
    const textureKey =
      crackStage === 3
        ? PLATFORM_TEXTURE_KEYS.crackHeavy
        : crackStage === 2
          ? PLATFORM_TEXTURE_KEYS.crackMedium
          : crackStage === 1
            ? PLATFORM_TEXTURE_KEYS.crackLight
            : PLATFORM_TEXTURE_KEYS.solid;
    const alpha = Phaser.Math.Linear(1, 0.74, progress);

    if (platform.currentCrackStage !== crackStage) {
      platform.setTexture(textureKey);
      platform.currentCrackStage = crackStage;
    }

    platform.setTint(baseTint);
    platform.setAlpha(alpha);
  }

  getDifficultyProfileForY(y) {
    const meters = Math.max(0, (START_Y - y) / 12);
    const progress = Phaser.Math.Clamp(meters / 650, 0, 1);

    return {
      widthMin: Math.round(Phaser.Math.Linear(112, 78, progress)),
      widthMax: Math.round(Phaser.Math.Linear(176, 128, progress)),
      verticalMin: Math.round(Phaser.Math.Linear(92, 104, progress)),
      verticalMax: Math.round(Phaser.Math.Linear(126, 150, progress)),
      edgeGap: Math.round(Phaser.Math.Linear(52, 90, progress)),
      breakDelay: Phaser.Math.Linear(4.2, 2.2, progress),
      breakable: meters >= 20,
    };
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

    if (this.backdropGlow) {
      this.backdropGlow.setPosition(gameSize.width / 2, gameSize.height / 2);
      this.backdropGlow.setDisplaySize(gameSize.width, gameSize.height);
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
