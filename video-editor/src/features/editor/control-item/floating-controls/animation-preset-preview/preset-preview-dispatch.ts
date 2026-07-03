const CUSTOM_TEXT_ANIMATION_KEYS = new Set([
  "typeWriterIn", "typeWriterOut",
  "animatedTextIn", "animatedTextOut",
  "sunnyMorningsAnimationIn", "sunnyMorningsAnimationOut",
  "dominoDreamsIn", "dominoDreamsAnimationOut",
  "greatThinkersAnimationIn", "greatThinkersAnimationOut",
  "beautifulQuestionsAnimationIn", "beautifulQuestionsAnimationOut",
  "madeWithLoveAnimationIn", "madeWithLoveAnimationOut",
  "realityIsBrokenAnimationIn", "realityIsBrokenAnimationOut",
  "dropAnimationIn", "dropAnimationOut",
  "descompressAnimationIn", "descompressAnimationOut",
  "vogueAnimationLoop", "dragonFlyAnimationLoop", "billboardAnimationLoop",
  "heartbeatAnimationLoop", "waveAnimationLoop", "shakyLettersTextAnimationLoop",
  "pulseAnimationLoop", "glitchAnimationLoop",
  "spinAnimationLoop", "rotate3dAnimationLoop", "textFontChangeAnimationLoop",
  "shakeTextAnimationLoop", "vintageAnimationLoop",
  "backgroundAnimationIn", "backgroundAnimationOut",
  "soundWaveIn", "countDownAnimationIn"
]);

export const isCustomTextAnimation = (presetKey: string) =>
  CUSTOM_TEXT_ANIMATION_KEYS.has(presetKey);