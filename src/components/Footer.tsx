export const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Left: Brand + Links */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-lg text-foreground">
                SlicePDF
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SlicedApple Studios
            </p>
          </div>

          {/* Right: Mascot */}
          <div className="flex justify-end">
            <img
              src="mascot/chill-en.png"
              alt="SlicePDF mascot"
              className="w-24 opacity-90 select-none pointer-events-none"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
