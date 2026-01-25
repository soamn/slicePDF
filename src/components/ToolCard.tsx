import * as Icons from "lucide-react";
import { Tool } from "../types/tools";

interface ToolCardProps extends Tool {
  onClick?: () => void;
  hide: boolean;
}

const colorStyles = {
  primary:
    "bg-blue-500/10 text-blue-500 group-hover:text-white group-hover:bg-blue-500",
  accent:
    "bg-orange-500/10 text-orange-500 group-hover:text-white group-hover:bg-orange-500",
  teal: "bg-teal-500/10 text-teal-500 group-hover:text-white group-hover:bg-teal-500",
  coral:
    "bg-cyan-500/10 text-coral-500 group-hover:text-white group-hover:bg-cyan-500",
};

export const ToolCard = ({
  title,
  description,
  icon,
  color,
  onClick,
  hide,
  mascot,
}: ToolCardProps) => {
  const Icon =
    typeof icon === "string"
      ? ((Icons as any)[icon] ?? (Icons as any).File)
      : (icon as any);

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-4 p-6 rounded-xl  
    text-left w-full "
    >
      <div
        className={`p-3 rounded-lg transition-all duration-300${
          colorStyles[color as keyof typeof colorStyles] ?? ""
        }`}
      >
        {hide ? (
          <div className="relative w-20 h-20 group cursor-pointer">
            {/* Image */}
            <img
              src={mascot}
              alt=""
              className="
      absolute inset-0 w-full h-full
      opacity-0
      transition-opacity duration-300
      group-hover:opacity-100

      will-change:opacity
      backface-hidden
      translate-z-0
    "
            />

            {/* Icon */}
            <Icon
              className="
      absolute inset-0 m-auto
      w-6 h-6
      opacity-100
      transition-opacity duration-300
      group-hover:opacity-0

      will-change:opacity
      backface-hidden
      translate-z-0
    "
            />
          </div>
        ) : (
          <Icon className="w-6 h-6" />
        )}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-lg text-card-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div
        hidden={hide}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
};
