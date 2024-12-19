import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { flushSync } from "react-dom";
import { queryClient } from "~/root";

export default function Game({ params }: any) {
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
  const board: any[] = data?.board;
  if (!data) {
    console.log({ data });
    return <div>There is no game here</div>;
  }

  return (
    <div className={"flex board w-max relative flex-col"}>
      {/* <button onClick={() => setState(!state)}>ABC</button> */}
      {board.map((row: Array<number | string>, rowNumber) => {
        return <Row key={rowNumber} row={row} y={rowNumber} gameId={gameId} />;
      })}
    </div>
  );
}

const Row = React.memo(
  (props: { row: Array<string | number>; y: number; gameId: number }) => {
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
);

const Cell = React.memo(
  (props: {
    value: string | number;
    coordinate: [number, number];
    gameId: number;
  }) => {
    const { value, coordinate, gameId } = props;
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
      const coordinate = event.currentTarget.dataset["coordinate"];
      event.preventDefault();
      flagTileMutation.mutate({
        gameId: gameId,
        coordinate: coordinate,
      });
    }

    function handleClick(event: React.MouseEvent<HTMLDivElement>) {
      event.currentTarget.classList.add("revealed");
      const coordinate = event.currentTarget.dataset["coordinate"];
      revealTileMutation.mutate({
        gameId: gameId,
        coordinate: coordinate,
      });
    }

    function handleMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
      if (typeof value === "number" || value === "-") {
        return;
      }
      event.currentTarget.classList.remove("revealed");
    }

    return (
      <div
        data-coordinate={`${coordinate[0]},${coordinate[1]}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseLeave}
        className={
          "cell w-8 h-8 text-center cursor-default bg-[#4D545C]" +
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
              ? "#172554"
              : value === "5"
              ? "#4c0519"
              : value === 6
              ? "#06b6d4"
              : value === 7
              ? "#000"
              : value === 8
              ? "#6b7280"
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
);
