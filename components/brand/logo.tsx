import { clsx } from "clsx";

type LogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "light" | "dark";
  withTagline?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: "text-2xl", sub: "text-[9px]", subsub: "text-[8px]", bar: "w-[3px]", gap: "gap-2" },
  md: { mark: "text-[30px]", sub: "text-[11px]", subsub: "text-[9px]", bar: "w-1", gap: "gap-2.5" },
  lg: { mark: "text-5xl", sub: "text-sm", subsub: "text-xs", bar: "w-1.5", gap: "gap-3" },
  xl: { mark: "text-7xl md:text-8xl", sub: "text-lg md:text-xl", subsub: "text-sm md:text-base", bar: "w-2", gap: "gap-4" },
};

/** DIHA-Wortmarke nach dem One-Pager: Balken + „DIH“ + rotes „A“, Untertitel. */
export function Logo({ size = "md", tone = "light", withTagline = true, className }: LogoProps) {
  const s = sizes[size];
  const dark = tone === "dark";
  return (
    <span className={clsx("inline-flex items-stretch select-none", s.gap, className)} aria-label="DIHA – Drone Innovation Hub Austria – a company by AEEG" role="img">
      <span className={clsx("shrink-0 bg-signal", s.bar)} aria-hidden="true" />
      <span className="flex flex-col justify-center leading-none" aria-hidden="true">
        <span className={clsx("font-extrabold tracking-[0.02em]", s.mark, dark ? "text-white" : "text-ink")}>
          DIH<span className="text-signal">A</span>
        </span>
        {withTagline && (
          <>
            <span className={clsx("mt-[0.35em] font-medium tracking-[0.01em]", s.sub, dark ? "text-stone-2" : "text-graphite")}>
              Drone Innovation Hub Austria
            </span>
            <span className={clsx("mt-[0.3em] tracking-[0.04em]", s.subsub, dark ? "text-[#9aa0a8]" : "text-graphite-2")}>a company by AEEG</span>
          </>
        )}
      </span>
    </span>
  );
}
