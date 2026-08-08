import React, { useEffect, useRef, useState } from "react";

interface FadeInScrollProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

const FadeInScroll: React.FC<FadeInScrollProps> = ({
  children,
  delay = 0,
  direction = "up",
  distance = 40,
  duration = 0.8,
  className = "",
  style = {}
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.15,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(ref.current);
      }
    };
  }, []);

  let transformStr = "translate(0,0)";
  if (!isVisible) {
    switch (direction) {
      case "up": transformStr = `translateY(${distance}px)`; break;
      case "down": transformStr = `translateY(-${distance}px)`; break;
      case "left": transformStr = `translateX(${distance}px)`; break;
      case "right": transformStr = `translateX(-${distance}px)`; break;
      case "none": transformStr = "translate(0,0)"; break;
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate(0,0)" : transformStr,
        transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: "opacity, transform"
      }}
    >
      {children}
    </div>
  );
};

export default FadeInScroll;
