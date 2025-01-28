"use client";

import { Cell } from "@/components/cell";
import { Clock } from "@/components/clock";
import { MoveCursoFn, ProgressSlider } from "@/components/progress-slider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

type Board = {
  result: number;
  grid: Array<(string | number)[]>;
  isRunning: boolean;
  startTime: number;
  endTime: number;
};
export default function Game() {
  let route = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId");
  const { data } = useQuery({
    queryKey: ["download-game", gameId],
    queryFn: async () => {
      const url = new URL(`http://localhost:8000/game/${gameId}`);
      url.searchParams.set("mode", "2");
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      return data;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const board = useBoard({
    initialState: { result: -1, grid: [], isRunning: false, startTime: 0, endTime: 0 },
  });

  const mutation = useMutation({
    mutationKey: ["new-game"],
    mutationFn: async () => {
      const url = new URL("http://localhost:8000/game/new");
      url.searchParams.set("mode", "2");
      const response = await fetch(url);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      route.push(`/game?gameId=${data.id}`);
    },
  });

  const cursorRef = useRef<HTMLDivElement>(null);

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
  }

  const moveCursor: MoveCursoFn = ({ x, y, speed, signal }) => {
    const cellElement = board.getElementWithCoordinate({ x, y });
    if (!cellElement || !cursorRef.current) return null;
    const left = cellElement.offsetLeft;
    const top = cellElement.offsetTop;
    if (signal?.aborted) return null;

    const cursor = cursorRef.current;
    return cursor.animate(
      [
        { left: cursor.offsetLeft + "px", top: cursor.offsetTop + "px" },
        { left: left + "px", top: top + "px" },
      ],
      { duration: speed ?? 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
    );
  };

  useEffect(() => {
    if (!data) return;
    board.updateState({ ...data, grid: data.board });
  }, [data]);

  if (!data) {
    return <div>There is no game here</div>;
  }

  const state = board.getState();
  const startTime = state.startTime ? new Date(state.startTime).getTime() : 0;
  const endTime = state.endTime ? new Date(state.endTime).getTime() : 0;
  const time = endTime && startTime ? Math.round((endTime - startTime) / 1000) : undefined;

  return (
    <div className="panel bg-[#474E56] w-max" onContextMenu={handleContextMenu}>
      <div className="control-panel w-full flex p-3 relative justify-between gap-2">
        <button
          onClick={() => {
            mutation.mutate();
          }}
          className="new-game-btn text-2xl px-2 py-1"
        >
          <span className="block">
            {state.result === 0 ?
              "😵"
            : state.result === 1 ?
              "🥳"
            : "😊"}
          </span>
        </button>
        <Clock run={state.isRunning} time={time} />
      </div>
      <div className={"flex board w-max relative flex-col pointer-events-none"}>
        <BoardProvider board={board}>
          {state.grid.map((row: Array<number | string>, y) => {
            return (
              <div key={y} className={"flex"}>
                {row.map((col, x) => {
                  return (
                    <Cell
                      key={x}
                      value={col}
                      coordinate={[x, y]}
                      gameId={parseInt(gameId ?? "-1")}
                    />
                  );
                })}
              </div>
            );
          })}
          <div
            ref={cursorRef}
            className={"absolute rounded-full w-6 h-6 bg-white/30 transition-all"}
          />
        </BoardProvider>
      </div>
      <ProgressSlider gameId={gameId} board={board} moveCursor={moveCursor} />
    </div>
  );
}

const boardContext = createContext<ReturnType<typeof useBoard>>({
  // state: [],
  registerElement: () => {
    return () => {};
  },
  togglePressVisual: () => {},
  toggleUnrevealedNeighborsPressVisual: () => {},
  getFlaggedNeighbors: () => [],
  updateState: () => {},
  getRevealableNeighbors: () => [],
  getElementWithCoordinate: () => null,
  getState: () => ({ grid: [], result: -1, isRunning: false, startTime: 0, endTime: 0 }),
});

export function useCell() {
  const ref = useRef<HTMLDivElement>(null);
  const board = useContext(boardContext);

  return {
    cellRef: useCallback(
      (current: HTMLDivElement) => {
        ref.current = current;
        board.registerElement(current);
        return () => {
          console.log("unregister");
          ref.current = null;
        };
      },
      [board.registerElement],
    ),
    board,
  };
}

type BoardProviderProps = {
  board: ReturnType<typeof useBoard>;
};
function BoardProvider(props: React.PropsWithChildren<BoardProviderProps>) {
  const { children, board } = props;

  return <boardContext.Provider value={board}>{children}</boardContext.Provider>;
}

type UseBoardProviderProps = {
  initialState: Board;
};
function useBoard(props: UseBoardProviderProps) {
  const { initialState } = props;
  const cellSet = useRef<Set<HTMLDivElement>>(new Set());
  const [, reRender] = useState(false);
  const stateRef = useRef(initialState);

  const registerElement = useCallback((current: HTMLDivElement) => {
    cellSet.current.add(current);
    return () => {
      console.log("un registerElement");
      cellSet.current.delete(current);
    };
  }, []);

  function isThisCell(cell: HTMLDivElement, { x, y }: { x: number; y: number }) {
    let coordinate = cell.dataset["coordinate"];
    if (!coordinate) return false;

    const [cX, cY] = coordinate.split(",");

    return parseInt(cX) === x && parseInt(cY) === y;
  }

  function togglePressVisual({ x, y }: { x: number; y: number }) {
    for (const cell of cellSet.current) {
      if (!cell || !isThisCell(cell, { x, y })) continue;

      const pressState = cell.dataset["press"];
      if (pressState === "false") cell.dataset["press"] = "true";
      if (pressState === "true") cell.dataset["press"] = "false";
    }
  }

  function getNeighbors({ x, y }: { x: number; y: number }) {
    return [
      { y: y - 1, x: x - 1 },
      { y: y - 1, x: x },
      { y: y - 1, x: x + 1 },
      { y: y, x: x - 1 },
      { y: y, x: x + 1 },
      { y: y + 1, x: x - 1 },
      { y: y + 1, x: x },
      { y: y + 1, x: x + 1 },
    ].filter(({ x, y }) => x > -1 && y > -1 && x < 16 && y < 16);
  }

  function getFlaggedNeighbors(c: { x: number; y: number }) {
    const grid = stateRef.current.grid;
    for (const cell of cellSet.current) {
      if (!cell && !isThisCell(cell, c)) return [];

      let coordinate = cell.dataset["coordinate"];
      if (!coordinate) return [];

      const { x, y } = c;
      return getNeighbors({ x: x, y: y }).filter((n) => {
        return grid[n.y]?.[n.x] && grid[n.y][n.x] === "+";
      });
    }
    return [];
  }

  function getRevealableNeighbors(c: { x: number; y: number }) {
    const grid = stateRef.current.grid;
    for (const cell of cellSet.current) {
      if (!cell && !isThisCell(cell, c)) return [];

      const { x, y } = c;
      return getNeighbors({ x: x, y: y }).filter((n) => {
        return grid[n.y]?.[n.x] && grid[n.y][n.x] === "-";
      });
    }

    return [];
  }

  function toggleUnrevealedNeighborsPressVisual(c: { x: number; y: number }) {
    const revealableNeighbors = getRevealableNeighbors(c);
    for (const { x: nX, y: nY } of revealableNeighbors) {
      const node = document.querySelector(`[data-coordinate="${nX},${nY}"]`);
      if (node instanceof HTMLDivElement) {
        const pressState = node.dataset["press"];
        if (pressState === "false") node.dataset["press"] = "true";
        if (pressState === "true") node.dataset["press"] = "false";
      }
    }
  }

  function updateState(newState: Board, options?: { force: boolean }) {
    const { force = false } = options ?? {};
    stateRef.current = newState;
    if (force) {
      return flushSync(() => reRender((prev) => !prev));
    }
    reRender((prev) => !prev);
  }

  function getState() {
    return stateRef.current;
  }

  function getElementWithCoordinate(c: { x: number; y: number }) {
    for (const cell of cellSet.current) {
      if (isThisCell(cell, c)) return cell;
    }

    return null;
  }

  return {
    // state,
    getState,
    updateState,
    registerElement,
    togglePressVisual,
    toggleUnrevealedNeighborsPressVisual,
    getFlaggedNeighbors,
    getRevealableNeighbors,
    getElementWithCoordinate,
  };
}
export type UseBoardReturn = ReturnType<typeof useBoard>;
