"use client";

import { Board } from "@/app/game/page";
import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MineSweeper, Tile } from "minesweeper";

type ProgressSliderProps = {
  duration: number;
  logs: { x: number; y: number; action: "flag" | "reveal" | "reveal-adj"; timestamp: string }[];
  board: Board;
};
export function ProgressSlider(props: ProgressSliderProps) {
  const { duration = 0, logs, board } = props;
  const [value, setValue] = useState(0);
  const [length, setLenght] = useState(0);
  const [isReplaying, setIsPrelaying] = useState(false);
  const finalState = useRef(board.state);
  const [mineSweeper, setMineSweeper] = useState<MineSweeper | null>();

  function replay() {
    finalState.current = board.state;
    setIsPrelaying((prev) => !prev);
    setMineSweeper(
      MineSweeper.from({
        rows: finalState.current.length,
        cols: finalState.current.length,
        tiles: finalState.current.flatMap((row, y) => {
          return row.map((col, x) => {
            return new Tile({ x, y, constant: col, constrains: [row.length, row.length] });
          });
        }),
      }),
    );
    board.updateState(board.state.map((row) => row.map(() => "-")));
  }

  useEffect(() => {
    if (!isReplaying || !mineSweeper) return;
    const step = logs[value];
    const nextStep = logs[value + 1];
    console.log("step", value, step, nextStep);

    if (step.action === "reveal") {
      mineSweeper.revealTile({ x: step.x, y: step.y }, () => {});
    }
    if (step.action === "reveal-adj") {
      mineSweeper.revealAdjTiles({ x: step.x, y: step.y });
    }
    if (step.action === "flag") {
      mineSweeper.toggleFlagTile({ x: step.x, y: step.y });
    }
    board.updateState(mineSweeper.getMaskedBoardAs2DArray());

    function scheduleNexStep(nextStep: (typeof logs)[number]) {
      const diff = new Date(nextStep.timestamp).getTime() - new Date(step.timestamp).getTime();
      setTimeout(() => {
        setValue(value + 1);
      }, diff);
    }
    if (nextStep) scheduleNexStep(nextStep);
  }, [isReplaying, mineSweeper, value]);

  return (
    <div className={"flex items-center gap-2 p-2"}>
      <button className={"play-progress-btn w-7 h-7 flex justify-center items-center relative"}>
        <Play
          onClick={replay}
          className={"w-4 h-4 pointer-events-auto"}
          color={"#AFB8BF"}
          fill={"#AFB8BF"}
        />
      </button>
      <div className={"relative w-full"}>
        <input
          type="range"
          value={value}
          min={0}
          max={duration}
          step={1 / 1000}
          onInput={(event) => setValue(Math.floor(event.currentTarget.valueAsNumber))}
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
