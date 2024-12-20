import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router";
import { queryClient } from "~/root";

export default function Game({ params }: any) {
  let navigate = useNavigate();
  const gameId = params.gameId;

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
  const newGameMutation = useMutation({
    mutationKey: ["new-game"],
    mutationFn: async () => {
      const url = new URL("http://localhost:8000/game/new");
      url.searchParams.set("mode", "2");
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      navigate(`/game/${data.id}`);
    },
  });
  const board: any[] = data?.board;
  const result = data?.result;
  function getRevealableNeighbors({ x, y }: { x: number; y: number }) {
    const neighbors = [
      { y: y - 1, x: x - 1 },
      { y: y - 1, x: x },
      { y: y - 1, x: x + 1 },
      { y: y, x: x - 1 },
      { y: y, x: x + 1 },
      { y: y + 1, x: x - 1 },
      { y: y + 1, x: x },
      { y: y + 1, x: x + 1 },
    ];

    return neighbors.filter((n) => {
      return board[n.y]?.[n.x] && board[n.y][n.x] === "-";
    });
  }
  function getFlaggedNeighbors({ x, y }: { x: number; y: number }) {
    const neighbors = [
      { y: y - 1, x: x - 1 },
      { y: y - 1, x: x },
      { y: y - 1, x: x + 1 },
      { y: y, x: x - 1 },
      { y: y, x: x + 1 },
      { y: y + 1, x: x - 1 },
      { y: y + 1, x: x },
      { y: y + 1, x: x + 1 },
    ];

    return neighbors.filter((n) => {
      return board[n.y]?.[n.x] && board[n.y][n.x] === "+";
    });
  }

  if (!data) {
    return <div>There is no game here</div>;
  }

  return (
    <div
      className="panel bg-[#474E56] w-max"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div className="option-pane flex justify-center py-2">
        <button
          onClick={() => {
            newGameMutation.mutate();
          }}
          className="new-game-btn text-2xl border border-[#1E262E] px-2 py-1 cursor-default"
        >
          <span className="block">
            {result === 0 ? "😵" : result === 1 ? "🥳" : "😊"}
          </span>
        </button>
      </div>
      <div className={"flex board w-max relative flex-col"}>
        {board.map((row: Array<number | string>, y) => {
          return (
            <div key={y} className={"flex"}>
              {row.map((col, x) => {
                const revealableNeigbors = getRevealableNeighbors({ y, x });
                const flaggedNeighbors = getFlaggedNeighbors({ y, x });
                return (
                  <Cell
                    key={x}
                    value={col}
                    coordinate={[x, y]}
                    gameId={gameId}
                    revealableNeigbors={revealableNeigbors}
                    flaggedNeighbors={flaggedNeighbors}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CellProps = {
  value: string | number;
  coordinate: [number, number];
  gameId: number;
  revealableNeigbors: { x: number; y: number }[];
  flaggedNeighbors: { x: number; y: number }[];
};
function Cell(props: CellProps) {
  const { value, coordinate, gameId, revealableNeigbors, flaggedNeighbors } =
    props;
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
      const url = new URL(
        `http://localhost:8000/game/${gameId}/reveal-adj-tiles`
      );
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
  }

  return (
    <div
      data-coordinate={`${coordinate[0]},${coordinate[1]}`}
      onContextMenu={handleContextMenu}
      onMouseEnter={(event) => {
        if (isRevealed || value === "+") {
          return;
        }
        if (event.buttons === 1) {
          event.currentTarget.classList.add("revealed");
        }
      }}
      onMouseLeave={(event) => {
        if (isRevealed) {
          return;
        }
        event.currentTarget.classList.remove("revealed");
      }}
      onMouseDown={(event) => {
        if (value === "+") {
          return;
        }
        if (isRevealed) {
          let coordinate: any = event.currentTarget.dataset["coordinate"];
          coordinate = coordinate?.split(",");
          coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
          for (const { x, y } of revealableNeigbors) {
            const node = document.querySelector(
              `[data-coordinate="${x},${y}"]`
            );
            if (node instanceof HTMLDivElement) {
              node.classList.add("revealed");
            }
          }
          return;
        }
        if (event.buttons === 1) {
          event?.currentTarget.classList.add("revealed");
        }
      }}
      onMouseUp={(event) => {
        if (event.button === 2 || value === "+") {
          return;
        }
        let coordinate: any = event.currentTarget.dataset["coordinate"];

        if (isRevealed && revealableNeigbors.length) {
          if (flaggedNeighbors.length === value) {
            revealAdjTilesMutation.mutate({
              gameId: gameId,
              coordinate: coordinate,
            });
          } else {
            coordinate = coordinate?.split(",");
            coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
            for (const { x, y } of revealableNeigbors) {
              const node = document.querySelector(
                `[data-coordinate="${x},${y}"]`
              );
              if (node instanceof HTMLDivElement) {
                node.classList.remove("revealed");
              }
            }
          }
          return;
        }

        if (!isRevealed) {
          revealTileMutation.mutate({
            gameId: gameId,
            coordinate: coordinate,
          });
        }
      }}
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
      {value === "+"
        ? "🚩"
        : value === 0
        ? ""
        : value === 9
        ? "💣"
        : value === "-"
        ? ""
        : value}
    </div>
  );
}
