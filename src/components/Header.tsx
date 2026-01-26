import { X, Search, ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { ToolCard } from "./ToolCard";
export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  const mascotIcons = [
    "mascot/small-working-en.png",
    "mascot/working-en.png",
    "mascot/sleepy-en.png",
    "mascot/chill-en.png",
  ];

  const [mascot, setMascot] = useState(mascotIcons[0]);

  useEffect(() => {
    const random = mascotIcons[Math.floor(Math.random() * mascotIcons.length)];
    setMascot(random);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    if (term.length > 0) {
      const results = toolData.tools.filter(
        (tool) =>
          tool.title.toLowerCase().includes(term) ||
          tool.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
      setFilteredTools(results);
      setShowSearch(true);
    } else {
      setFilteredTools([]);
      setShowSearch(false);
    }
  }, [searchTerm]);

  return (
    <header
      data-tauri-drag-region
      className="w-full bg-transparent backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="mx-auto px-4 h-16 grid grid-cols-3 items-center">
        <div className="flex space-x-1">
          {isHome ? (
            <>
              <button className="p-2 w-15  relative rounded-lg hover:bg-black/5 ">
                <img
                  src={mascot}
                  className="absolute  -top-5 object-cover"
                  alt="Mascot"
                />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-black/5"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold lg:text-3xl md:text-xl text-md ">
              SlicePDF
            </span>
          </Link>
        </div>
        <form
          ref={searchRef}
          className="relative flex-1 max-w-lg justify-self-center"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-2 bg-gray-100 rounded-2xl outline-none text-sm"
              placeholder="Search tools..."
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 p-1 rounded-full bg-gray-200 "
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {showSearch && (
            <div className="absolute top-full mt-3 w-full bg-white rounded-3xl shadow-xl border max-h-[60vh] overflow-y-auto z-1000">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool) => (
                  <Link
                    key={tool.id}
                    to={tool.link}
                    onClick={() => setShowSearch(false)}
                    className="block p-2 hover:bg-gray-50"
                  >
                    <ToolCard {...tool} hide={false} />
                  </Link>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-gray-400">
                  No tools found
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </header>
  );
};

export default Header;
