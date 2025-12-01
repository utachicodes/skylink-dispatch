import { memo } from "react";

const haloGradients = [
  "linear-gradient(140deg, rgba(83,94,104,0.45) 0%, rgba(20,23,32,0) 65%)",
  "radial-gradient(circle at 20% 20%, rgba(123,140,160,0.35), transparent 55%)",
  "radial-gradient(circle at 80% 10%, rgba(255,255,255,0.15), transparent 40%)",
];

const AeroBackdrop = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#040506] text-foreground pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 opacity-[0.85] mix-blend-screen blur-2xl" style={{ backgroundImage: haloGradients.join(",") }} />
      <div className="absolute inset-0">
        <div className="h-full w-full bg-[radial-gradient(circle,_rgba(255,255,255,0.04)_1px,_transparent_1px)] [background-size:60px_60px] opacity-30 translate-y-4" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(18,20,30,0.75),_rgba(4,6,8,0.95))]" />
      <div className="absolute inset-x-0 top-[10%] h-64 blur-[120px] opacity-70 bg-gradient-to-r from-gray-600/20 via-white/10 to-gray-600/20" />
    </div>
  );
};

export default memo(AeroBackdrop);

