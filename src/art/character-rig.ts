export interface CharacterParams {
  position: { x: number; y: number };
  direction: number; // angle in radians, 0 pointing right
  animation: 'idle' | 'walk' | 'run';
  frame: number; // current frame index
  scale: number; // scale factor
  color: string; // main jacket color
  scarfColor: string; // scarf color
  wind?: { dx: number; dy: number }; // wind vector
}

export function drawCharacter(ctx: CanvasRenderingContext2D, params: CharacterParams) {
  const { position, direction, animation, frame, scale, color, scarfColor, wind } = params;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.scale(scale, scale);

  const time = performance.now();

  // Animation cycle calculations
  let walkCycle = 0;
  let legSwing = 0;
  let armSwing = 0;
  let bodyBob = 0;

  if (animation === 'walk') {
    walkCycle = (frame % 24) / 24;
    legSwing = Math.sin(walkCycle * Math.PI * 2);
    armSwing = Math.sin(walkCycle * Math.PI * 2);
    bodyBob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * -1.2;
  } else if (animation === 'run') {
    walkCycle = (frame % 16) / 16;
    legSwing = Math.sin(walkCycle * Math.PI * 2) * 1.4;
    armSwing = Math.sin(walkCycle * Math.PI * 2) * 1.4;
    bodyBob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * -2.0;
  } else {
    // Idle breathing
    bodyBob = Math.sin(time * 0.003) * 0.5;
  }

  // Facing direction (8-way or 4-way classification)
  // Normalize direction to [-PI, PI]
  let angle = direction;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;

  // Classify cardinal/diagonal orientation
  const isFacingDown = angle > Math.PI * 0.25 && angle < Math.PI * 0.75;
  const isFacingUp = angle < -Math.PI * 0.25 && angle > -Math.PI * 0.75;
  const isFacingRight = Math.abs(angle) <= Math.PI * 0.25;
  const isFacingLeft = Math.abs(angle) >= Math.PI * 0.75;

  const facingX = Math.cos(angle);
  const facingY = Math.sin(angle);

  // Colors
  const skinColor = '#FBD3B0';
  const hairColor = '#3E2A1E';
  const pantsColor = '#374151';
  const shoeColor = '#4A3728';
  const backpackColor = '#7C4A28';

  // 1. Drop shadow on grass under feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Legs & Shoes (drawn around feet origin y = 0)
  const leftLegOffset = (isFacingUp || isFacingDown) ? legSwing * 2 : facingX * legSwing * 2;
  const rightLegOffset = (isFacingUp || isFacingDown) ? -legSwing * 2 : -facingX * legSwing * 2;

  if (isFacingRight || isFacingLeft) {
    // Side profile legs
    const flip = isFacingLeft ? -1 : 1;
    // Back leg
    ctx.fillStyle = '#28303C';
    ctx.fillRect(-flip * 1 + -leftLegOffset * flip * 0.5, -5 + bodyBob, 2, 4);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-flip * 1 + -leftLegOffset * flip * 0.5, -2, 2.5, 2);

    // Front leg
    ctx.fillStyle = pantsColor;
    ctx.fillRect(leftLegOffset * flip * 0.5, -5 + bodyBob, 2, 4);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(leftLegOffset * flip * 0.5, -2, 2.5, 2);
  } else {
    // Front or Back legs
    // Left leg
    ctx.fillStyle = pantsColor;
    ctx.fillRect(-3, -5 + bodyBob + leftLegOffset * 0.5, 2, 4);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(-3.5, -1.5 + leftLegOffset * 0.5, 2.5, 2);

    // Right leg
    ctx.fillStyle = pantsColor;
    ctx.fillRect(1, -5 + bodyBob + rightLegOffset * 0.5, 2, 4);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(1, -1.5 + rightLegOffset * 0.5, 2.5, 2);
  }

  // 3. Torso / Jacket (y: -12 to -5)
  const torsoY = -12 + bodyBob;

  // Backpack (behind torso if facing down or side, on back if facing up)
  if (isFacingUp) {
    ctx.fillStyle = backpackColor;
    ctx.fillRect(-3, torsoY + 1, 6, 5);
    ctx.fillStyle = '#61381E';
    ctx.fillRect(-2, torsoY + 2, 4, 3);
  } else if (isFacingRight) {
    ctx.fillStyle = backpackColor;
    ctx.fillRect(-4.5, torsoY + 1, 2.5, 5);
  } else if (isFacingLeft) {
    ctx.fillStyle = backpackColor;
    ctx.fillRect(2, torsoY + 1, 2.5, 5);
  }

  // Main coat/jacket
  ctx.fillStyle = color;
  ctx.fillRect(-3.5, torsoY, 7, 7);
  // Coat highlight / trim
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(-3.5, torsoY, 7, 1.5);

  // Arms
  if (isFacingRight || isFacingLeft) {
    const flip = isFacingLeft ? -1 : 1;
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(flip * 0.5, torsoY + 2);
    ctx.rotate(armSwing * 0.5 * flip);
    ctx.fillRect(-1, 0, 2, 4.5);
    // Hand
    ctx.fillStyle = skinColor;
    ctx.fillRect(-0.5, 4.5, 1.5, 1.5);
    ctx.restore();
  } else {
    // Left arm
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(-4, torsoY + 1.5);
    ctx.rotate(-armSwing * 0.4);
    ctx.fillRect(-1, 0, 2, 4);
    ctx.fillStyle = skinColor;
    ctx.fillRect(-1, 4, 1.8, 1.5);
    ctx.restore();

    // Right arm
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(4, torsoY + 1.5);
    ctx.rotate(armSwing * 0.4);
    ctx.fillRect(-1, 0, 2, 4);
    ctx.fillStyle = skinColor;
    ctx.fillRect(-0.8, 4, 1.8, 1.5);
    ctx.restore();
  }

  // 4. Head & Face (y: -19 to -12)
  const headY = torsoY - 5.5;

  if (isFacingUp) {
    // Back of head
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(0, headY, 3.8, 0, Math.PI * 2);
    ctx.fill();
    // Cap back
    ctx.fillStyle = '#2C3E50';
    ctx.beginPath();
    ctx.arc(0, headY - 1, 3.5, Math.PI, 0);
    ctx.fill();
  } else if (isFacingRight || isFacingLeft) {
    // Side profile head
    const flip = isFacingLeft ? -1 : 1;
    // Hair back
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(-flip * 0.5, headY, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(flip * 1.0, headY, 3.0, 0, Math.PI * 2);
    ctx.fill();

    // Cap
    ctx.fillStyle = '#2C3E50';
    ctx.beginPath();
    ctx.arc(-flip * 0.5, headY - 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Cap visor/bill
    ctx.fillRect(flip > 0 ? 0 : -3.5, headY - 2, 3.5, 1.2);

    // Eye
    ctx.fillStyle = '#222222';
    ctx.fillRect(flip * 2, headY - 0.5, 1, 1.2);
    // Rosy cheek
    ctx.fillStyle = 'rgba(255, 120, 120, 0.5)';
    ctx.fillRect(flip * 1.5, headY + 1, 1.2, 1);
  } else {
    // Front face
    // Face base
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, headY, 3.6, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Cap
    ctx.fillStyle = '#2C3E50';
    ctx.beginPath();
    ctx.arc(0, headY - 1, 3.8, Math.PI, 0);
    ctx.fill();
    // Hair tufts peeking out
    ctx.fillStyle = hairColor;
    ctx.fillRect(-3.6, headY - 1.5, 1.2, 2.5);
    ctx.fillRect(2.4, headY - 1.5, 1.2, 2.5);

    // Eyes
    ctx.fillStyle = '#222222';
    ctx.fillRect(-1.8, headY - 0.5, 1, 1.5);
    ctx.fillRect(0.8, headY - 0.5, 1, 1.5);

    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 120, 120, 0.45)';
    ctx.fillRect(-2.5, headY + 1.2, 1.5, 0.8);
    ctx.fillRect(1.0, headY + 1.2, 1.5, 0.8);
  }

  // 5. Scarf (wraps neck and trails in wind)
  // Scarf collar around neck
  ctx.fillStyle = scarfColor;
  ctx.beginPath();
  ctx.ellipse(0, torsoY - 0.5, 3.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scarf tail waving in wind and motion
  const windDx = wind ? wind.dx : 0;
  const windDy = wind ? wind.dy : 0;
  // Tail opposes motion and follows wind
  const trailDx = -facingX * 4 + windDx * 0.4 + Math.sin(time * 0.008) * 1.5;
  const trailDy = -facingY * 2 + windDy * 0.4 + Math.cos(time * 0.008) * 1.2;

  ctx.strokeStyle = scarfColor;
  ctx.lineWidth = 2.0;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(facingX > 0 ? -1.5 : 1.5, torsoY - 0.5);
  ctx.quadraticCurveTo(
    (facingX > 0 ? -3 : 3) + trailDx * 0.5,
    torsoY + trailDy * 0.5,
    (facingX > 0 ? -4 : 4) + trailDx,
    torsoY + 2 + trailDy
  );
  ctx.stroke();

  ctx.restore();
}