import { Slider } from "@/components/ui/slider";
import { formatearNumero, useAnimationDuration } from "../../hooks/use-animation-duration";
import {DurationInputSlider} from "@/features/editor/control-item/common/duration-input-slider";

export const AnimationDuration = ({
  activeTab
}: {
  activeTab: "in" | "out" | "loop";
}) => {
  const {
    item,
    inDuration,
    outDuration,
    loopDuration,
    maxValues,
    handleInChange,
    handleOutChange,
    handleLoopChange
  } = useAnimationDuration();

  return (
    <div className="flex flex-col gap-3 p-4">
      {activeTab === "in" && item?.animations?.in && (
        <DurationInputSlider
          label="Animation In Duration"
          valueMs={inDuration}
          maxMs={maxValues.in}
          onChangeMs={handleInChange}
        />
      )}
      {activeTab === "out" && item?.animations?.out && (
        <DurationInputSlider
          label="Animation Out Duration"
          valueMs={outDuration}
          maxMs={maxValues.out}
          onChangeMs={handleOutChange}
        />
      )}
      {activeTab === "loop" && item?.animations?.loop && (
        <DurationInputSlider
          label="Animation Loop Duration"
          valueMs={loopDuration}
          maxMs={maxValues.loop}
          onChangeMs={handleLoopChange}
        />
      )}
    </div>
  );
};