import { createContext, useContext } from "react";

const ViewOnlyContext = createContext(false);
export const ViewOnlyProvider = ViewOnlyContext.Provider;
export const useViewOnly = () => useContext(ViewOnlyContext);