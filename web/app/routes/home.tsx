import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "./+types/home";
import { useState } from "react";
import { queryClient } from "~/root";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  let navigate = useNavigate();
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
      navigate(`/game/${data.id}`)
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
