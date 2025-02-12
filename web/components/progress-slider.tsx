"use client";

import { UseBoardReturn } from "@/app/game/page";
import { Pause, Play } from "lucide-react";
import { startTransition, useCallback, useState } from "react";
import { MineSweeper, Tile } from "minesweeper";
import { useQuery } from "@tanstack/react-query";
import { checkVisibility } from "@/lib/utils";

let mineSweeper: MineSweeper | undefined;
let lastStep = -1;
let controller = new AbortController();

type MoveCursoParams = {
  x: number;
  y: number;
  speed?: number;
  signal?: AbortSignal;
};
export type ProgressSliderProps = {
  gameId: string | null;
  board: UseBoardReturn;
  cursorRef: React.RefObject<HTMLDivElement | null>;
};
export function ProgressSlider(props: ProgressSliderProps) {
  const { gameId, board, cursorRef } = props;
  const { data: actionLog, refetch } = useQuery({
    queryKey: ["action-logs", gameId],
    queryFn: async () => {
      const url = new URL(`http://localhost:8000/game/${gameId}/action-logs`);
      console.log(url);
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: false,
  });
  const duration = actionLog?.duration ?? 0;

  const [time, setTime] = useState(0);
  const [length, setLenght] = useState(0);
  const [isReplaying, setIsPrelaying] = useState(false);

  function toggleCursorVisibility() {
    const cursor = cursorRef.current;
    if (!cursor) return;

    console.warn("visibility", checkVisibility(cursor));
    if (checkVisibility(cursor)) {
      cursor.style.visibility = "hidden";
    } else {
      cursor.style.visibility = "visible";
    }
  }

  function moveCursor({ x, y, speed, signal }: MoveCursoParams) {
    const cellElement = board.getElementWithCoordinate({ x, y });
    console.log(cellElement, cursorRef.current, signal?.aborted);
    if (!cellElement || !cursorRef.current) return null;
    const left = cellElement.offsetLeft;
    const top = cellElement.offsetTop;
    const cursor = cursorRef.current;

    if (signal?.aborted) {
      return null;
    }
    console.log(left, top);

    return cursor.animate(
      [
        { left: cursor.offsetLeft + "px", top: cursor.offsetTop + "px" },
        { left: left + "px", top: top + "px" },
      ],
      { duration: speed ?? 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
    );
  }

  async function waitFor(ms: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, ms);
    });
  }

  async function updateProgressSlider(actionLog: any, signal: AbortSignal) {
    const duration = actionLog.duration;
    for (let i = 0; i < duration / 1000; i++) {
      if (signal.aborted) return;
      setTime((prev) => prev + 1000);
      await waitFor(1000);
    }
  }

  async function playGame(mineSweeper: MineSweeper, actionLog: any, signal: AbortSignal) {
    /*
    time budget: [---------------------] max: timeToNextStep
    cursor duration: max 200ms
    mouse hover duration: 50ms
    mouse down duration: 50ms
    -> cursor duration and mouse down and mouse hover duration must be within the time budget
    -> the animation must happen at the end of time budget
    fixed cost = timeToNextStep - cursor duration - mouse down duration - mouse hover duration
    time to wait before next step = timeToNextStep - fixed cost
    
    Q: What if the timeToNextStep is smaller than the total of fixed cost?
    A: Change the cursor duration based on the time budget
    */
    const cursorMoveDuration = 200;
    const mouseDownDuration = 40;
    const mouseHoverDuration = 20;
    console.log("start game from step", lastStep + 1);

    toggleCursorVisibility();
    const firstStep = actionLog.logs[lastStep + 1];
    moveCursor({ x: firstStep.x, y: firstStep.y, signal });
    await waitFor(cursorMoveDuration + mouseHoverDuration);
    if (signal.aborted) return;

    for (let i = lastStep + 1; i < actionLog.logs.length; i++) {
      const step = actionLog.logs[i];
      // console.log("step", i, step);

      if (step.action === "reveal") {
        board.togglePressVisual({ x: step.x, y: step.y });
      }
      if (step.action === "reveal-adj") {
        board.toggleUnrevealedNeighborsPressVisual({ x: step.x, y: step.y });
      }
      await waitFor(mouseDownDuration);

      if (step.action === "reveal") {
        mineSweeper.revealTile({ x: step.x, y: step.y }, () => {});
      }
      if (step.action === "reveal-adj") {
        const tiles = mineSweeper.revealAdjTiles({ x: step.x, y: step.y });
        if (tiles.length === 0) {
          board.toggleUnrevealedNeighborsPressVisual({ x: step.x, y: step.y });
        }
      }
      if (step.action === "flag") {
        mineSweeper.toggleFlagTile({ x: step.x, y: step.y });
      }

      board.updateState({ ...board.getState(), grid: mineSweeper.getMaskedBoardAs2DArray() });

      lastStep = i;
      const nextStep = actionLog.logs[i + 1];
      if (!nextStep) return;
      const nextTimestamp = nextStep ? new Date(nextStep.timestamp).getTime() : 0;
      const thisStepTimestamp = new Date(step.timestamp).getTime();
      const timeToNextStep = nextTimestamp - thisStepTimestamp;

      const moveSpeed = Math.min(cursorMoveDuration, timeToNextStep - mouseDownDuration);
      await waitFor(timeToNextStep - moveSpeed - mouseDownDuration - mouseHoverDuration);

      moveCursor({ x: nextStep.x, y: nextStep.y, speed: moveSpeed, signal });
      await waitFor(moveSpeed + mouseHoverDuration);
      if (signal.aborted) {
        console.log("pause after step", i, step);
        return;
      }
    }

    controller.abort();
    toggleCursorVisibility();
  }

  async function replay() {
    if (controller.signal.aborted) {
      controller = new AbortController();
    }
    const signal = controller.signal;

    if (!mineSweeper) {
      const state = board.getState();
      mineSweeper = MineSweeper.from({
        rows: state.grid.length,
        cols: state.grid.length,
        tiles: state.grid.flatMap((row, y) => {
          return row.map((col, x) => {
            return new Tile({ x, y, constant: col, constrains: [row.length, row.length] });
          });
        }),
      });
      const emptyBoard = state.grid.map((row) => row.map(() => "-"));
      board.updateState({ ...state, grid: emptyBoard }, { force: true });
    }

    if (!actionLog) {
      const { data } = await refetch();
      setIsPrelaying(true);
      updateProgressSlider(data, signal);
      startTransition(async () => {
        await playGame(mineSweeper!, data, signal);
      });
    } else {
      setIsPrelaying(true);
      updateProgressSlider(actionLog, signal);
      startTransition(async () => {
        await playGame(mineSweeper!, actionLog, signal);
      });
    }
  }

  function pause() {
    setIsPrelaying(false);
    toggleCursorVisibility();
    controller.abort();
  }

  return (
    <div className={"flex items-center gap-2 p-2 w-full"}>
      <button className={"play-progress-btn w-7 h-7 flex justify-center items-center relative"}>
        {isReplaying ?
          <Pause
            onClick={pause}
            className={"w-4 h-4 pointer-events-auto"}
            color={"#AFB8BF"}
            fill={"#AFB8BF"}
          />
        : <Play
            onClick={replay}
            className={"w-4 h-4 pointer-events-auto"}
            color={"#AFB8BF"}
            fill={"#AFB8BF"}
          />
        }
      </button>
      <div className={"relative w-full"}>
        <input
          type="range"
          value={time}
          min={0}
          max={duration}
          step={1000}
          onInput={() => {}}
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
            transform: `translate(calc(${time * (length / duration)}px - 50%),-50%)`,
          }}
        />
      </div>
    </div>
  );
}
