import { useEffect, useRef, useState } from "react";

interface GamepadSnapshot {
  id: string;
  axes: number[];
  buttons: boolean[];
  connected: boolean;
  timestamp: number;
}

export const useGamepad = (deadzone = 0.12) => {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot>({
    id: "",
    axes: [],
    buttons: [],
    connected: false,
    timestamp: 0,
  });

  const rafRef = useRef<number>();
  const deadzoneRef = useRef(deadzone);
  deadzoneRef.current = deadzone;

  useEffect(() => {
    const poll = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const pad = pads.find((p): p is Gamepad => Boolean(p && p.connected));

      if (pad) {
        const axes = pad.axes.map((value) => {
          if (Math.abs(value) < deadzoneRef.current) return 0;
          return Number(value.toFixed(3));
        });
        const buttons = pad.buttons.map((btn) => btn.pressed);

        setSnapshot({
          id: pad.id,
          axes,
          buttons,
          connected: true,
          timestamp: pad.timestamp,
        });
      } else if (snapshot.connected) {
        setSnapshot({
          id: "",
          axes: [],
          buttons: [],
          connected: false,
          timestamp: Date.now(),
        });
      }

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [snapshot.connected]);

  return snapshot;
};


