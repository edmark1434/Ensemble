"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { ControlItem } from "./control-item";
import { MenuItem } from "./menu-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import MenuListHorizontal from "./menu-list-horizontal";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import { design } from "./mock";
import { Separator } from "@/components/ui/separator";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// ts not getting used
const stateManager = new StateManager({
  size: {
    width: 1920,
    height: 1080,
  },
});

const SceneContainer = ({
  sceneRef,
  playerRef,
  stateManager,
  trackItem,
  loaded,
  isLargeScreen,
}: any) => {

  const { showMenuItem } = useLayoutStore();

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      <div className="flex-1 relative overflow-hidden w-full h-full">
        <div className="flex h-full flex-1">
          <div className="flex w-[54px] h-full bg-card border-r border-border/80">
            <MenuList />
            <FloatingControl />
          </div>

          <Separator orientation="vertical" />

          <ResizablePanelGroup
              direction="horizontal"
              className="w-full h-full overflow-hidden"
              key={showMenuItem ? "with-menu" : "without-menu"}
          >

            {showMenuItem && (
              <>
                <ResizablePanel
                    defaultSize={30}
                    minSize={30}
                    maxSize={40}
                >
                  <MenuItem />
                </ResizablePanel>
                <ResizableHandle className="bg-border/90" />
              </>
            )}

            <ResizablePanel
                defaultSize={showMenuItem ? 40 : 70}
                minSize={showMenuItem ? 30 : 50}
                maxSize={showMenuItem ? 40 : 70}
                className="max-w-7xl relative bg-card min-w-0 overflow-visible!"
            >
              <div className="flex-1 relative overflow-hidden w-full h-full">
                <CropModal />
                <Scene ref={sceneRef} stateManager={stateManager} />
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-border/90" />
            <ResizablePanel
                defaultSize={showMenuItem ? 30 : 30}
                minSize={showMenuItem ? 30 : 30}
                maxSize={showMenuItem ? 40 : 50}
                className="max-w-7xl relative bg-card min-w-0 overflow-visible!"
            >
              <Controls />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <div className="w-full border-t border-border/80 bg-card">
        {playerRef && <Timeline stateManager={stateManager} />}
      </div>

      {!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
      {!isLargeScreen && trackItem && <ControlItemHorizontal />}
    </div>
  );
};

// const Sidebar = () => {
//   const { showMenuItem } = useLayoutStore();
//
//   return (
//     // h-[calc(100vh-52px)]
//     <div className="bg-card w-full flex flex-none h-full overflow-hidden">
//       <div className="flex w-full min-h-0 overflow-hidden">
//         <MenuList />
//         {showMenuItem && (
//           <>
//             <Separator orientation="vertical" />
//             <MenuItem />
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

const Controls = () => {
  return (
    // h-[calc(100vh-52px)]
    <div className="bg-card w-full flex flex-none h-full">
      <div className="flex w-full">
        <ControlItem />
      </div>
    </div>
  );
};

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
  const [projectName, setProjectName] = useState<string>("Untitled video");
  const { scene } = useSceneStore();
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const sceneRef = useRef<SceneRef>(null);
  const { timeline, playerRef } = useStore();
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
  const {
    setTrackItem: setLayoutTrackItem,
    setFloatingControl,
    setLabelControlItem,
    setTypeControlItem,
  } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();

  useTimelineEvents();

  const { setCompactFonts, setFonts } = useDataState();
  // useEffect(() => {
  //   dispatch(DESIGN_LOAD, { payload: design });
  // }, []);
  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    loadFonts([
      {
        name: SECONDARY_FONT,
        url: SECONDARY_FONT_URL,
      },
    ]);
  }, []);

  useEffect(() => {
    const screenHeight = window.innerHeight;
    const desiredHeight = 300;
    const percentage = (desiredHeight / screenHeight) * 100;
    timelinePanelRef.current?.resize(percentage);
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    timeline?.resize(
      {
        height: timelineContainer.clientHeight - 90,
        width: timelineContainer.clientWidth - 40,
      },
      {
        force: true,
      },
    );

    // Trigger zoom recalculation when timeline is resized
    setTimeout(() => {
      sceneRef.current?.recalculateZoom();
    }, 100);
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const trackItem = trackItemsMap[id];
      if (trackItem) {
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
      } else console.log(transitionsMap[id]);
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap]);

  useEffect(() => {
    setFloatingControl("");
    setLabelControlItem("");
    setTypeControlItem("");
  }, [isLargeScreen]);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <Navbar
        projectName={projectName}
        user={null}
        stateManager={stateManager}
        setProjectName={setProjectName}
      />

      <div className="flex flex-1 h-[calc(100vh-52px)]">
        {isLargeScreen ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {/*<ResizablePanel*/}
            {/*  defaultSize={30}*/}
            {/*  minSize={20}*/}
            {/*  maxSize={40}*/}
            {/*  className="max-w-7xl relative bg-card min-w-0 overflow-visible!"*/}
            {/*>*/}
            {/*  <Sidebar />*/}
            {/*  <FloatingControl />*/}
            {/*</ResizablePanel>*/}

            {/*<ResizableHandle className="bg-border/90" />*/}

            <ResizablePanel
              defaultSize={40}
              minSize={40}
              className="min-w-0 min-h-0"
            >
              <SceneContainer
                sceneRef={sceneRef}
                playerRef={playerRef}
                stateManager={stateManager}
                trackItem={trackItem}
                loaded={loaded}
                isLargeScreen={isLargeScreen}
              />
            </ResizablePanel>

            {/*<ResizableHandle className="bg-border/90" />*/}

            {/*<ResizablePanel*/}
            {/*    defaultSize={30}*/}
            {/*    minSize={20}*/}
            {/*    maxSize={40}*/}
            {/*    className="max-w-7xl relative bg-card min-w-0 overflow-visible!"*/}
            {/*>*/}
            {/*  <Controls />*/}
            {/*  <FloatingControl />*/}
            {/*</ResizablePanel>*/}
          </ResizablePanelGroup>
        ) : (
          <SceneContainer
            sceneRef={sceneRef}
            playerRef={playerRef}
            stateManager={stateManager}
            trackItem={trackItem}
            loaded={loaded}
            isLargeScreen={isLargeScreen}
          />
        )}
      </div>
    </div>
  );
};

export default Editor;
