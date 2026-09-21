import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo2 from "../../../images/logo.png";
import { openSidebar, scheduleSidebarClose, toggleSidebarMobile, closeSidebarMobile } from "./sidebarHover";

const NavHader = () => {
  const [isActive, setIsActive] = useState(false);

  const handleNavControlClick = () => {
    toggleSidebarMobile();
    const el = document.querySelector('#main-wrapper');
    setIsActive(el ? el.classList.contains('menu-toggle') : false);
  };

  return (
    <div
      className="nav-header"
      onMouseEnter={openSidebar}
      onMouseLeave={() => scheduleSidebarClose()}
    >
      <Link to="/dashboard" className="brand-logo" onClick={closeSidebarMobile}>
        <img src={logo2} alt="AARA" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
      </Link>

      {/* Hamburger toggle for mobile; visual indicator for desktop */}
      <div className="nav-control" onClick={handleNavControlClick}>
        <div className={`hamburger ${isActive ? "is-active" : ""}`}>
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>
        </div>
      </div>
    </div>
  );
};

export default NavHader;

