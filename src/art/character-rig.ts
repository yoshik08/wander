export interface CharacterParams {
  position: { x: number; y: number };
  direction: number; // angle in radians, 0 pointing right, increasing counter-clockwise? We'll use standard: 0 = right, PI/2 = up, etc.
  animation: 'idle' | 'walk' | 'run';
  frame: number; // current frame index (0 to frames-1)
  scale: number; // scale factor for the character
  color: string; // main color of the character
  scarfColor: string; // color of the scarf
  wind?: { dx: number; dy: number }; // wind vector at character's position
}

export function drawCharacter(ctx: CanvasRenderingContext2D, params: CharacterParams) {
  const { position, direction, animation, frame, scale, color, scarfColor, wind } = params;

  // Save context
  ctx.save();

  // Translate to position
  ctx.translate(position.x, position.y);

  // Rotate by direction (so that the character faces the direction of movement)
  ctx.rotate(direction);

  // Scale
  ctx.scale(scale, scale);

  // Draw body parts
  // We'll draw a simple character: head, torso, arms, legs, and scarf

  // Colors
  const skinColor = '#F5D0A9'; // placeholder
  const shirtColor = color;
  const pantsColor = '#4A4A4A';
  const shoeColor = '#2A2A2A';

  // Base sizes (in pixels, before scaling)
  const headRadius = 4;
  const torsoWidth = 6;
  const torsoHeight = 8;
  const armLength = 6;
  const legLength = 8;

  // Animation offsets
  let armSwing = 0;
  let legSwing = 0;
  let headBob = 0;
  let scarfOffset = 0;
  let scarfWindSway = 0; // additional sway from wind

  switch (animation) {
    case 'idle':
      // Breathing: slow up and down
      headBob = Math.sin(performance.now() * 0.002) * 0.5;
      // Scarf flutter
      scarfOffset = Math.sin(performance.now() * 0.003) * 0.5;
      break;
    case 'walk':
      // Arm and leg swing
      const walkCycle = (frame % 24) / 24; // 24 frames per cycle
      armSwing = Math.sin(walkCycle * Math.PI * 2) * 0.5;
      legSwing = Math.sin((walkCycle + 0.5) * Math.PI * 2) * 0.5;
      // Scarf follows movement with some delay
      scarfOffset = Math.sin(walkCycle * Math.PI * 2 + Math.PI * 0.2) * 0.3;
      break;
    case 'run':
      // Faster arm and leg swing
      const runCycle = (frame % 16) / 16; // 16 frames per cycle
      armSwing = Math.sin(runCycle * Math.PI * 2) * 0.8;
      legSwing = Math.sin((runCycle + 0.5) * Math.PI * 2) * 0.8;
      // Scarf flows behind
      scarfOffset = Math.sin(runCycle * Math.PI * 2 + Math.PI * 0.1) * 0.5;
      break;
  }

  // Add wind sway to scarf
  if (wind) {
    const windAngle = Math.atan2(wind.dy, wind.dx);
    // Scarf sways in the wind direction
    scarfWindSway = Math.sin(performance.now() * 0.005) * 0.3 * Math.abs(wind.dx + wind.dy); // simple
  }

  // Draw scarf (trailing from the neck)
  ctx.beginPath();
  ctx.moveTo(0, -headRadius - 2); // base of the scarf at the neck
  // Control points for a curved scarf, with wind sway
  const scarfLength = 10;
  const scarfWave = scarfOffset + scarfWindSway;
  ctx.bezierCurveTo(
    -2, -headRadius - 2 - scarfLength * 0.3 + scarfWave,
    2, -headRadius - 2 - scarfLength * 0.6 + scarfWave * 0.5,
    0, -headRadius - 2 - scarfLength
  );
  ctx.strokeStyle = scarfColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw head
  ctx.beginPath();
  ctx.arc(0, -headRadius - 2, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Draw torso
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-torsoWidth / 2, -headRadius - 2, torsoWidth, torsoHeight);

  // Draw arms
  ctx.save();
  ctx.translate(-torsoWidth / 2, -headRadius - 2 + torsoHeight * 0.3); // shoulder left
  ctx.rotate(armSwing * 0.5); // swing arm
  ctx.fillStyle = shirtColor;
  ctx.fillRect(0, -1, armLength, 2);
  ctx.restore();

  ctx.save();
  ctx.translate(torsoWidth / 2, -headRadius - 2 + torsoHeight * 0.3); // shoulder right
  ctx.rotate(-armSwing * 0.5);
  ctx.fillStyle = shirtColor;
  ctx.fillRect(0, -1, armLength, 2);
  ctx.restore();

  // Draw legs
  ctx.save();
  ctx.translate(-torsoWidth / 4, -headRadius - 2 + torsoHeight); // hip left
  ctx.rotate(legSwing * 0.5);
  ctx.fillStyle = pantsColor;
  ctx.fillRect(0, -1, legLength, 2);
  ctx.restore();

  ctx.save();
  ctx.translate(torsoWidth / 4, -headRadius - 2 + torsoHeight); // hip right
  ctx.rotate(-legSwing * 0.5);
  ctx.fillStyle = pantsColor;
  ctx.fillRect(0, -1, legLength, 2);
  ctx.restore();

  // Draw shoes
  ctx.save();
  ctx.translate(-torsoWidth / 4 + legLength, -headRadius - 2 + torsoHeight); // left shoe
  ctx.fillStyle = shoeColor;
  ctx.fillRect(0, -1, 2, 2);
  ctx.restore();

  ctx.save();
  ctx.translate(torsoWidth / 4 + legLength, -headRadius - 2 + torsoHeight); // right shoe
  ctx.fillStyle = shoeColor;
  ctx.fillRect(0, -1, 2, 2);
  ctx.restore();

  // Restore context
  ctx.restore();
}