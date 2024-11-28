import { useQuery } from "@tanstack/react-query";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const { data } = useQuery({
    queryKey: ["new-game"],
    queryFn: async () => {
      const url = new URL("http://localhost:8000/game/new");
      url.searchParams.set("mode", "intermediate");
      const response = await fetch(url);
      const data = await response.json();
      return data;
    },
  });
  if (!data) {
    return <div>There is no game here</div>;
  }

  return (
    <div className={"flex"}>
      {data.game.map((row: Array<number | string>) => {
        return (
          <div>
            {row.map((col, index) => {
              return (
                <div key={index} className={"w-8 h-8 border border-black text-center"}>
                  {col}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
