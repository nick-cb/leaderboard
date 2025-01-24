import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { queryClient } from "~/root";
import { useCell } from "~/routes/game";

type CellProps = {
  value: string | number;
  coordinate: [number, number];
  gameId: number;
  revealableNeigbors: { x: number; y: number }[];
  flaggedNeighbors: { x: number; y: number }[];
  onReveal: () => void;
};
export function Cell(props: CellProps) {
  const { value, coordinate, gameId, revealableNeigbors, flaggedNeighbors, onReveal } = props;
  const ref = useRef<HTMLDivElement>(null);
  const {
    registerElement,
    togglePressVisual,
    toggleUnrevealedNeighborsPressVisual,
    getRevealableNeighbors,
    getFlaggedNeighbors,
  } = useCell({ cellRef: ref });
  const isRevealed = typeof value !== "string";
  const revealTileMutation = useMutation({
    mutationKey: ["reveal-tile"],
    mutationFn: async ({ gameId, coordinate }: any) => {
      if (!coordinate) {
        throw new Error("Invalid params");
      }
      const url = new URL(`http://localhost:8000/game/${gameId}/reveal-tile`);
      url.searchParams.set("coordinate", coordinate);
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["download-game", gameId], data);
    },
  });
  const revealAdjTilesMutation = useMutation({
    mutationKey: ["reveal-adj-tile"],
    mutationFn: async ({ gameId, coordinate }: any) => {
      if (!coordinate) {
        throw new Error("Invalid params");
      }
      const url = new URL(`http://localhost:8000/game/${gameId}/reveal-adj-tiles`);
      url.searchParams.set("coordinate", coordinate);
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["download-game", gameId], data);
    },
  });
  const flagTileMutation = useMutation({
    mutationKey: ["flag-tile"],
    mutationFn: async ({ gameId, coordinate }: any) => {
      if (!coordinate) {
        throw new Error("Invalid params");
      }
      const url = new URL(`http://localhost:8000/game/${gameId}/flag-tile`);
      url.searchParams.set("coordinate", coordinate);
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["download-game", gameId], data);
    },
  });
  const logActionMutation = useMutation({
    mutationKey: ["log-action"],
    mutationFn: async ({ gameId, coordinate, action }: any) => {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set("origin", "http://localhost:5173");
      await fetch(`http://localhost:8000/game/${gameId}/log-action`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          action,
          coordinate: coordinate,
          timestamp: Date.now(),
        }),
      });
    },
  });

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    if (isRevealed) {
      return;
    }
    const coordinate = event.currentTarget.dataset["coordinate"];
    event.preventDefault();
    flagTileMutation.mutate({
      gameId: gameId,
      coordinate: coordinate,
    });
    logActionMutation.mutate({ gameId, coordinate, action: "flag" });
  }

  function handleMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    if (isRevealed || value === "+") {
      return;
    }
    if (event.buttons === 1) {
      event.currentTarget.classList.add("revealed");
    }
  }

  function handleMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
    if (isRevealed) {
      return;
    }
    event.currentTarget.classList.remove("revealed");
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (value === "+") {
      return;
    }
    if (isRevealed && event.button === 0) {
      return toggleUnrevealedNeighborsPressVisual();
    }
    if (event.buttons === 1) {
      return togglePressVisual();
    }
  }

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button === 2 || value === "+") {
      return;
    }

    let coordinate: any = event.currentTarget.dataset["coordinate"];
    if (isRevealed) {
      const flaggedNeighbors = getFlaggedNeighbors();
      if (flaggedNeighbors.length === value) {
        revealAdjTilesMutation.mutate({
          gameId: gameId,
          coordinate: coordinate,
        });
      } else {
        toggleUnrevealedNeighborsPressVisual();
      }
    } else {
      logActionMutation.mutate({ gameId, coordinate, action: "reveal" });
      revealTileMutation.mutate({
        gameId: gameId,
        coordinate: coordinate,
      });
    }
  }

  return (
    <div
      ref={registerElement}
      data-coordinate={`${coordinate[0]},${coordinate[1]}`}
      data-press={typeof value === 'number'}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={
        "cell w-8 h-8 text-center cursor-default bg-[#4D545C] select-none font-extrabold" +
        (value !== "+" && value !== "-" ? " revealed " : "")
      }
      style={{
        color:
          value === 1
            ? "#7CC7FF"
            : value === 2
            ? "#66C266"
            : value === 3
            ? "#F78"
            : value === 4
            ? "#EE88FE"
            : value === 5
            ? "#DA2"
            : value === 6
            ? "#6CC"
            : value === 7
            ? "#999"
            : value === 8
            ? "#CFD8E0"
            : "",
      }}
    >
      {value === "+" ? "🚩" : value === 0 ? "" : value === 9 ? "💣" : value === "-" ? "" : value}
    </div>
  );
}
