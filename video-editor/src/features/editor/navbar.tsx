import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import { HISTORY_UNDO, HISTORY_REDO, DESIGN_RESIZE } from "@designcombo/state";
import { Icons } from "@/components/shared/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Keyboard,
  ProportionsIcon,
  Send,
  ShareIcon
} from "lucide-react";
import { Label } from "@/components/ui/label";

import type StateManager from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import type { IDesign } from "@designcombo/types";
import { useDownloadState } from "./store/use-download-state";
import DownloadProgressModal from "./download-progress-modal";
import AutosizeInput from "@/components/ui/autosize-input";
import { debounce } from "lodash";
import {
  useIsLargeScreen,
  useIsMediumScreen,
  useIsSmallScreen
} from "@/hooks/use-media-query";
import {
  CloudCheck
} from "lucide-react";

import { LogoIcons } from "@/components/shared/logos";
import Link from "next/link";
import { ShortcutsModal } from "./shortcuts-modal";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

export default function Navbar({
  user,
  stateManager,
  setProjectName,
  projectName
}: {
  user: any | null;
  stateManager: StateManager;
  setProjectName: (name: string) => void;
  projectName: string;
}) {
  const [title, setTitle] = useState(projectName);
  const isLargeScreen = useIsLargeScreen();
  const isMediumScreen = useIsMediumScreen();
  const isSmallScreen = useIsSmallScreen();
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const handleUndo = () => {
    dispatch(HISTORY_UNDO);
  };

  const handleRedo = () => {
    dispatch(HISTORY_REDO);
  };

  const handleCreateProject = async () => {};

  // Create a debounced function for setting the project name
  const debouncedSetProjectName = useCallback(
    debounce((name: string) => {
      console.log("Debounced setProjectName:", name);
      setProjectName(name);
    }, 2000), // 2 seconds delay
    []
  );

  // Update the debounced function whenever the title changes
  useEffect(() => {
    debouncedSetProjectName(title);
  }, [title, debouncedSetProjectName]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const sub = stateManager.subscribe(() => {
      setCanUndo(stateManager.undos.length > 0);
      setCanRedo(stateManager.redos.length > 0);
    });
    return () => sub.unsubscribe();
  }, [stateManager]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isLargeScreen ? "320px 1fr 320px" : "1fr 1fr 1fr"
      }}
      className="bg-primary/12 pointer-events-none flex h-13 items-center border-b border-border/80 px-2"
    >
      <DownloadProgressModal />

      <div className="flex items-center gap-2">
        <div className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-md invert dark:invert-0">
          <LogoIcons.ensemble />
        </div>

        <div className=" pointer-events-auto flex h-10 items-center px-1.5">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                  onClick={handleUndo}
                  className="hover:!bg-accent/30"
                  variant="ghost"
                  size="icon"
                  disabled={!canUndo}
              >
                <Icons.undo width={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={1}>
              Undo
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                  onClick={handleRedo}
                  className="hover:!bg-accent/30"
                  variant="ghost"
                  size="icon"
                  disabled={!canRedo}
              >
                <Icons.redo width={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={1}>
              Redo
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                  onClick={handleUndo}
                  className="hover:!bg-accent/30"
                  variant="ghost"
                  size="icon"
              >
                <CloudCheck size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={1}>
              All changes saved
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex h-13 items-center justify-center gap-2">
        {!isSmallScreen && (
          <div className=" pointer-events-auto flex h-8 items-center gap-2 rounded-md px-2.5">
            <AutosizeInput
              name="title"
              value={title}
              onChange={handleTitleChange}
              width={200}
              inputClassName="h-8 text-sm font-normal"
            />
          </div>
        )}
      </div>

      <div className="flex h-13 items-center justify-end gap-2">
        <div className=" pointer-events-auto flex h-10 items-center gap-2 rounded-md px-2.5">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="hover:!bg-accent/30"
                  variant="ghost"
                  size="icon"
              >
                <Keyboard size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={1}>
              Keyboard shortcuts
            </TooltipContent>
          </Tooltip>

          {/*<ModeToggle />*/}

          <DownloadPopover stateManager={stateManager} />
          <Button
            className="flex h-8 gap-2 border border-border"
            variant="default"
            size={isMediumScreen ? "sm" : "icon"}
          >
            <Send width={16} />
            <span className="hidden md:block">Share</span>
          </Button>

        </div>
      </div>
      <ShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />
    </div>
  );
}

const DownloadPopover = ({ stateManager }: { stateManager: StateManager }) => {
  const isMediumScreen = useIsMediumScreen();
  const { actions, exportType } = useDownloadState();
  const [isExportTypeOpen, setIsExportTypeOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    const data: IDesign = {
      id: generateId(),
      ...stateManager.toJSON()
    };

    console.log({ data });

    actions.setState({ payload: data });
    actions.startExport();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="flex h-8 gap-2 hover:!bg-accent/30"
          variant="outline"
          size={isMediumScreen ? "sm" : "icon"}
        >
          <Download size={16} />{" "}
          <span className="hidden md:block font-normal">Export</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="bg-sidebar z-[250] flex w-60 flex-col gap-4"
      >
        <Label>Export settings</Label>

        <Popover open={isExportTypeOpen} onOpenChange={setIsExportTypeOpen}>
          <PopoverTrigger asChild>
            <Button className="w-full justify-between" variant="outline">
              <div>{exportType.toUpperCase()}</div>
              <ChevronDown width={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-background z-[251] w-[--radix-popover-trigger-width] px-2 py-2">
            <div
              className="flex h-7 items-center rounded-sm px-3 text-sm hover:cursor-pointer hover:bg-zinc-800"
              onClick={() => {
                actions.setExportType("mp4");
                setIsExportTypeOpen(false);
              }}
            >
              MP4
            </div>
            <div
              className="flex h-7 items-center rounded-sm px-3 text-sm hover:cursor-pointer hover:bg-zinc-800"
              onClick={() => {
                actions.setExportType("json");
                setIsExportTypeOpen(false);
              }}
            >
              JSON
            </div>
          </PopoverContent>
        </Popover>

        <div>
          <Button onClick={handleExport} className="w-full">
            Export
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface ResizeOptionProps {
  label: string;
  icon: string;
  value: ResizeValue;
  description: string;
}

interface ResizeValue {
  width: number;
  height: number;
  name: string;
}

const RESIZE_OPTIONS: ResizeOptionProps[] = [
  {
    label: "16:9",
    icon: "landscape",
    description: "YouTube ads",
    value: {
      width: 1920,
      height: 1080,
      name: "16:9"
    }
  },
  {
    label: "9:16",
    icon: "portrait",
    description: "TikTok, YouTube Shorts",
    value: {
      width: 1080,
      height: 1920,
      name: "9:16"
    }
  },
  {
    label: "1:1",
    icon: "square",
    description: "Instagram, Facebook posts",
    value: {
      width: 1080,
      height: 1080,
      name: "1:1"
    }
  }
];

const ResizeVideo = () => {
  const handleResize = (options: ResizeValue) => {
    dispatch(DESIGN_RESIZE, {
      payload: {
        ...options
      }
    });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="z-10 h-7 gap-2" variant="outline" size={"sm"}>
          <ProportionsIcon className="h-4 w-4" />
          <div>Resize</div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[250] w-60 px-2.5 py-3">
        <div className="text-sm">
          {RESIZE_OPTIONS.map((option, index) => (
            <ResizeOption
              key={index}
              label={option.label}
              icon={option.icon}
              value={option.value}
              handleResize={handleResize}
              description={option.description}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ResizeOption = ({
  label,
  icon,
  value,
  description,
  handleResize
}: ResizeOptionProps & { handleResize: (payload: ResizeValue) => void }) => {
  const Icon = Icons[icon as "text"];
  return (
    <div
      onClick={() => handleResize(value)}
      className="flex cursor-pointer items-center rounded-md p-2 hover:bg-zinc-50/10"
    >
      <div className="w-8 text-muted-foreground">
        <Icon size={20} />
      </div>
      <div>
        <div>{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
};
