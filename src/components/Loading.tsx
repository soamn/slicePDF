type SlantedLoaderProps = {
  label?: string;
};

const Loader = ({ label = "Processing..." }: SlantedLoaderProps) => {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md">
      {/* Label placed above the animation */}
      <p className="mb-6 text-sm font-semibold tracking-widest text-gray-600 uppercase animate-pulse">
        {label}
      </p>

      {/* Repeating Animation: Staggered Bouncing Dots */}
      <div className="flex space-x-2">
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
      </div>

      {/* Optional: Subtle glow effect behind the dots */}
      <div className="absolute w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -z-10"></div>
    </div>
  );
};

export default Loader;
