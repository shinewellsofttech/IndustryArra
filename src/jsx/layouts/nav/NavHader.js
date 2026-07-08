import React from "react";
import { Link } from "react-router-dom";
import logo2 from "../../../images/logo.png";
import { openSidebar, scheduleSidebarClose } from "./sidebarHover";

const NavHader = () => {

  return (
    <div
      className="nav-header"
      onMouseEnter={openSidebar}
      onMouseLeave={() => scheduleSidebarClose()}
    >
      <Link to="/dashboard" className="brand-logo">
        <img src={logo2} alt="AARA" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
      </Link>

      {/* Hamburger lines — visual indicator, hover-controlled now */}
      <div className="nav-control">
        <div className="hamburger">
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>
        </div>
      </div>
    </div>
  );
};

export default NavHader;
