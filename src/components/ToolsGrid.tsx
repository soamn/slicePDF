import { useNavigate } from "react-router-dom";
import { ToolCard } from "./ToolCard";
import toolData from "../data/tools.json";
import { Tool } from "../types/tools";

const tools: Tool[] = toolData.tools;

export const ToolsGrid = () => {
  const navigate = useNavigate();
  const handleToolClick = (link: string) => {
    navigate(link);
  };

  return (
    <section id="tools" className="py-20 bg-white/30">
      <div className="container mx-auto px-4 ">
        <div className="flex  items-center   justify-evenly">
          <img
            src="mascot/zesty-en.png"
            className="w-20 md:w-30  lg:w-40  "
            alt=""
          />
          <div className="text-center mb-12 flex flex-col">
            <h2 className="text-xl md:text-3xl lg:text-6xl font-extrabold text-foreground mb-4">
              All the Tools You Need
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional-grade file conversion and editing tools, completely
              free and easy to use
            </p>
          </div>
          <img
            src="mascot/working-en.png"
            className="w-20 md:w-30 lg:w-40 "
            alt=""
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto *:shadow *:hover:shadow-lg *:hover:shadow-blue-100 *:transition-all *:duration-300 *:hover:-translate-y-1 ">
          {tools.map((tool) => (
            <ToolCard
              hide={false}
              key={tool.title}
              {...tool}
              onClick={() => handleToolClick(tool.link)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
