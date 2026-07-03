import { ITextDetails, ITrackItem } from "@designcombo/types";

export const createPreviewDetails = (width: number, height: number): ITextDetails =>
  ({
    text: "Text",
    fontSize: 32,
    width,
    height,
    left: 0,
    top: 0,
    fontFamily: "",
    fontUrl: "",
    color: "#ffffff",
    lineHeight: "normal",
    letterSpacing: "normal",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "center",
    wordSpacing: "normal",
    textShadow: "none",
    backgroundColor: "transparent",
    opacity: 1,
    textTransform: "capitalize" as any,
    border: "none",
    wordWrap: "break-word",
    wordBreak: "normal",
    WebkitTextStrokeColor: "transparent",
    WebkitTextStrokeWidth: "0px",
    borderWidth: 0,
    borderColor: "#000000",
    boxShadow: { color: "transparent", x: 0, y: 0, blur: 0 },
    skewX: 0,
    skewY: 0,
    transform: "scale(1, 1)" // assumption — see note above
  }) as unknown as ITextDetails;

export const createPreviewTrackItem = (width: number, height: number): ITrackItem =>
  ({
    id: "preview-item",
    type: "text",
    display: { from: 0, to: 5000 },
    details: createPreviewDetails(width, height)
  }) as unknown as ITrackItem;