import { Label } from "@/components/ui/label";
import useStore from "../../store/use-store";
import { NameField, SizeFields, BackgroundField, patchProject } from "./composition-controls";

export const ProjectControls = () => {
  const { projectId, projectName, setProjectName, size, background, setState } = useStore();

  const handleNameCommit = async (name: string) => {
    const previous = projectName;
    setProjectName(name);
    try {
      await patchProject(projectId, { name });
    } catch (err) {
      console.error("Failed to save project name", err);
      setProjectName(previous);
    }
  };

  const handleSizeCommit = async (width: number, height: number) => {
    const previous = size;
    setState({ size: { width, height } });
    try {
      await patchProject(projectId, { width, height });
    } catch (err) {
      console.error("Failed to save project size", err);
      setState({ size: previous });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="font-sans text-sm font-semibold">Project</Label>
        <div className="flex flex-col gap-3">
          <NameField value={projectName} maxLength={50} onCommit={handleNameCommit} />
          <SizeFields width={size.width} height={size.height} onCommit={handleSizeCommit} />
          <BackgroundField
            value={background.value}
            onChange={(v) => setState({ background: { type: "color", value: v } })}
          />
        </div>
      </div>
    </div>
  );
};