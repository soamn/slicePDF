import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import NoFilesYet from "../components/NoFilesYet";
import SelectedFileCard from "../components/SelectedPdfCard";
import { listen } from "@tauri-apps/api/event";
import Loader from "../components/Loading";

const ImageToPdf = () => {
  const [inputPath, setInputPath] = useState<string | null>();
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const openFilePicker = async () => {
    const path = await takePath();
    if (!path) {
      return;
    } else if (path == null) {
      alert("invalid path");
      return;
    }
    setInputPath(path);
    setFileName(path.split(/[\\/]/).pop() ?? "");
  };
  const takePath = async () => {
    const path = await open({
      multiple: false,
      filters: [
        {
          name: "Image File",
          extensions: ["jpg", "png", "webp", "jpeg", "svg"],
        },
      ],
    });
    if (typeof path === "string") {
      console.log(path);
      return path;
    }
    return null;
  };

  const convertToPdf = async () => {
    setLoading(true);
    try {
      await invoke("img_to_pdf", {
        inputPath,
        fileName,
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };
  const clearImage = () => {
    setInputPath(null);
    setFileName("");
  };
  const id = "image-to-pdf";
  const tool: Tool | undefined = toolData.tools.find((tool) => tool.id === id);
  if (!tool) {
    return <div className="p-4 text-red-500">Tool not found</div>;
  }

  useEffect(() => {
    const done = listen<string>("img-to-pdf-done", (e) => {
      setLoading(false);
      clearImage();
      alert(e.payload);
    });

    const error = listen<string>("img-to-pdf-error", (_e) => {
      clearImage();
      setLoading(false);
      alert("Failed To convert");
    });
    return () => {
      done.then((f) => f());
      error.then((f) => f());
    };
  }, []);
  return (
    <>
      <div className="w-full h-full lg:px-50 lg:py-30 p-10">
        {loading && <Loader label="converting Image to pdf" />}
        <div className="w-full flex flex-col items-center justify-center gap-5">
          <ToolCard
            hide={true}
            id={tool.id}
            title={tool?.title}
            description={tool.description}
            icon={tool.icon}
            color={tool.color}
            link={tool.link}
            tags={tool.tags}
            mascot={tool.mascot}
          />
          <button
            type="button"
            onClick={openFilePicker}
            className="px-8 py-4 w-full 
            bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all duration-300 border border-border text-xl"
          >
            Upload an Image
          </button>
          {inputPath == null ? (
            <NoFilesYet />
          ) : (
            <>
              <SelectedFileCard fileName={fileName} />
              <button
                disabled={inputPath == null}
                type="button"
                onClick={convertToPdf}
                className="px-8 py-4 w-full  disabled:opacity-30   text-xl  
             disabled:text-warm-foreground hover:text-white disabled:hover:text-black hover:bg-warm disabled:bg-blue-500/10 text-warm
            font-semibold rounded-xl  transition-all duration-300 border border-border"
              >
                Convert
              </button>
              <button
                onClick={clearImage}
                disabled={inputPath == null}
                className="px-6 py-3  w-full  disabled:opacity-50  font-semibold rounded-xl  border border-red-300 cursor-pointer"
              >
                Clear
              </button>
            </>
          )}
          ;
        </div>
      </div>
    </>
  );
};
export default ImageToPdf;
