'use client';

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function Home() {
  let route = useRouter();
  const mutation = useMutation({
    mutationKey: ["new-game"],
    mutationFn: async () => {
      const url = new URL("http://localhost:8000/game/new");
      url.searchParams.set("mode", "2");
      const response = await fetch(url);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      route.push(`/game?gameId=${data.id}`);
    },
  });

  return (
    <button
      onClick={() => {
        mutation.mutate();
      }}
    >
      New game
    </button>
  );
}
