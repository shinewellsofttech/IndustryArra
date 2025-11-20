import React, { createContext, useEffect, useState } from "react";
import {dezThemeSet} from './ThemeDemo';

export const ThemeContext = createContext();

// Define default theme - set to dark as requested previously
const defaultTheme = { value: "dark", label: "Dark" };
const themeLocalStorageKey = 'themePreference';

const ThemeContextProvider = (props) => {
	const [sideBarStyle, setSideBarStyle] = useState({ value: "full", label: "Full",});
	const [sidebarposition, setSidebarposition] = useState({ value: "fixed",	label: "Fixed",});
  const [headerposition, setHeaderposition] = useState({ value: "fixed", label: "Fixed", });
  const [sidebarLayout, setSidebarLayout] = useState({ value: "vertical", label: "Vertical",});
	const [direction, setDirection] = useState({ value: "ltr", label: "LTR" });
	const [primaryColor, setPrimaryColor] = useState("color_1");
	const [navigationHader, setNavigationHader] = useState("color_1");
	const [haderColor, setHaderColor] = useState("color_1");
	const [sidebarColor, setSidebarColor] = useState("color_1");
	const [iconHover, setIconHover] = useState(false);
  const [sidebariconHover, setSidebariconHover] = useState(false);
	const [menuToggle, setMenuToggle] = useState(false);
	const [background, setBackground] = useState(defaultTheme);
	const [containerPosition_, setcontainerPosition_] = useState({value: "wide-boxed", label: "Wide Boxed",});
  const body = document.querySelector("body");
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  // layout
  const layoutOption = [
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
  ];
  const sideBarOption = [
    { value: "compact", label: "Compact" },
    { value: "full", label: "Full" },
    { value: "mini", label: "Mini" },
    { value: "modern", label: "Modern" },
    { value: "overlay", label: "Overlay" },
    { value: "icon-hover", label: "Icon-hover" },
  ];
  const backgroundOption = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  const sidebarpositions = [
    { value: "fixed", label: "Fixed" },
    { value: "static", label: "Static" },
  ];
  const headerPositions = [
    { value: "fixed", label: "Fixed" },
    { value: "static", label: "Static" },
  ];
  const containerPosition = [
    { value: "wide-boxed", label: "Wide Boxed" },
    { value: "boxed", label: "Boxed" },
    { value: "wide", label: "Wide" },
  ];
  const colors = [
    "color_1",
    "color_2",
    "color_3",
    "color_4",
    "color_5",
    "color_6",
    "color_7",
    "color_8",
    "color_9",
    "color_10",
    "color_11",
    "color_12",
    "color_13",
    "color_14",
    "color_15",
  ];
  const directionPosition = [
    { value: "ltr", label: "LTR" },
    { value: "rtl", label: "RTL" },
  ];
  const fontFamily = [
    { value: "opensans", label: "Opensans" },
    { value: "roboto", label: "Roboto" },
    { value: "cairo", label: "Cairo" },
    { value: "opensans", label: "Open Sans" },
    { value: "HelveticaNeue", label: "HelveticaNeue" },
  ];
  const changePrimaryColor = (name) => {
	setPrimaryColor(name);
    body.setAttribute("data-primary", name);
  };
  const changeNavigationHader = (name) => {
    setNavigationHader(name);
    body.setAttribute("data-nav-headerbg", name);
  };
  const chnageHaderColor = (name) => {
    setHaderColor(name);
    body.setAttribute("data-headerbg", name);
  };
  const chnageSidebarColor = (name) => {
    setSidebarColor(name);
    body.setAttribute("data-sibebarbg", name);
  };
  const changeSideBarPostion = (name) => {
    setSidebarposition(name);
    body.setAttribute("data-sidebar-position", name.value);
  };
  const changeDirectionLayout = (name) => {
    setDirection(name);
    body.setAttribute("direction", name.value);
    let html = document.querySelector("html");
    html.setAttribute("dir", name.value);
    html.className = name.value;
  };
  const changeSideBarLayout = (name) => {
    if (name.value === "horizontal") {
      if (sideBarStyle.value === "overlay") {
        setSidebarLayout(name);
        body.setAttribute("data-layout", name.value);
        setSideBarStyle({ value: "full", label: "Full" });
        body.setAttribute("data-sidebar-style", "full");
      } else {
        setSidebarLayout(name);
        body.setAttribute("data-layout", name.value);
      }
    } else {
      setSidebarLayout(name);
      body.setAttribute("data-layout", name.value);
    }
  };
  const changeSideBarStyle = (name) => {
    if (sidebarLayout.value === "horizontal") {
      if (name.value === "overlay") {
        alert("Sorry! Overlay is not possible in Horizontal layout.");
      } else {
        setSideBarStyle(name);
        setIconHover(name.value === "icon-hover" ? "_i-hover" : "");
        body.setAttribute("data-sidebar-style", name.value);
      }
    } else {
      setSideBarStyle(name);
      setIconHover(name.value === "icon-hover" ? "_i-hover" : "");
      body.setAttribute("data-sidebar-style", name.value);
    }
  };

  const changeHeaderPostion = (name) => {
    setHeaderposition(name);
    body.setAttribute("data-header-position", name.value);
  };

  const ChangeIconSidebar = (value) => {
    if(sideBarStyle.value==="icon-hover"){      
      if(value){
        setSidebariconHover(true);
      }else{
        setSidebariconHover(false);
      }
    }
  }

  const openMenuToggle = () => {
    sideBarStyle.value === "overly"
      ? setMenuToggle(true)
      : setMenuToggle(false);
  };

  const changeBackground = (name) => {
    // Check if name and name.value exist before proceeding
    if (name && typeof name.value === 'string') {
        body.setAttribute("data-theme-version", name.value);
        setBackground(name);
        try {
            localStorage.setItem(themeLocalStorageKey, name.value); // Save preference
        } catch (error) {
            console.error("Could not save theme preference to localStorage:", error);
        }
    } else {
        console.error("Invalid theme object passed to changeBackground:", name);
    }
  };

  const changeContainerPosition = (name) => {
    setcontainerPosition_(name);
    body.setAttribute("data-container", name.value);
    name.value === "boxed" &&
      changeSideBarStyle({ value: "overlay", label: "Overlay" });
  };
  
  const setDemoTheme = (theme,direction) => {

	var setAttr = {};	
	
	
	var themeSettings = dezThemeSet[theme];	
		
	body.setAttribute("data-typography", themeSettings.typography);
 
	setAttr.value = themeSettings.version;
	changeBackground(setAttr);
	
	setAttr.value = themeSettings.layout;
	changeSideBarLayout(setAttr);
	
	//setAttr.value = themeSettings.primary;
	changePrimaryColor(themeSettings.primary);
	
//setAttr.value = themeSettings.navheaderBg;
	changeNavigationHader(themeSettings.navheaderBg);
	
//setAttr.value = themeSettings.headerBg;
	chnageHaderColor(themeSettings.headerBg);
	
	setAttr.value = themeSettings.sidebarStyle;
	changeSideBarStyle(setAttr);
	
	//setAttr.value = themeSettings.sidebarBg;
	chnageSidebarColor(themeSettings.sidebarBg);
	
	setAttr.value = themeSettings.sidebarPosition;
	changeSideBarPostion(setAttr);
	
	setAttr.value = themeSettings.headerPosition;
	changeHeaderPostion(setAttr);
	
	setAttr.value = themeSettings.containerLayout;
	changeContainerPosition(setAttr);
	
	//setAttr.value = themeSettings.direction;
	setAttr.value = direction;
	changeDirectionLayout(setAttr); 
	
	};

  useEffect(() => {
	const body = document.querySelector("body");
    let initialThemeValue = defaultTheme.value; // Start with the default

    // Try reading from localStorage
    try {
        const savedTheme = localStorage.getItem(themeLocalStorageKey);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            initialThemeValue = savedTheme;
            // Update state if saved theme differs from initial default
            if(initialThemeValue !== background.value){
                 setBackground({value: initialThemeValue, label: initialThemeValue === 'dark' ? 'Dark': 'Light'});
            }
        } else {
            // If no valid saved theme, save the default one
             localStorage.setItem(themeLocalStorageKey, initialThemeValue);
        }
    } catch (error) {
         console.error("Could not read or write theme preference from/to localStorage:", error);
    }


    // Apply initial attributes based on determined theme (saved or default)
    body.setAttribute("data-typography", "HelveticaNeue");
    body.setAttribute("data-theme-version", initialThemeValue); // Use determined theme
    body.setAttribute("data-layout", "vertical");
    body.setAttribute("data-primary", "color_1");
    body.setAttribute("data-nav-headerbg", "color_1");
    body.setAttribute("data-headerbg", "color_1");
    // Keep existing sidebar style logic based on window size, but don't hardcode overlay here
    // body.setAttribute("data-sidebar-style", "overlay"); // Remove this hardcoded value
    body.setAttribute("data-sibebarbg", "color_1");
    // body.setAttribute("data-primary", "color_1"); // Duplicate, remove
    body.setAttribute("data-sidebar-position", "fixed");
    body.setAttribute("data-header-position", "fixed");
    body.setAttribute("data-container", "wide");
    body.setAttribute("direction", "ltr");

		let resizeWindow = () => {
			setWindowWidth(window.innerWidth);
			setWindowHeight(window.innerHeight);
            // Use the current sidebar style from state if available, otherwise apply defaults
            const currentSidebarStyle = sideBarStyle.value || 'full'; // Get current style or default
            const newSidebarStyle = window.innerWidth >= 768 && window.innerWidth < 1024
                ? "mini"
                : window.innerWidth <= 768
                ? "overlay"
                : currentSidebarStyle; // Keep the user's choice on larger screens if not mini/overlay breakpoint

            // Only update if the style needs to change
            if (body.getAttribute("data-sidebar-style") !== newSidebarStyle) {
                body.setAttribute("data-sidebar-style", newSidebarStyle);
                 // Optionally update state if you need the sidebar style state to reflect resize changes
                 // This might cause issues if the user manually selected a style like 'compact' on a large screen
                 // Consider if you want resize to override user selection or just apply defaults for breakpoints
                 // setSideBarStyle({ value: newSidebarStyle, label: newSidebarStyle.charAt(0).toUpperCase() + newSidebarStyle.slice(1) });
            }
		};
    resizeWindow(); // Call initially
    window.addEventListener("resize", resizeWindow);

    // Cleanup function
    return () => window.removeEventListener("resize", resizeWindow);
  // Add sideBarStyle to dependency array if you uncomment the setSideBarStyle inside resizeWindow
  }, []); // Keep dependency array minimal unless specific states need to trigger re-run

  return (
    <ThemeContext.Provider
      value={{
        body,
        sideBarOption,
        layoutOption,
        backgroundOption,
        sidebarposition,
        headerPositions,
        containerPosition,
        directionPosition,
        fontFamily,
		    primaryColor,
        navigationHader,
		    windowWidth,
		    windowHeight,
        changePrimaryColor,
        changeNavigationHader,
        changeSideBarStyle,
        sideBarStyle,
        changeSideBarPostion,
        sidebarpositions,
        changeHeaderPostion,
        headerposition,
        changeSideBarLayout,
        sidebarLayout,
        changeDirectionLayout,
        changeContainerPosition,
        direction,
        colors,
        haderColor,
        chnageHaderColor,
        chnageSidebarColor,
        sidebarColor,
        iconHover,
        sidebariconHover,
        ChangeIconSidebar,
        menuToggle,
        openMenuToggle,
        changeBackground,
        background,
        containerPosition_,
		setDemoTheme,
	}}
    >
      {props.children}
    </ThemeContext.Provider>
  );
};

export default ThemeContextProvider;


