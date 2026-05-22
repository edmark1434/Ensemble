import { useState, useEffect, type FC } from "react";

interface ScrollToTopProps {
  threshold?: number; // How many pixels to scroll before showing the button
}

const ScrollToTop: FC<ScrollToTopProps> = ({ threshold = 300 }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.95)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
          }}
          aria-label="Scroll to top"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#080a12"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </>
  );
};

export default ScrollToTop;