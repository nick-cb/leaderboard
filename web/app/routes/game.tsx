import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "~/root";

export default function Game({ params }: any) {
  const gameId = params.gameId;
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
    return <div>There is no game here</div>;
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const coordinate = event.currentTarget.dataset["coordinate"];
    revealTileMutation.mutate({
      gameId: gameId,
      coordinate: coordinate,
    });
  }

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    const coordinate = event.currentTarget.dataset["coordinate"];
    event.preventDefault();
    flagTileMutation.mutate({
      gameId: gameId,
      coordinate: coordinate,
    });
  }

  return (
    <div className={"flex"}>
      {board.map((row: Array<number | string>, rowNumber) => {
        return (
          <div key={rowNumber}>
            {row.map((col, colNumber) => {
              return (
                <div
                  key={colNumber}
                  data-coordinate={`${colNumber},${rowNumber}`}
                  onClick={handleClick}
                  onContextMenu={handleContextMenu}
                  className={"w-8 h-8 border border-black text-center"}
                  style={{
                    color:
                      col === 1
                        ? "#3b82f6"
                        : col === 2
                        ? "#22c55e"
                        : col === 3
                        ? "#f43f5e"
                        : col === 4
                        ? "#172554"
                        : col === "5"
                        ? "#4c0519"
                        : col === 6
                        ? "#06b6d4"
                        : col === 7
                        ? "#000"
                        : col === 8
                        ? "#6b7280"
                        : "",
                  }}
                >
                  {col === "+" ? "🚩" : col === 0 ? "" : col === 9 ? "💣" : col}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
