import { Helper as HelperBase, HelperProps } from "@designcombo/timeline";

class Helper extends HelperBase {
  static type = "Helper";

  constructor(props: HelperProps) {
    props.activeGuideFill = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-canvas")
      .trim() + "80";
    super(props);
  }
}

export default Helper;
