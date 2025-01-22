import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { queryClient } from "~/root";
import { Play } from "lucide-react";

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

type CellProps = {
  value: string | number;
  coordinate: [number, number];
  gameId: number;
  revealableNeigbors: { x: number; y: number }[];
  flaggedNeighbors: { x: number; y: number }[];
  onReveal: () => void;
};
function Cell(props: CellProps) {
  const {
    value,
    coordinate,
    gameId,
    revealableNeigbors,
    flaggedNeighbors,
    onReveal,
  } = props;
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
      let coordinate: any = event.currentTarget.dataset["coordinate"];
      coordinate = coordinate?.split(",");
      coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
      for (const { x, y } of revealableNeigbors) {
        const node = document.querySelector(`[data-coordinate="${x},${y}"]`);
        if (node instanceof HTMLDivElement) {
          node.classList.add("revealed");
        }
      }
      return;
    }
    if (event.buttons === 1) {
      event?.currentTarget.classList.add("revealed");
    }
  }

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button === 2 || value === "+") {
      return;
    }
    let coordinate: any = event.currentTarget.dataset["coordinate"];

    if (isRevealed && revealableNeigbors.length) {
      logActionMutation.mutate({ gameId, coordinate, action: "reveal-adj" });
      if (flaggedNeighbors.length === value) {
        revealAdjTilesMutation.mutate({
          gameId: gameId,
          coordinate: coordinate,
        });
        for (const { x, y } of revealableNeigbors) {
          onReveal();
        }
      } else {
        coordinate = coordinate?.split(",");
        coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
        for (const { x, y } of revealableNeigbors) {
          const node = document.querySelector(`[data-coordinate="${x},${y}"]`);
          if (node instanceof HTMLDivElement) {
            node.classList.remove("revealed");
          }
        }
      }
      return;
    }

    if (!isRevealed) {
      logActionMutation.mutate({ gameId, coordinate, action: "reveal" });
      revealTileMutation.mutate({
        gameId: gameId,
        coordinate: coordinate,
      });
      onReveal();
    }
  }

  return (
    <div
      data-coordinate={`${coordinate[0]},${coordinate[1]}`}
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

function animationInterval(
  ms: number,
  signal: AbortSignal,
  callback: Function
) {
  // Prefer currentTime, as it'll better sync animtions queued in the
  // same frame, but if it isn't supported, performance.now() is fine.
  const start = document.timeline
    ? (document.timeline.currentTime as number)
    : performance.now();

  function frame(time: number) {
    if (signal.aborted) return;
    callback(time);
    scheduleFrame(time);
  }

  function scheduleFrame(time: number) {
    const elapsed = time - start;
    const roundedElapsed = Math.round(elapsed / ms) * ms;
    const targetNext = start + roundedElapsed + ms;
    const delay = targetNext - performance.now();
    setTimeout(() => requestAnimationFrame(frame), delay);
  }

  scheduleFrame(start);
}

function Clock({ run }: { run: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!run) {
      return;
    }
    const controller = new AbortController();
    let time = 0;
    animationInterval(1000, controller.signal, () => {
      const target = ref.current;
      time += 1;
      if (time >= 999) {
        controller.abort();
      }
      if (target) {
        target.innerHTML = time.toString().padStart(3, "0");
      }
    });
    return () => {
      controller.abort();
    };
  }, [run]);

  return (
    <div className={"clock-panel p-1 text-3xl font-bold bg-black select-none"}>
      <span className={"block absolute inset-1 text-[#400000]"}>000</span>
      <div ref={ref} className={"clock text-[#CC0100] relative"}>
        000
      </div>
    </div>
  );
}

type ProgressSliderProps = {
  duration: number;
};
function ProgressSlider(props: ProgressSliderProps) {
  const { duration = 0 } = props;
  const [value, setValue] = useState(0);
  const [length, setLenght] = useState(0);

  return (
    <div className={"flex items-center gap-2 p-2"}>
      <button className={"play-progress-btn w-7 h-7 flex justify-center items-center relative"}>
        <Play className={"w-4 h-4"} color={"#AFB8BF"} fill={"#AFB8BF"} />
      </button>
      <div className={"relative w-full"}>
        <input
          type="range"
          min={0}
          max={duration}
          step={1 / 1000}
          onInput={(event) =>
            setValue(Math.floor(event.currentTarget.valueAsNumber))
          }
          ref={useCallback((current: HTMLInputElement) => {
            setLenght(current?.clientWidth ?? 0);
          }, [])}
          className={"action-logs-progress w-full"}
        />
        <div
          className={
            "action-logs-progress-thumb w-5 h-5 absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer pointer-events-none"
          }
          style={{
            transform: `translate(${value / (duration / length)}px,-50%)`,
          }}
        />
      </div>
    </div>
  );
}
