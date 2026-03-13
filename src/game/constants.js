export const BASE_GAME_WIDTH = 540;
export const BASE_GAME_HEIGHT = 960;
export const START_Y = 840;
export const GENERATION_BUFFER = 2200;
export const FALL_LIMIT = 280;
export const WALL_JUMP_COYOTE = 0.16;
export const WALL_JUMP_LOCK = 0.15;
export const WALL_SLIDE_SPEED = 260;
export const MAX_PLATFORM_EDGE_GAP = 52;
export const PLATFORM_AUTO_BREAK_LOOKAHEAD = 240;
export const PLATFORM_AUTO_BREAK_TARGETS = 2;
export const PLATFORM_AUTO_BREAK_MULTIPLIER = 0.32;
export const PLATFORM_STAND_BREAK_MULTIPLIER = 1.8;

export const PLAYER_TEXTURE_KEYS = {
  idle: "player-idle",
  runA: "player-run-a",
  runB: "player-run-b",
  jump: "player-jump",
  fall: "player-fall",
  wall: "player-wall",
};

export const FX_TEXTURE_KEYS = {
  flame: "fx-boost-flame",
  burst: "fx-boost-burst",
};

export const PLATFORM_TEXTURE_KEYS = {
  solid: "platform",
  crackLight: "platform-crack-1",
  crackMedium: "platform-crack-2",
  crackHeavy: "platform-crack-3",
};

export const HUD_TEXT_STYLE = {
  fontFamily: "Trebuchet MS, sans-serif",
  color: "#f7fbff",
};

export const LEVEL_THEMES = [
  {
    minMeters: 0,
    name: "Portowy Zmierzch",
    skyColor: 0x12304d,
    glowColor: 0xf4d35e,
    glowAlpha: 0.08,
    dotPrimary: 0xffd166,
    dotSecondary: 0xd8f3ff,
    stripeColor: 0xffffff,
    stripeAlpha: 0.05,
    platformTint: 0xf4f7fb,
    uiTint: 0xffd166,
  },
  {
    minMeters: 90,
    name: "Neonowa Mgla",
    skyColor: 0x291447,
    glowColor: 0xff5ea8,
    glowAlpha: 0.1,
    dotPrimary: 0xff8fab,
    dotSecondary: 0x72ddf7,
    stripeColor: 0xff99c8,
    stripeAlpha: 0.07,
    platformTint: 0xf8d0ff,
    uiTint: 0xff8fab,
  },
  {
    minMeters: 210,
    name: "Polarna Aurora",
    skyColor: 0x0d3b36,
    glowColor: 0x6fffe9,
    glowAlpha: 0.12,
    dotPrimary: 0x95f9e3,
    dotSecondary: 0xf4f1bb,
    stripeColor: 0x9bf6ff,
    stripeAlpha: 0.09,
    platformTint: 0xe6fff9,
    uiTint: 0x95f9e3,
  },
  {
    minMeters: 360,
    name: "Stratosfera",
    skyColor: 0x1d3557,
    glowColor: 0xa8dadc,
    glowAlpha: 0.14,
    dotPrimary: 0xf1faee,
    dotSecondary: 0xa8dadc,
    stripeColor: 0xcdb4db,
    stripeAlpha: 0.08,
    platformTint: 0xe9f5ff,
    uiTint: 0xa8dadc,
  },
  {
    minMeters: 560,
    name: "Orbita",
    skyColor: 0x050816,
    glowColor: 0x7b2cbf,
    glowAlpha: 0.18,
    dotPrimary: 0xffffff,
    dotSecondary: 0x9d4edd,
    stripeColor: 0xbde0fe,
    stripeAlpha: 0.11,
    platformTint: 0xdfe7fd,
    uiTint: 0xbde0fe,
  },
];

export const PLAYER_POSES = {
  idle: {
    armLeft: { x: 13, y: 36, w: 10, h: 20, angle: -12 },
    armRight: { x: 41, y: 36, w: 10, h: 20, angle: 10 },
    legLeft: { x: 23, y: 56, w: 10, h: 18, angle: 0 },
    legRight: { x: 37, y: 56, w: 10, h: 18, angle: 0 },
    bodyTilt: 0,
    scarfTail: -5,
    eyeOffsetY: 0,
  },
  runA: {
    armLeft: { x: 14, y: 37, w: 10, h: 20, angle: -38 },
    armRight: { x: 41, y: 35, w: 10, h: 20, angle: 28 },
    legLeft: { x: 24, y: 58, w: 10, h: 18, angle: 26 },
    legRight: { x: 37, y: 56, w: 10, h: 18, angle: -24 },
    bodyTilt: -5,
    scarfTail: -12,
    eyeOffsetY: -1,
  },
  runB: {
    armLeft: { x: 13, y: 35, w: 10, h: 20, angle: 24 },
    armRight: { x: 42, y: 37, w: 10, h: 20, angle: -36 },
    legLeft: { x: 24, y: 56, w: 10, h: 18, angle: -22 },
    legRight: { x: 37, y: 58, w: 10, h: 18, angle: 26 },
    bodyTilt: 5,
    scarfTail: 8,
    eyeOffsetY: 1,
  },
  jump: {
    armLeft: { x: 14, y: 31, w: 10, h: 20, angle: -58 },
    armRight: { x: 41, y: 31, w: 10, h: 20, angle: 54 },
    legLeft: { x: 25, y: 58, w: 10, h: 16, angle: -16 },
    legRight: { x: 36, y: 58, w: 10, h: 16, angle: 16 },
    bodyTilt: 0,
    scarfTail: -16,
    eyeOffsetY: -1,
  },
  fall: {
    armLeft: { x: 13, y: 39, w: 10, h: 20, angle: 26 },
    armRight: { x: 41, y: 39, w: 10, h: 20, angle: -24 },
    legLeft: { x: 24, y: 58, w: 10, h: 18, angle: 10 },
    legRight: { x: 37, y: 58, w: 10, h: 18, angle: -10 },
    bodyTilt: 0,
    scarfTail: 10,
    eyeOffsetY: 1,
  },
  wall: {
    armLeft: { x: 12, y: 35, w: 10, h: 20, angle: -72 },
    armRight: { x: 42, y: 36, w: 10, h: 20, angle: 12 },
    legLeft: { x: 24, y: 58, w: 10, h: 17, angle: -10 },
    legRight: { x: 37, y: 58, w: 10, h: 17, angle: 28 },
    bodyTilt: -8,
    scarfTail: -9,
    eyeOffsetY: 0,
  },
};
