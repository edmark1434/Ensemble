import { memo, useCallback, useEffect, useRef, useState } from "react";
import useLayoutStore from "./store/use-layout-store";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { MenuItem } from "./menu-item/menu-item";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Upload, Video, Image, Music, Type, Captions, Shuffle } from "lucide-react";

const MENU_ITEMS = [
  { id: "uploads",     icon: Upload,   label: "Uploads",     ariaLabel: "Add and manage uploads" },
  { id: "videos",      icon: Video,    label: "Videos",      ariaLabel: "Add and manage video content" },
  { id: "images",      icon: Image,    label: "Images",      ariaLabel: "Add and manage images" },
  { id: "audios",      icon: Music,    label: "Audio",       ariaLabel: "Add and manage audio content" },
  { id: "texts",       icon: Type,     label: "Texts",       ariaLabel: "Add and edit text elements" },
  { id: "captions",    icon: Captions, label: "Captions",    ariaLabel: "Add and edit captions" },
  { id: "transitions", icon: Shuffle,  label: "Transitions", ariaLabel: "Add transition effects" },
] as const;

// Memoized menu button component for better performance
const MenuButton = memo<{
  item: (typeof MENU_ITEMS)[number];
  isActive: boolean;
  onClick: (menuItem: string) => void;
}>(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [item.id, onClick]);

  const IconComponent = item.icon;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center flex-none h-7.5 w-7.5 cursor-pointer rounded-sm transition-all duration-200",
        isActive
          ? "bg-white/10 text-white"
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
      key={item.id}
    >
      <Tooltip delayDuration={10}>
        <TooltipTrigger asChild>
          <IconComponent size={18} />
        </TooltipTrigger>
        <TooltipContent side="right" align="center" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

MenuButton.displayName = "MenuButton";

// Main MenuList component
function MenuList() {
  const {
    setActiveMenuItem,
    setShowMenuItem,
    activeMenuItem,
    showMenuItem,
    drawerOpen,
    setDrawerOpen
  } = useLayoutStore();

  const isLargeScreen = useIsLargeScreen();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const handleMenuItemClick = useCallback(
    (menuItem: string) => {
      if (!isLargeScreen) {
        setActiveMenuItem(menuItem as any);
        setDrawerOpen(true);
      } else {
        if (activeMenuItem === menuItem && showMenuItem) {
          // Clicking the active item collapses the sidebar
          setShowMenuItem(false);
        } else {
          setActiveMenuItem(menuItem as any);
          setShowMenuItem(true);
        }
      }
    },
    [isLargeScreen, activeMenuItem, showMenuItem, setActiveMenuItem, setDrawerOpen, setShowMenuItem]
  );

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      setDrawerOpen(open);
    },
    [setDrawerOpen]
  );

  const checkScrollPosition = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    checkScrollPosition();
    element.addEventListener("scroll", checkScrollPosition);

    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <>
      <div className="relative flex items-center bg-card">
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-card to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hidden! w-full"
        >
          <div className="flex flex-col items-center gap-2 w-fit mx-auto px-3">
            {MENU_ITEMS.map((item) => {
              const isActive =
                (drawerOpen && activeMenuItem === item.id) ||
                (showMenuItem && activeMenuItem === item.id);
              return (
                <MenuButton
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  onClick={handleMenuItemClick}
                />
              );
            })}
          </div>
        </div>

        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-card to-transparent z-10 pointer-events-none" />
        )}
      </div>

      {/* Drawer only on mobile/tablet - conditionally mounted */}
    </>
  );
}

export default memo(MenuList);
