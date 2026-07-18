interface Props {
  src: string;
  className?: string;
  /** no frame/shadow — for transparent images like state silhouettes */
  plain?: boolean;
}

export function FlagDisplay({ src, className = "", plain = false }: Props) {
  return (
    <div className={`flex justify-center ${className}`}>
      <img
        src={src}
        alt={plain ? "Mystery state" : "Mystery flag"}
        draggable={false}
        className={`max-h-44 w-auto max-w-full animate-pop-in ${
          plain
            ? "drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            : "rounded-lg shadow-2xl shadow-black/50 ring-1 ring-white/20"
        }`}
      />
    </div>
  );
}
