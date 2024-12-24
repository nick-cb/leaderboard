import { useMutation } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";

export default function GameLayout() {
  let navigate = useNavigate();
  const mutation = useMutation({
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

  return (
    <div>
      <ul className="flex gap-4 text-blue-300 py-4">
        <li>Easy</li>
        <li className="font-bold text-white">Intermidiate</li>
        <li>Hard</li>
      </ul>
      <Outlet />
    </div>
  );
}
