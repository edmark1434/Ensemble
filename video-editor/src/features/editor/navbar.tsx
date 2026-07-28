import React, { useCallback, useEffect, useState } from "react";
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
  ArrowUpRight, Check,
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
import useStore from "./store/use-store";
import {Kbd, KbdGroup} from "@/components/ui/kbd";

export default function Navbar({
  user,
  stateManager
}: {
  user: unknown | null;
  stateManager: StateManager;
}) {
  const isLargeScreen = useIsLargeScreen();
  const isMediumScreen = useIsMediumScreen();
  const isSmallScreen = useIsSmallScreen();
  const { isShortcutsModalOpen, setShortcutsModalOpen, projectName, setProjectName } = useStore();
  const [title, setTitle] = useState(projectName);

  const handleUndo = () => {
    dispatch(HISTORY_UNDO);
  };

  const handleRedo = () => {
    dispatch(HISTORY_REDO);
  };

  const debouncedSetProjectName = useCallback(
    debounce((name: string) => {
      setProjectName(name);
    }, 2000),
    []
  );

  useEffect(() => {
    debouncedSetProjectName(title);
  }, [title, debouncedSetProjectName]);

  useEffect(() => {
    return () => {
      debouncedSetProjectName.cancel();
    };
  }, [debouncedSetProjectName]);

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
      className="bg-primary/12 pointer-events-none flex h-14 items-center border-b border-border/80 px-2"
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
            <TooltipContent
              side="top" align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              Undo
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>Z</Kbd>
              </KbdGroup>
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
            <TooltipContent
              side="top" align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              Redo
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>Shift</Kbd>
                <span>+</span>
                <Kbd>Z</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                className="hover:!bg-accent/30 cursor-default"
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
              inputClassName="h-9 text-sm font-semibold"
            />
          </div>
        )}
      </div>

      <div className="flex h-13 items-center justify-end gap-2">
        <div className=" pointer-events-auto flex h-10 items-center gap-2 rounded-md px-2.5">
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShortcutsModalOpen(true)}
                className="hover:!bg-accent/30"
                variant="ghost"
                size="icon"
              >
                <Keyboard size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom" align="center" sideOffset={1}
              className={"flex gap-2 items-center"}
            >
              Keyboard shortcuts
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>/</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

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
        onOpenChange={setShortcutsModalOpen}
      />
    </div>
  );
}

const DownloadPopover = ({ stateManager }: { stateManager: StateManager }) => {
  const isMediumScreen = useIsMediumScreen();
  const { actions, exportType, exporting, output, error } = useDownloadState();
  const { duration, trackItemIds } = useStore();
  const isEmpty = trackItemIds.length === 0;
  const [isExportTypeOpen, setIsExportTypeOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const isCompleted = !!output;
  const isFailed = !!error;

  const buttonLabel = isCompleted
    ? "Export ready for download"
    : isFailed
      ? "Export failed"
      : "Export";

  const handleExport = () => {
    const data: IDesign = {
      ...stateManager.toJSON(),
      id: generateId(),
      duration
    };

    actions.setState({ payload: data });
    actions.startExport();
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && (isCompleted || isFailed)) {
      actions.setDisplayProgressModal(true);
      return;
    }

    if (nextOpen && exporting) {
      actions.setDisplayProgressModal(true);
      return;
    }

    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {isEmpty && !isCompleted && !isFailed ? (
          <Tooltip delayDuration={10}>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className={cn(
                    "flex h-8 gap-2 hover:!bg-accent/30 font-semibold",
                    (isCompleted || isFailed) && "!border-primary text-primary hover:!border-primary/80 hover:text-primary/80"
                  )}
                  variant={"outline"}
                  size={isMediumScreen ? "sm" : "icon"}
                  disabled={isEmpty && !isCompleted && !isFailed}
                >
                  <Download size={16} />{" "}
                  <span className="hidden md:block">{buttonLabel}</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" sideOffset={1}>
              Project is still empty
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            className={cn(
              "flex h-8 gap-2 hover:!bg-accent/30 font-semibold",
              (isCompleted || isFailed) && "!border-primary text-primary hover:!border-primary/80 hover:text-primary/80"
            )}
            variant={"outline"}
            size={isMediumScreen ? "sm" : "icon"}
            disabled={isEmpty && !isCompleted && !isFailed}
          >
            <Download size={16} />{" "}
            <span className="hidden md:block">{buttonLabel}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="bg-sidebar z-[250] flex w-60 flex-col gap-4"
      >
        <Label className="font-semibold">Export settings</Label>

        <Popover open={isExportTypeOpen} onOpenChange={setIsExportTypeOpen}>
          <PopoverTrigger asChild>
            <Button className="w-full justify-between" variant="outline">
              <div>{exportType.toUpperCase()}</div>
              <ChevronDown width={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[251] p-0"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            {(["mp4"] as const).map((type) => (
              <div
                key={type}
                onClick={() => {
                  actions.setExportType(type);
                  setIsExportTypeOpen(false);
                }}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
              >
                {type.toUpperCase()}
                {type === exportType && (
                  <Check size={14} className="text-muted-foreground" />
                )}
              </div>
            ))}
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
