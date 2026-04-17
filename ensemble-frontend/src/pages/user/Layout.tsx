import { Outlet } from "react-router-dom";
import UserNav from "@/components/nav/user_nav";
import { useState, useEffect } from "react";

const Layout = () => {
  const [marginLeft, setMarginLeft] = useState("16rem");

  useEffect(() => {
    const checkSidebarState = () => {
      const sidebar = document.querySelector("aside");
      if (sidebar) {
        const isCollapsed = sidebar.classList.contains("w-20");
        setMarginLeft(isCollapsed ? "5rem" : "16rem");
      }
    };

    // Create a mutation observer to watch for class changes on the sidebar
    const observer = new MutationObserver(checkSidebarState);
    const sidebar = document.querySelector("aside");

    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    }

    checkSidebarState();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen">
      <UserNav />
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: marginLeft }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;