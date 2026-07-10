export const getAlphaValue = (value: string) => {
  value = value.replace(/%/i, ""); // Ensure to assign the result back
  if (value[0] === "0" && value.length > 1) {
    return value.substring(1); // Replaced substr with substring
  } else if (Number(value) >= 100) {
    return 100;
  } else if (!isNaN(Number(value))) {
    return value || 0;
  }
  return parseInt(value);
};

export const onlyDigits = (string: string) => {
  return string ? string.substring(0, 3).replace(/[^\d]/g, "") : ""; // Replaced substr with substring
};

export const onlyHex = (string: string) => {
  if (!string) return string;

  const hasHash = string.startsWith("#");
  const rest = (hasHash ? string.slice(1) : string).replace(/[^0-9a-fA-F]/g, "");

  return hasHash ? `#${rest}`.substring(0, 7) : rest.substring(0, 6);
};

export function isGradientColor(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("linear-gradient(") ||
    normalized.startsWith("radial-gradient(")
  );
}

export const formatColorDisplay = (v: string): string => {
  if (isGradientColor(v)) {
    return v!.trim().toLowerCase().startsWith("radial-gradient(")
      ? "Radial gradient"
      : "Linear gradient";
  }

  if (!v || v === "") return "Auto";
  if (v === "transparent") return "Transparent";
  return v.toUpperCase();
};