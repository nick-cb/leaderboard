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
      <div className="flex justify-center py-2">
        <button
          onClick={() => {
            newGameMutation.mutate();
          }}
          className="new-game-btn text-2xl border border-black px-2 py-1 cursor-default"
        >
          <span className="block">😊</span>
        </button>
      </div>
      <div className={"flex board w-max relative flex-col"}>
        {board.map((row: Array<number | string>, rowNumber) => {
          return (
            <Row key={rowNumber} row={row} y={rowNumber} gameId={gameId} />
          );
        })}
      </div>
    </div>
  );
}

type RowProps = {
  row: Array<string | number>;
  y: number;
  gameId: number;
};
function Row(props: RowProps) {
  const { row, gameId, y } = props;
  return (
    <div key={y} className={"flex"}>
      {row.map((col, x) => {
        return (
          <Cell
            key={y + "" + x}
            value={col}
            coordinate={[x, y]}
            gameId={gameId}
          />
        );
      })}
    </div>
  );
}

type CellProps = {
  value: string | number;
  coordinate: [number, number];
  gameId: number;
};
function Cell(props: CellProps) {
  const { value, coordinate, gameId } = props;
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
        if (isRevealed) {
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
        if (isRevealed || value === "+") {
          return;
        }
        if (event.buttons === 1) {
          event?.currentTarget.classList.add("revealed");
        }
      }}
      onMouseUp={(event) => {
        if (isRevealed || event.button === 2 || value === "+") {
          return;
        }
        const coordinate = event.currentTarget.dataset["coordinate"];
        revealTileMutation.mutate({
          gameId: gameId,
          coordinate: coordinate,
        });
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
