import { generateId } from "@designcombo/timeline";
// import { DEFAULT_FONT } from "./font";

export const TEXT_ADD_PAYLOAD = {
  id: generateId(),
  display: {
    from: 0,
    to: 5000
  },
  type: "text",
  details: {
    text: "Text",
    fontSize: 120,
    width: 600,
    fontFamily: "",  // filled at dispatch time
    fontUrl: "",     // filled at dispatch time
    color: "#ffffff",
    wordWrap: "break-word",
    textAlign: "center",
    borderWidth: 0,
    borderColor: "#000000",
    boxShadow: {
      color: "#ffffff",
      x: 0,
      y: 0,
      blur: 0
    },
    fontWeight: "normal",
  }
};
