import { Board } from "@/app/game/page";

type ProgressSliderProps = {
  board: Board;
};
export function ReplayCursor() {
  return <div className={"absolute rounded-full w-6 h-6 bg-white/30"} />;
}
