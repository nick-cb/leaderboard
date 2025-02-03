'use client';

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function GameLayout({ children }: React.PropsWithChildren) {
  const router = useRouter();
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
      router.push(`/game/${data.id}`);
    },
  });

  return (
    <div className={'flex flex-col items-center'}>
      <ul className="flex gap-4 text-blue-300 py-4">
        <li>Easy</li>
        <li className="font-bold text-white">Intermidiate</li>
        <li>Hard</li>
      </ul>
      {children}
    </div>
  );
}
