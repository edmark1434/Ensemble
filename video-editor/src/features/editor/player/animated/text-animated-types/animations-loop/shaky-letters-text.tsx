import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";

function random(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const ShakyLettersText = ({
  char,
  index,
  frame,
  colorStyle,
}: {
  char: string;
  index: number;
  frame: number;
  colorStyle: {
    isGradient: boolean;
    shadowStrokeStyle: React.CSSProperties;
    fillStyle: React.CSSProperties;
  };
}) => {
  const seed = frame * 100 + index * 999;
  const offsetX = (random(seed) - 0.5) * 8;
  const offsetY = (random(seed + 1) - 0.5) * 8;
  const rotate = (random(seed + 2) - 0.5) * 6;

  return (
    <AnimatedChar
      char={char}
      animationStyle={{ transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)` }}
      isGradient={colorStyle.isGradient}
      shadowStrokeStyle={colorStyle.shadowStrokeStyle}
      fillStyle={colorStyle.fillStyle}
    />
  );
};

export default ShakyLettersText;
