import React from "react";
import { MousePointer2 } from "lucide-react";

const BasicProject = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
      <MousePointer2 size={32} className="opacity-50" />
      <span className="text-sm">No item selected</span>
    </div>
  );
};

export default BasicProject;