"use client";

import { Cell } from "@/components/cell";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type BoardContextProps = {
  board: Array<(string | number)[]>;
  registerElement: (current: HTMLDivElement) => void;
};
const boardContext = createContext<BoardContextProps>({ board: [], registerElement: () => {} });

type UseCellProps = {
  cellRef: React.RefObject<HTMLDivElement | null>;
};
export function useCell() {
  const ref = useRef<HTMLDivElement>(null);
  const { board, registerElement } = useContext(boardContext);

  function togglePressVisual() {
    const target = ref.current;
    if (!target) return;

    const pressState = target.dataset["press"];
    if (pressState === "false") target.dataset["press"] = "true";
    if (pressState === "true") target.dataset["press"] = "false";
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
      return board[n.y]?.[n.x] && board[n.y][n.x] === "+";
    });
  }

  function getRevealableNeighbors() {
    const target = ref.current;
    let coordinate = target?.dataset["coordinate"];
    if (!coordinate) return [];

    const [x, y] = coordinate.split(",");
    return getNeighbors({ x: parseInt(x), y: parseInt(y) }).filter((n) => {
      return board[n.y]?.[n.x] && board[n.y][n.x] === "-";
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
        registerElement(current);
        return () => {
          ref.current = null;
        };
      },
      [registerElement],
    ),
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
  const board: any[] = data?.board ?? [];

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
          {board.map((row: Array<number | string>, y) => {
            return (
              <div key={y} className={"flex"}>
                {row.map((col, x) => {
                  // const revealableNeigbors = getRevealableNeighbors({ y, x });
                  // const flaggedNeighbors = getFlaggedNeighbors({ y, x });
                  return (
                    <Cell
                      key={x}
                      value={col}
                      coordinate={[x, y]}
                      gameId={gameId}
                      revealableNeigbors={[]}
                      flaggedNeighbors={[]}
                      onReveal={() => {
                        // if (!runClock) {
                        //   setRunClock(true);
                        // }
                      }}
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
  board: BoardContextProps["board"];
};
function BoardProvider(props: React.PropsWithChildren<BoardProviderProps>) {
  const { children, board } = props;

  const cellSet = useRef<Set<HTMLDivElement>>(new Set());

  const registerElement = useCallback((current: HTMLDivElement) => {
    cellSet.current.add(current);
    return () => {
      console.log("un registerElement");
      cellSet.current.delete(current);
    };
  }, []);

  return (
    <boardContext.Provider value={{ board, registerElement }}>{children}</boardContext.Provider>
  );
}
