import React, { Fragment, useContext, useState } from "react";
/// React router dom
import { Link } from "react-router-dom";
import { ThemeContext } from "../../../context/ThemeContext";
import logo2 from "../../../images/logo.png";

export function  NavMenuToggle(){
	setTimeout(()=>{	
		let mainwrapper = document.querySelector("#main-wrapper");
		if(mainwrapper.classList.contains('menu-toggle')){
			mainwrapper.classList.remove("menu-toggle");
		}else{
			mainwrapper.classList.add("menu-toggle");
		}
	},200);
}

const NavHader = () => {
  const [toggle, setToggle] = useState(false);
  const { navigationHader, openMenuToggle, background } = useContext(
    ThemeContext
  );
  return (
    <div className="nav-header">
      <style>{`
        .brand-logo img {
          height: 75px !important;
          width: auto !important;
          max-width: 240px !important;
          object-fit: contain !important;
          transition: all 0.2s ease-in-out !important;
        }
        #main-wrapper.menu-toggle .brand-logo img {
          height: 35px !important;
          max-width: 35px !important;
        }
        @media only screen and (max-width: 767px) {
          .brand-logo img {
            height: 35px !important;
            max-width: 35px !important;
          }
        }
      `}</style>
      <Link to="/dashboard" className="brand-logo">
        <Fragment>
          <img src={logo2} alt="" />
        </Fragment>
      </Link>

      <div
        className="nav-control"
        onClick={() => {
          setToggle(!toggle);
          //openMenuToggle();
          NavMenuToggle();
        }}
      >
        <div className={`hamburger ${toggle ? "is-active" : ""}`}>
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>
        </div>
      </div>
    </div>
  );
};

export default NavHader;
