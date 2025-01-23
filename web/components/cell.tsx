"use client";

import { useCell } from "@/app/game/page";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "./providers";

type CellProps = {
  value: string | number;
  coordinate: [number, number];
  gameId: number;
};
export function Cell(props: CellProps) {
  const { value, coordinate, gameId } = props;
  const { board, cellRef } = useCell();
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
      queryClient.setQueryData(["download-game", gameId.toString()], data);
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
      queryClient.setQueryData(["download-game", gameId.toString()], data);
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
      queryClient.setQueryData(["download-game", gameId.toString()], data);
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

  /* Interaction specs:
    - buttons = 0 => no buttons is being pressed
    - buttons = 1 => left mouse is being pressed
    - buttons = 2 => right mouse is being pressed
    - Mouse down
      - If buttons = 1 && revealed = false
  */
  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    if (isRevealed) return;
    event.preventDefault();

    const coordinate = event.currentTarget.dataset["coordinate"];
    flagTileMutation.mutate({
      gameId: gameId,
      coordinate: coordinate,
    });
    logActionMutation.mutate({ gameId, coordinate, action: "flag" });
  }

  function handleMouseEnter(event: React.MouseEvent<HTMLDivElement>) {
    if (isRevealed || value === "+" || !isLeftClick(event)) {
      return;
    }
    const coordinate = getTargetCoordinate(event.currentTarget);
    if (!coordinate) return;
    board.togglePressVisual(coordinate);
  }

  function handleMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
    if (isRevealed || !isLeftClick(event)) {
      return;
    }
    const coordinate = getTargetCoordinate(event.currentTarget);
    if (!coordinate) return;
    board.togglePressVisual(coordinate);
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (value === "+") {
      return;
    }
    const coordinate = getTargetCoordinate(event.currentTarget);
    if (!coordinate) return;

    if (isRevealed && isLeftClick(event)) {
      return board.toggleUnrevealedNeighborsPressVisual(coordinate);
    }
    if (isLeftClick(event)) {
      return board.togglePressVisual(coordinate);
    }
  }

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    // We will handle flag action in contextmenu event so we don't have to do
    // it in here
    if (isRightClick(event) || value === "+") {
      return;
    }

    const coordinate = getTargetCoordinate(event.currentTarget);
    if (!coordinate) return;
    if (isRevealed) {
      const flaggedNeighbors = board.getFlaggedNeighbors(coordinate);
      if (flaggedNeighbors.length !== value) {
        return board.toggleUnrevealedNeighborsPressVisual(coordinate);
      }

      revealAdjTilesMutation.mutate({
        gameId: gameId,
        coordinate: `${coordinate.x},${coordinate.y}`,
      });
    } else {
      // We don't call togglePressVisual for this tile because it can result in
      // a ui glitch on this tile. The board re-render will cause the tile to stay
      // in the pressed state.
      logActionMutation.mutate({ gameId, coordinate, action: "reveal" });
      revealTileMutation.mutate({
        gameId: gameId,
        coordinate: `${coordinate.x},${coordinate.y}`,
      });
    }
  }

  function getTargetCoordinate(target: HTMLDivElement) {
    const coordinate = target.dataset["coordinate"];
    if (!coordinate) return null;
    const [x, y] = coordinate.split(",");
    return { x: parseInt(x), y: parseInt(y) };
  }

  function isLeftClick(event: React.MouseEvent<HTMLDivElement>) {
    return event.buttons === 1;
  }

  function isRightClick(event: React.MouseEvent<HTMLDivElement>) {
    return event.buttons === 2;
  }

  return (
    <div
      ref={cellRef}
      data-coordinate={`${coordinate[0]},${coordinate[1]}`}
      data-press={typeof value === "number"}
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
          value === 1 ? "#7CC7FF"
          : value === 2 ? "#66C266"
          : value === 3 ? "#F78"
          : value === 4 ? "#EE88FE"
          : value === 5 ? "#DA2"
          : value === 6 ? "#6CC"
          : value === 7 ? "#999"
          : value === 8 ? "#CFD8E0"
          : "",
      }}
    >
      {value === "+" ?
        "🚩"
      : value === 0 ?
        ""
      : value === 9 ?
        "💣"
      : value === "-" ?
        ""
      : value}
    </div>
  );
}
