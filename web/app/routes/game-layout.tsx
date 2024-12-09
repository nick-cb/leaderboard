import { useMutation } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";

export default function GameLayout() {
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
      navigate(`/game/${data.id}`);
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          mutation.mutate();
        }}
      >
        New game
      </button>
      <Outlet />
    </div>
  );
}
