"use client";

import { Board } from "@/app/game/page";
import { Pause, Play } from "lucide-react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { MineSweeper, Tile } from "minesweeper";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./providers";

type ProgressSliderProps = {
  // duration: number;
  // logs: { x: number; y: number; action: "flag" | "reveal" | "reveal-adj"; timestamp: string }[];
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
  const [isReplaying, setIsPrelaying] = useState(false);
  const finalState = useRef(board.state);
  const [mineSweeper, setMineSweeper] = useState<MineSweeper | null>();

  function a(actionLog: any) {
    const duration = actionLog.duration;
    if (!mineSweeper) {
      finalState.current = board.state;
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
    if (stepIdx * 1000 === duration) {
      setStepIdx(0);
      setTime(0);
    }
    setIsPrelaying((prev) => !prev);
  }

  function replay() {
    if (!actionLog) {
      return startTransition(async () => {
        const { data } = await refetch();
        a(data);
      });
    }

    a(actionLog);
  }

  function pause() {
    setIsPrelaying(false);
  }

  useEffect(() => {
    if (!isReplaying || !mineSweeper) return;
    // const step = logs[stepIdx];
    // const nextStep = logs[stepIdx + 1];
    // console.log("step", stepIdx, step, nextStep);

    // moveCursor({ x: step.x, y: step.y });
    // setTimeout(() => {
    //   if (step.action === "reveal") {
    //     board.togglePressVisual({ x: step.x, y: step.y });
    //   }
    //   if (step.action === "reveal-adj") {
    //     board.toggleUnrevealedNeighborsPressVisual({ x: step.x, y: step.y });
    //   }

    //   setTimeout(() => {
    //     if (step.action === "reveal") {
    //       mineSweeper.revealTile({ x: step.x, y: step.y }, () => {});
    //     }
    //     if (step.action === "reveal-adj") {
    //       const tiles = mineSweeper.revealAdjTiles({ x: step.x, y: step.y });
    //       if (tiles.length === 0) {
    //         board.toggleUnrevealedNeighborsPressVisual({ x: step.x, y: step.y });
    //       }
    //     }
    //     if (step.action === "flag") {
    //       mineSweeper.toggleFlagTile({ x: step.x, y: step.y });
    //     }
    //     board.updateState(mineSweeper.getMaskedBoardAs2DArray());

    //     function scheduleNexStep(nextStep: (typeof logs)[number]) {
    //       const diff = new Date(nextStep.timestamp).getTime() - new Date(step.timestamp).getTime();
    //       setTimeout(() => {
    //         setStepIdx(stepIdx + 1);
    //       }, diff);
    //     }
    //     if (nextStep) scheduleNexStep(nextStep);
    //   }, 50);
    // }, 250);
  }, [isReplaying, mineSweeper, stepIdx]);

  useEffect(() => {
    if (!isReplaying) return;

    function schedule() {
      return setTimeout(() => {
        setTime((prev) => prev + 1000);
        schedule();
      }, 1000);
    }

    const id = schedule();

    return () => {
      clearTimeout(id);
    };
  }, [isReplaying]);

  return (
    <div className={"flex items-center gap-2 p-2"}>
      <button className={"play-progress-btn w-7 h-7 flex justify-center items-center relative"}>
        {!isReplaying ?
          <Play
            onClick={replay}
            className={"w-4 h-4 pointer-events-auto"}
            color={"#AFB8BF"}
            fill={"#AFB8BF"}
          />
        : <Pause
            onClick={pause}
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
