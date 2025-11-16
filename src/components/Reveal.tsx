import { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface RevealProps {
  children: ReactNode;
  delayClass?: string;
  className?: string;
}

export const Reveal = ({ children, delayClass = "", className = "" }: RevealProps) => {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700",
        inView ? "animate-fade-up opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        delayClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};


