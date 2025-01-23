import { Play } from "lucide-react";
import { useCallback, useState } from "react";

type ProgressSliderProps = {
  duration: number;
};
export function ProgressSlider(props: ProgressSliderProps) {
  const { duration = 0 } = props;
  const [value, setValue] = useState(0);
  const [length, setLenght] = useState(0);

  return (
    <div className={"flex items-center gap-2 p-2"}>
      <button
        className={
          "play-progress-btn w-7 h-7 flex justify-center items-center relative"
        }
      >
        <Play className={"w-4 h-4"} color={"#AFB8BF"} fill={"#AFB8BF"} />
      </button>
      <div className={"relative w-full"}>
        <input
          type="range"
          min={0}
          max={duration}
          step={1 / 1000}
          onInput={(event) =>
            setValue(Math.floor(event.currentTarget.valueAsNumber))
          }
          ref={useCallback((current: HTMLInputElement) => {
            setLenght(current?.clientWidth ?? 0);
          }, [])}
          className={"action-logs-progress w-full"}
        />
        <div
          className={
            "action-logs-progress-thumb w-5 h-5 absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer pointer-events-none"
          }
          style={{
            transform: `translate(${value / (duration / length)}px,-50%)`,
          }}
        />
      </div>
    </div>
  );
}
