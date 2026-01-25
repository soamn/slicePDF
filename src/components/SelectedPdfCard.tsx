import { FileCheck } from "lucide-react";

const SelectedFileCard = ({ fileName }: { fileName: string }) => (
  <div className="mt-6 flex items-center gap-4 rounded-xl border border-dashed  px-5 py-4 shadow-sm w-full">
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
      <FileCheck size={26} />
    </div>
    <div className="overflow-hidden">
      <p className="text-sm font-semibold truncate">{fileName}</p>
      <p className="text-xs text-muted-foreground">File selected and ready</p>
    </div>
  </div>
);

export default SelectedFileCard;
