'use client';

import { animationInterval } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function Clock({ run }: { run: boolean }) {
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
