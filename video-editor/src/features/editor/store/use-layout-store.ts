import { ILayoutState } from "../interfaces/layout";
import { create } from "zustand";

const useLayoutStore = create<ILayoutState>((set) => ({
  activeMenuItem: "texts",
  showMenuItem: false,
  cropTarget: null,
  showControlItem: false,
  showToolboxItem: false,
  activeToolboxItem: null,
  floatingControl: null,
  drawerOpen: false,
  controItemDrawerOpen: false,
  typeControlItem: "",
  labelControlItem: "",
  setCropTarget: (cropTarget) => set({ cropTarget }),
  setActiveMenuItem: (showMenu) => set({ activeMenuItem: showMenu }),
  setShowMenuItem: (showMenuItem) => set({ showMenuItem }),
  setShowControlItem: (showControlItem) => set({ showControlItem }),
  setShowToolboxItem: (showToolboxItem) => set({ showToolboxItem }),
  setActiveToolboxItem: (activeToolboxItem) => set({ activeToolboxItem }),
  setFloatingControl: (floatingControl) =>
    set(
      floatingControl
        ? { floatingControl }
        : { floatingControl, floatingControlIds: [], floatingControlAnimationType: undefined }
    ),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  trackItem: null,
  setTrackItem: (trackItem) => set({ trackItem }),
  setControItemDrawerOpen: (controItemDrawerOpen) =>
    set({ controItemDrawerOpen }),
  setTypeControlItem: (typeControlItem) => set({ typeControlItem }),
  setLabelControlItem: (labelControlItem) => set({ labelControlItem }),

  animationPickerInitialTab: "in",
  setAnimationPickerInitialTab: (tab) =>
    set({ animationPickerInitialTab: tab }),

  floatingControlIds: [],
  floatingControlAnimationType: undefined,
  setFloatingControlIds: (ids, animationType) =>
    set({ floatingControlIds: ids, floatingControlAnimationType: animationType }),
}));

export default useLayoutStore;