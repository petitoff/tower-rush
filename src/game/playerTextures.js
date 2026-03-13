import { PLATFORM_TEXTURE_KEYS, PLAYER_POSES, PLAYER_TEXTURE_KEYS } from "./constants.js";

export function ensurePlayerTextures(scene) {
  if (scene.textures.exists(PLAYER_TEXTURE_KEYS.idle)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  drawPlayerTexture(graphics, PLAYER_TEXTURE_KEYS.idle, PLAYER_POSES.idle);
  drawPlayerTexture(graphics, PLAYER_TEXTURE_KEYS.runA, PLAYER_POSES.runA);
  drawPlayerTexture(graphics, PLAYER_TEXTURE_KEYS.runB, PLAYER_POSES.runB);
  drawPlayerTexture(graphics, PLAYER_TEXTURE_KEYS.jump, PLAYER_POSES.jump);
  drawPlayerTexture(graphics, PLAYER_TEXTURE_KEYS.fall, PLAYER_POSES.fall);
  drawPlayerTexture(graphics, PLAYER_TEXTURE_KEYS.wall, PLAYER_POSES.wall);

  drawPlatformTexture(graphics, PLATFORM_TEXTURE_KEYS.solid, 0);
  drawPlatformTexture(graphics, PLATFORM_TEXTURE_KEYS.crackLight, 1);
  drawPlatformTexture(graphics, PLATFORM_TEXTURE_KEYS.crackMedium, 2);
  drawPlatformTexture(graphics, PLATFORM_TEXTURE_KEYS.crackHeavy, 3);
  graphics.destroy();
}

function drawPlatformTexture(graphics, key, crackStage) {
  graphics.clear();
  graphics.fillStyle(0xf4f7fb, 1);
  graphics.fillRoundedRect(0, 0, 160, 22, 11);
  graphics.fillStyle(0xa7d6f1, 1);
  graphics.fillRoundedRect(6, 5, 148, 10, 5);

  if (crackStage > 0) {
    graphics.lineStyle(2, 0x577590, 0.55 + crackStage * 0.12);
    strokeCrack(graphics, [
      [34, 6],
      [46, 10],
      [58, 7],
      [70, 15],
      [83, 11],
    ]);
  }

  if (crackStage > 1) {
    graphics.lineStyle(2, 0x42566f, 0.72);
    strokeCrack(graphics, [
      [104, 5],
      [96, 11],
      [112, 14],
      [124, 9],
      [138, 16],
    ]);
    graphics.fillStyle(0xcfd8e3, 0.75);
    graphics.fillTriangle(71, 15, 80, 16, 76, 21);
  }

  if (crackStage > 2) {
    graphics.lineStyle(2.5, 0x31445c, 0.9);
    strokeCrack(graphics, [
      [20, 14],
      [31, 10],
      [43, 16],
      [55, 12],
      [67, 18],
    ]);
    strokeCrack(graphics, [
      [118, 6],
      [126, 12],
      [136, 8],
      [145, 15],
    ]);
    graphics.fillStyle(0xc3cfdd, 0.85);
    graphics.fillTriangle(116, 16, 126, 15, 121, 21);
    graphics.fillTriangle(46, 16, 54, 16, 50, 21);
  }

  graphics.generateTexture(key, 160, 22);
}

function strokeCrack(graphics, points) {
  graphics.beginPath();
  graphics.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    graphics.lineTo(points[i][0], points[i][1]);
  }
  graphics.strokePath();
}

function drawPlayerTexture(graphics, key, pose) {
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

  drawLimb(
    pose.legLeft.x,
    pose.legLeft.y,
    pose.legLeft.w,
    pose.legLeft.h,
    pose.legLeft.angle,
    boot
  );
  drawLimb(
    pose.legRight.x,
    pose.legRight.y,
    pose.legRight.w,
    pose.legRight.h,
    pose.legRight.angle,
    boot
  );
  drawLimb(
    pose.armLeft.x,
    pose.armLeft.y,
    pose.armLeft.w,
    pose.armLeft.h,
    pose.armLeft.angle,
    glove
  );
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
