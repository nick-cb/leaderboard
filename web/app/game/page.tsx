"use client";

import { Cell } from "@/components/cell";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState } from "react";

const boardContext = createContext<ReturnType<typeof useBoard>>({
  state: [],
  registerElement: () => {
    return () => {};
  },
  togglePressVisual: () => {},
  toggleUnrevealedNeighborsPressVisual: () => {},
  getFlaggedNeighbors: () => [],
});

type UseCellProps = {
  cellRef: React.RefObject<HTMLDivElement | null>;
};
export function useCell() {
  const ref = useRef<HTMLDivElement>(null);
  const board = useContext(boardContext);
  const { state } = board;

  function togglePressVisual() {
    const target = ref.current;
    if (!target) return;
    let coordinate = target.dataset["coordinate"];
    if (!coordinate) return;

    const [x, y] = coordinate?.split(",");
    board.togglePressVisual({ x: parseInt(x), y: parseInt(y) });
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

  function getFlaggedNeighbors() {
    const target = ref.current;
    let coordinate = target?.dataset["coordinate"];
    if (!coordinate) return [];

    const [x, y] = coordinate.split(",");
    return getNeighbors({ x: parseInt(x), y: parseInt(y) }).filter((n) => {
      return state[n.y]?.[n.x] && state[n.y][n.x] === "+";
    });
  }

  function getRevealableNeighbors() {
    const target = ref.current;
    let coordinate = target?.dataset["coordinate"];
    if (!coordinate) return [];

    const [x, y] = coordinate.split(",");
    return getNeighbors({ x: parseInt(x), y: parseInt(y) }).filter((n) => {
      return state[n.y]?.[n.x] && state[n.y][n.x] === "-";
    });
  }

  function toggleUnrevealedNeighborsPressVisual() {
    for (const { x: nX, y: nY } of getRevealableNeighbors()) {
      const node = document.querySelector(`[data-coordinate="${nX},${nY}"]`);
      if (node instanceof HTMLDivElement) {
        const pressState = node.dataset["press"];
        console.log(pressState);
        if (pressState === "false") node.dataset["press"] = "true";
        if (pressState === "true") node.dataset["press"] = "false";
      }
    }
  }

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
    togglePressVisual,
    toggleUnrevealedNeighborsPressVisual,
    getRevealableNeighbors,
    getFlaggedNeighbors,
  };
}

export default function Game() {
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
  const board = useBoard({ state: data?.board ?? [] });

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
  }

  if (!data) {
    return <div>There is no game here</div>;
  }

  return (
    <div className="panel bg-[#474E56] w-max" onContextMenu={handleContextMenu}>
      <div className={"flex board w-max relative flex-col"}>
        <BoardProvider board={board}>
          {board.state.map((row: Array<number | string>, y) => {
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
        </BoardProvider>
      </div>
    </div>
  );
}

type BoardProviderProps = {
  board: ReturnType<typeof useBoard>;
};
function BoardProvider(props: React.PropsWithChildren<BoardProviderProps>) {
  const { children, board } = props;

  return <boardContext.Provider value={board}>{children}</boardContext.Provider>;
}

type UseBoardProviderProps = {
  state: Array<(string | number)[]>;
};
function useBoard(props: UseBoardProviderProps) {
  const { state } = props;
  const cellSet = useRef<Set<HTMLDivElement>>(new Set());

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
    for (const cell of cellSet.current) {
      if (!cell && !isThisCell(cell, c)) return [];

      let coordinate = cell.dataset["coordinate"];
      if (!coordinate) return [];

      const { x, y } = c;
      return getNeighbors({ x: x, y: y }).filter((n) => {
        return state[n.y]?.[n.x] && state[n.y][n.x] === "+";
      });
    }
    return [];
  }

  function getRevealableNeighbors(c: { x: number; y: number }) {
    for (const cell of cellSet.current) {
      if (!cell && !isThisCell(cell, c)) return [];

      const { x, y } = c;
      return getNeighbors({ x: x, y: y }).filter((n) => {
        return state[n.y]?.[n.x] && state[n.y][n.x] === "-";
      });
    }

    return [];
  }

  function toggleUnrevealedNeighborsPressVisual(c: { x: number; y: number }) {
    console.log(c);
    for (const { x: nX, y: nY } of getRevealableNeighbors(c)) {
      console.log({ nX, nY });
      const node = document.querySelector(`[data-coordinate="${nX},${nY}"]`);
      if (node instanceof HTMLDivElement) {
        const pressState = node.dataset["press"];
        console.log(pressState);
        if (pressState === "false") node.dataset["press"] = "true";
        if (pressState === "true") node.dataset["press"] = "false";
      }
    }
  }

  return {
    state,
    registerElement,
    togglePressVisual,
    toggleUnrevealedNeighborsPressVisual,
    getFlaggedNeighbors,
  };
}
