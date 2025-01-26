"use client";

import { Board } from "@/app/game/page";
import { Pause, Play } from "lucide-react";
import { startTransition, useCallback, useState } from "react";
import { MineSweeper, Tile } from "minesweeper";
import { useQuery } from "@tanstack/react-query";

let mineSweeper: MineSweeper | undefined;
let lastStep = 0;
let controller = new AbortController();

type ProgressSliderProps = {
  gameId: string | null;
  board: Board;
  moveCursor: (c: { x: number; y: number }) => void;
};
export function ProgressSlider(props: ProgressSliderProps) {
  const { gameId, board, moveCursor } = props;
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

  const [stepIdx, setStepIdx] = useState(0);
  const [time, setTime] = useState(0);
  const [length, setLenght] = useState(0);
  const [isReplaying, setIsPrelaying] = useState(false);

  async function waitFor(ms: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, ms);
    });
  }

  async function updateProgressSlider(actionLog: any, signal: AbortSignal) {
    const duration = actionLog.duration;
    // const speed = length / duration;
    for (let i = 0; i < duration / 1000; i++) {
      if (signal.aborted) return;
      setTime((prev) => prev + 1000);
      await waitFor(1000);
    }
    // function schedule() {
    //   setTimeout(() => {
    //     if (signal.aborted) return;

    //     setTime((prev) => prev + 1000 * speed);
    //     schedule();
    //   }, 1000);
    // }

    // if (lastStep === actionLog.logs.length) {
    //   setTime(0);
    // } else {
    //   setTime((prev) => prev + 1000 * speed);
    // }
    // schedule();
  }

  async function playGame(mineSweeper: MineSweeper, actionLog: any, signal: AbortSignal) {
    console.log("start game from step", lastStep);
    for (let i = lastStep; i < actionLog.logs.length; i++) {
      const step = actionLog.logs[i];
      // console.log("step", i, step);

      moveCursor({ x: step.x, y: step.y });
      await waitFor(250);

      if (step.action === "reveal") {
        board.togglePressVisual({ x: step.x, y: step.y });
      }
      if (step.action === "reveal-adj") {
        board.toggleUnrevealedNeighborsPressVisual({ x: step.x, y: step.y });
      }
      await waitFor(50);

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

      board.updateState(mineSweeper.getMaskedBoardAs2DArray());

      const nextStep = actionLog.logs[i + 1];
      const nextTimestamp = nextStep ? new Date(nextStep.timestamp).getTime() : 0;
      const thisStepTimestamp = new Date(step.timestamp).getTime();
      const timeToNextStep = nextTimestamp - thisStepTimestamp;
      // console.log("wait for ", timeToNextStep / 1000 + "s", "before next step");
      lastStep = i + 1;
      await waitFor(timeToNextStep);
      if (signal.aborted) {
        console.log("pause after step", i, step);
        return;
      }
    }
    controller.abort();
  }

  async function replay() {
    if (controller.signal.aborted) {
      controller = new AbortController();
    }
    const signal = controller.signal;

    if (!mineSweeper) {
      const state = board.getState();
      mineSweeper = MineSweeper.from({
        rows: state.length,
        cols: state.length,
        tiles: state.flatMap((row, y) => {
          return row.map((col, x) => {
            return new Tile({ x, y, constant: col, constrains: [row.length, row.length] });
          });
        }),
      });
      const emptyBoard = state.map((row) => row.map(() => "-"));
      board.updateState(emptyBoard, { force: true });
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
    controller.abort();
  }

  return (
    <div className={"flex items-center gap-2 p-2"}>
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
          onInput={(event) => setStepIdx(Math.floor(event.currentTarget.valueAsNumber))}
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
