import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Cell } from "~/game/cell";
import { Clock } from "~/game/clock";
import { ProgressSlider } from "~/game/progress-slider";

export default function Game({ params }: any) {
  let navigate = useNavigate();
  const gameId = params.gameId;
  const [runClock, setRunClock] = useState(false);

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
  if (typeof result === "number" && runClock) {
    setRunClock(false);
  }
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

  const { data: actionLogData } = useQuery({
    queryKey: ["action-logs", gameId],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:8000/game/${gameId}/action-logs`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      return response.json();
    },
  });

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
      <div className="option-pane flex justify-between p-2">
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
        <Clock key={gameId} run={runClock} />
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
                    onReveal={() => {
                      if (!runClock) {
                        setRunClock(true);
                      }
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <ProgressSlider duration={actionLogData?.duration} />
    </div>
  );
}
