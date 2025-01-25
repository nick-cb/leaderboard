"use client";

import { Board } from "@/app/game/page";
import { Pause, Play } from "lucide-react";
import { startTransition, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MineSweeper, Tile } from "minesweeper";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./providers";
import { flushSync } from "react-dom";

let mineSweeper: MineSweeper | undefined;
let lastStep = 0;
let controller = new AbortController();
let isReplaying = false;

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

  const [stepIdx, setStepIdx] = useState(0);
  const [time, setTime] = useState(0);
  const [length, setLenght] = useState(0);
  // const [isReplaying, setIsPrelaying] = useState(false);
  const finalState = useRef(board.state);

  async function waitFor(ms: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, ms);
    });
  }

  async function playGame(mineSweeper: MineSweeper, actionLog: any) {
    console.log("start game from step", lastStep);
    for (let i = lastStep; i < actionLog.logs.length; i++) {
      const step = actionLog.logs[i];
      console.log("step", i, step);

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

      board.updateState(mineSweeper.getMaskedBoardAs2DArray(), { force: true });

      const nextStep = actionLog.logs[i + 1];
      const nextTimestamp = nextStep ? new Date(nextStep.timestamp).getTime() : 0;
      const thisStepTimestamp = new Date(step.timestamp).getTime();
      const timeToNextStep = nextTimestamp - thisStepTimestamp;
      console.log("wait for ", timeToNextStep / 1000 + "s", "before next step");
      lastStep = i + 1;
      await waitFor(timeToNextStep);
      if (controller.signal.aborted) {
        console.log("pause after step", i, step);
        return;
      }
    }
  }

  function replay() {
    board.updateState(
      board.state.map((row) => row.map(() => "-")),
      { force: true },
    );
    console.log(board);
    // if (!isReplaying) {
    //   isReplaying = true;
    // } else {
    //   isReplaying = false;
    //   controller.abort();
    //   return;
    // }
    // if (controller.signal.aborted) {
    //   controller = new AbortController();
    // }
    // if (!mineSweeper) {
    //   console.log("A");
    //   finalState.current = board.state;
    //   mineSweeper = MineSweeper.from({
    //     rows: finalState.current.length,
    //     cols: finalState.current.length,
    //     tiles: finalState.current.flatMap((row, y) => {
    //       return row.map((col, x) => {
    //         return new Tile({ x, y, constant: col, constrains: [row.length, row.length] });
    //       });
    //     }),
    //   });
    //   const emptyBoard = finalState.current.map((row) => row.map(() => "-"));
    //   board.updateState(emptyBoard, { force: true });
    // }

    // // if (!actionLog) {
    // const { data } = await refetch();
    // // setIsPrelaying(true);
    // await playGame(mineSweeper, data);
    // } else {
    //   setIsPrelaying(true);
    //   await playGame(mineSweeper, actionLog);
    // }
  }

  function pause() {
    isReplaying = false;
    // setIsPrelaying(false);
    controller.abort();
    // setIsPrelaying(false);
  }

  // useEffect(() => {
  //   if (!isReplaying) return;

  //   function schedule() {
  //     return setTimeout(() => {
  //       setTime((prev) => prev + 1000);
  //       schedule();
  //     }, 1000);
  //   }

  //   const id = schedule();

  //   return () => {
  //     clearTimeout(id);
  //   };
  // }, [isReplaying]);

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
          value={time}
          min={0}
          max={0}
          step={1 / 1000}
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
            transform: `translate(calc(${time / (0 / length)}px - 50%),-50%)`,
          }}
        />
      </div>
    </div>
  );
}
