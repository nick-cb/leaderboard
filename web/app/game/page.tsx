"use client";

import { Cell } from "@/components/cell";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
  const board = useBoard({ initialState: data?.board ?? [] });

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
  }

  useEffect(() => {
    if (!data) return;
    board.updateState(data.board);
  }, [data]);

  if (!data) {
    return <div>There is no game here</div>;
  }

  return (
    <div className="panel bg-[#474E56] w-max" onContextMenu={handleContextMenu}>
      <div className={"flex board w-max relative flex-col pointer-events-none"}>
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

const boardContext = createContext<ReturnType<typeof useBoard>>({
  state: [],
  registerElement: () => {
    return () => {};
  },
  togglePressVisual: () => {},
  toggleUnrevealedNeighborsPressVisual: () => {},
  getFlaggedNeighbors: () => [],
  updateState: () => {},
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
  initialState: Array<(string | number)[]>;
};
function useBoard(props: UseBoardProviderProps) {
  const { initialState } = props;
  const cellSet = useRef<Set<HTMLDivElement>>(new Set());
  const [state, setState] = useState(initialState);

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

  function updateState(newState: (string | number)[][]) {
    setState(newState);
  }

  return {
    state,
    updateState,
    registerElement,
    togglePressVisual,
    toggleUnrevealedNeighborsPressVisual,
    getFlaggedNeighbors,
  };
}
