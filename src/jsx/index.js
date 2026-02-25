import React, { useContext } from "react";
/// React router dom
import {  Routes, Route, Outlet  } from "react-router-dom";

/// Css
import "./index.css";
import "./chart.css";
import "./step.css";

/// Layout
import Nav from "./layouts/nav";
import Footer from "./layouts/Footer";
import ScrollToTop from "./layouts/ScrollToTop";
/// Dashboard
import Home from "./components/Dashboard/Home";
import DashboardDark from "./components/Dashboard/DashboardDark";
import OrderPage from "./components/Dashboard/OrderPage";
import OrderDetails from "./components/Dashboard/OrderDetails";
import CustomersPage from "./components/Dashboard/Customers";
import Analytics from "./components/Dashboard/Analytics";
import Review from "./components/Dashboard/Review";
import Task from "./components/Dashboard/Task";


/// App
import AppProfile from "./components/AppsMenu/AppProfile/AppProfile";
import Compose from "./components/AppsMenu/Email/Compose/Compose";
import Inbox from "./components/AppsMenu/Email/Inbox/Inbox";
import Read from "./components/AppsMenu/Email/Read/Read";
import Calendar from "./components/AppsMenu/Calendar/Calendar";
import PostDetails from "./components/AppsMenu/AppProfile/PostDetails";

/// Product List
import ProductGrid from "./components/AppsMenu/Shop/ProductGrid/ProductGrid";
import ProductList from "./components/AppsMenu/Shop/ProductList/ProductList";
import ProductDetail from "./components/AppsMenu/Shop/ProductGrid/ProductDetail";
import Checkout from "./components/AppsMenu/Shop/Checkout/Checkout";
import Invoice from "./components/AppsMenu/Shop/Invoice/Invoice";
import ProductOrder from "./components/AppsMenu/Shop/ProductOrder";
import Customers from "./components/AppsMenu/Shop/Customers/Customers";

/// Charts
import SparklineChart from "./components/charts/Sparkline";
import ChartJs from "./components/charts/Chartjs";
//import Chartist from "./components/charts/chartist";
import RechartJs from "./components/charts/rechart";
import ApexChart from "./components/charts/apexcharts";

/// Bootstrap
import UiAlert from "./components/bootstrap/Alert";
import UiAccordion from "./components/bootstrap/Accordion";
import UiBadge from "./components/bootstrap/Badge";
import UiButton from "./components/bootstrap/Button";
import UiModal from "./components/bootstrap/Modal";
import UiButtonGroup from "./components/bootstrap/ButtonGroup";
import UiListGroup from "./components/bootstrap/ListGroup";
import UiCards from "./components/bootstrap/Cards";
import UiCarousel from "./components/bootstrap/Carousel";
import UiDropDown from "./components/bootstrap/DropDown";
import UiPopOver from "./components/bootstrap/PopOver";
import UiProgressBar from "./components/bootstrap/ProgressBar";
import UiTab from "./components/bootstrap/Tab";
import UiPagination from "./components/bootstrap/Pagination";
import UiGrid from "./components/bootstrap/Grid";
import UiTypography from "./components/bootstrap/Typography";

/// Plugins
import Select2 from "./components/PluginsMenu/Select2/Select2";
import Nestable from "./components/PluginsMenu/Nestable/Nestable";
import MainNouiSlider from "./components/PluginsMenu/Noui Slider/MainNouiSlider";
import MainSweetAlert from "./components/PluginsMenu/SweetAlert/SweetAlert";
import Toastr from "./components/PluginsMenu/Toastr/Toastr";
import JqvMap from "./components/PluginsMenu/JqvMap/JqvMap";
import Lightgallery from "./components/PluginsMenu/Lightgallery/Lightgallery";

//Redux
import Todo from "./pages/Todo";

/// Widget
import Widget from "./pages/Widget";

/// Table
import SortingTable from "./components/table/SortingTable/SortingTable";
import FilteringTable from "./components/table/FilteringTable/FilteringTable";
import DataTable from "./components/table/DataTable";
import BootstrapTable from "./components/table/BootstrapTable";

/// Form
import Element from "./components/Forms/Element/Element";
import Wizard from "./components/Forms/Wizard/Wizard";
import CkEditor from "./components/Forms/CkEditor/CkEditor";
import Pickers from "./components/Forms/Pickers/Pickers";
import FormValidation from "./components/Forms/FormValidation/FormValidation";

/// Pages
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import LockScreen from "./pages/LockScreen";
import Error400 from "./pages/Error400";
import Error403 from "./pages/Error403";
import Error404 from "./pages/Error404";
import Error500 from "./pages/Error500";
import Error503 from "./pages/Error503";
import Setting from "./layouts/Setting";
import { ThemeContext } from "../context/ThemeContext";
import AddEdit_UserMaster from "./components/Forms/FormValidation/FormValidation";
import PageList_UserMaster from "./Masters/PageList_UserMaster";
import AddEdit_ContainerMaster from "./Masters/AddEdit_ContainerMaster";
import AddEdit_ComponentMaster from "./Masters/AddEdit_ComponentMaster";
import AddMultiple_ComponentMaster from "./Masters/AddMultiple_ComponentMaster";
import AddEdit_CategoryMaster from "./Masters/AddEdit_CategoryMaster";
import AddEdit_CardMaster from "./Masters/AddEdit_CardMaster";
import JobCardForm from "./Masters/JobCardForm";
import PageList_ComponentMaster from "./Masters/PageList_ComponentMaster";
import PageList_CardMaster from "./Masters/PageList_CardMaster";
import PageList_ContainerMaster from "./Masters/PageList_ContainerMaster";
import AddEdit_MachineComponentMap from "./Masters/AddEdit_MachineComponentMap";
import PageList_ItemMaster from "./Masters/PageList_ItemMaster";
import AddEdit_ItemMaster from "./Masters/AddEdit_ItemMaster";
import PageList_ComponentMachineReport from "./Masters/PageList_ComponentMachineReport";
import MDFJobCard from "./Masters/MDFJobCard";
import MetalJobCard from "./Masters/MetalJobCard";
import AddALSlip from "./Masters/AddALSlip";
import ALSlip from "./Masters/ALSlip";
import WoodIssue from "./Masters/WoodIssue";
import AddWoodIssue from "./Masters/AddWoodIssue";
import OtherSlips from "./Masters/OtherSlips";
import AddOtherSlip from "./Masters/AddOtherSlip";
import SupervisorEntry from "./Masters/SupervisorEntry";
import ApproveJobCards from "./Masters/ApproveJobCards";
import PageList_ClosingReport from "./Masters/PageList_ClosingReport";
import PageList_RejectionStore from "./Masters/PageList_RejectionStore";
import ManualReportEntry from "./Masters/ManualReportEntry";
import Report_ContainerWise from "./Masters/Report_ContainerWise";
import Edit_WoodIssue from "./Supervisor/Edit_WoodIssue";
import AddEdit_Transfer from "./Masters/AddEdit_Transfer";
import ContainerReport from "./Reports/ContainerReport";
import ContainerEntrySystem from "./Reports/ContainerEntrySystem";
import ContainerEntryReport from "./Reports/ContainerEntryReport";
import WoodComponentReport from "./Reports/WoodComponentReport";
import ContainerMasterReport from "./Reports/ContainerMasterReport";
import PageList_MachineMaster from "./Masters/PageList_MachineMaster";
import AddEdit_MachineMaster from "./Masters/AddEdit_MachineMaster";
import TotalItemSummary from "./Masters/TotalItemSummary";

const Markup = () => {
  const { menuToggle } = useContext(ThemeContext);
  const allroutes = [
    /// Dashboard
    { url: "", component: <Home/> },
    { url: "dashboard", component: <Home/> },
    { url: "dashboard-dark", component: <DashboardDark /> },
    { url: "order-list", component: <OrderPage/> },
    { url: "order-details", component: <OrderDetails/> },
    { url: "customers", component: <CustomersPage/> },
    { url: "analytics", component: <Analytics/> },
    { url: "review", component: <Review/> },
    { url: "task", component: <Task/> },

    /// Apps
    { url: "app-profile", component: <AppProfile/> },
    { url: "email-compose", component: <Compose/> },
    { url: "email-inbox", component: <Inbox/> },
    { url: "email-read", component: <Read/> },
    { url: "app-calender", component: <Calendar/> },
    { url: "post-details", component: <PostDetails/> },

    /// Chart
    { url: "chart-sparkline", component: <SparklineChart/> },
    { url: "chart-chartjs", component: <ChartJs/> },
    // { url: "chart-chartist", component: Chartist },
    { url: "chart-apexchart", component: <ApexChart/> },
    { url: "chart-rechart", component: <RechartJs/> },
    
    /// Bootstrap
    { url: "ui-alert", component: <UiAlert/> },
    { url: "ui-badge", component: <UiBadge/> },
    { url: "ui-button", component: <UiButton/> },
    { url: "ui-modal", component: <UiModal/> },
    { url: "ui-button-group", component: <UiButtonGroup/> },
    { url: "ui-accordion", component: <UiAccordion/> },
    { url: "ui-list-group", component: <UiListGroup/> },
    { url: "ui-card", component: <UiCards/> },
    { url: "ui-carousel", component: <UiCarousel/> },
    { url: "ui-dropdown", component: <UiDropDown/> },
    { url: "ui-popover", component: <UiPopOver/> },
    { url: "ui-progressbar", component: <UiProgressBar/> },
    { url: "ui-tab", component: <UiTab/> },
    { url: "ui-pagination", component: <UiPagination/> },
    { url: "ui-typography", component: <UiTypography/> },
    { url: "ui-grid", component: <UiGrid/> },

    /// Plugin
    { url: "uc-select2", component: <Select2/> },
    { url: "uc-nestable", component: <Nestable/> },
    { url: "uc-noui-slider", component: <MainNouiSlider/> },
    { url: "uc-sweetalert", component: <MainSweetAlert/> },
    { url: "uc-toastr", component: <Toastr/> },
    { url: "map-jqvmap", component: <JqvMap/> },
    { url: "uc-lightgallery", component: <Lightgallery/> },

	///Redux
	{ url: "todo", component: <Todo/> },
  
	
    /// Widget
    { url: "widget-basic", component: <Widget/> },

    /// Shop
    { url: "ecom-product-grid", component: <ProductGrid/> },
    { url: "ecom-product-list", component: <ProductList/> },
    { url: "ecom-product-detail", component: <ProductDetail/> },
    { url: "ecom-product-order", component: <ProductOrder/> },
    { url: "ecom-checkout", component: <Checkout/> },
    { url: "ecom-invoice", component: <Invoice/> },
    { url: "ecom-product-detail", component: <ProductDetail/> },
    { url: "ecom-customers", component: <Customers/> },

    /// Form
    { url: "form-element", component: <Element/> },
    { url: "form-wizard", component: <Wizard/> },
    { url: "form-ckeditor", component: <CkEditor/> },
    { url: "form-pickers", component: <Pickers/> },
    { url: "form-validation", component: <FormValidation/> },

    /// table
	  { url: 'table-filtering', component: <FilteringTable/> },
    { url: 'table-sorting', component: <SortingTable/> },
    { url: "table-datatable-basic", component: <DataTable/> },
    { url: "table-bootstrap-basic", component: <BootstrapTable/> },

    // --------------------MASTERS-----------------------
    { url: "UserMaster", component: <PageList_UserMaster/> },
    { url: "AddUser", component: <AddEdit_UserMaster/> },

    { url: "AddContainer", component: <AddEdit_ContainerMaster/> },
    { url: "ContainerMaster", component: <PageList_ContainerMaster/> },

    { url: "AddComponent", component: <AddEdit_ComponentMaster/> },
    { url: "AddMultipleComponent", component: <AddMultiple_ComponentMaster/> },
    { url: "ComponentMaster", component: <PageList_ComponentMaster/> },

    { url: "AddCategory", component: <AddEdit_CategoryMaster/> },

    { url: "AddCard", component: <AddEdit_CardMaster/> },
    { url: "CardMaster", component: <PageList_CardMaster/> },

    { url: "AddItem", component: <AddEdit_ItemMaster/> },
    { url: "ItemMaster", component: <PageList_ItemMaster/> },
    { url: "TotalItemSummary", component: <TotalItemSummary/> },

    { url: "JobCardForm", component: <JobCardForm/> },
    { url: "MDFJobCard", component: <MDFJobCard/> },
    { url: "MetalJobCard", component: <MetalJobCard/> },

    { url: "MachineComponentMap", component: <AddEdit_MachineComponentMap/> },
    { url: "MachineComponentMapReport", component: <PageList_ComponentMachineReport/> },
    { url: "AddALSlip", component: <AddALSlip/> },
    { url: "ALSlip", component: <ALSlip/> },
    { url: "WoodIssue", component: <WoodIssue/> },
    { url: "AddWoodIssue", component: <AddWoodIssue/> },
    { url: "OtherSlips", component: <OtherSlips/> },
    { url: "AddOtherSlip", component: <AddOtherSlip/> },

    { url: "MachineMaster", component: <PageList_MachineMaster/> },
    { url: "AddMachine", component: <AddEdit_MachineMaster/> },

    { url: "SupervisorEntry", component: <SupervisorEntry/> },
    { url: "ApproveJobCards", component: <ApproveJobCards/> },
    { url: "ClosingReport", component: <PageList_ClosingReport/> },
    { url: "RejectionStore", component: <PageList_RejectionStore/> },
    { url: "ManualReportEntry", component: <ManualReportEntry/> },
    { url: "Report_ContainerWise", component: <Report_ContainerWise/> },
    { url: "EditWoodIssue", component: <Edit_WoodIssue/> },
    { url: "Transfer", component: <AddEdit_Transfer/> },
    { url: "ContainerReport", component: <ContainerReport/> },
    { url: "ContainerEntrySystem", component: <ContainerEntrySystem/> },
    { url: "ContainerEntryReport", component: <ContainerEntryReport/> },
    { url: "WoodComponentReport", component: <WoodComponentReport/> },
    { url: "ContainerMasterReport", component: <ContainerMasterReport/> },

  ];
  let path = window.location.pathname;
  path = path.split("/");
  path = path[path.length - 1];

  let pagePath = path.split("-").includes("page");
  return (
    <>
     
        <Routes>
          <Route path='page-lock-screen' element= {<LockScreen />} />
          <Route path='page-error-400' element={<Error400/>} />
          <Route path='page-error-403' element={<Error403/>} />
          <Route path='page-error-404' element={<Error404/>} />
          <Route path='page-error-500' element={<Error500/>} />
          <Route path='page-error-503' element={<Error503/>} />
          <Route path='/*' element={<Error404/>} />
          <Route  element={<MainLayout />} > 
              {allroutes.map((data, i) => (
                <Route
                  key={i}
                  exact
                  path={`${data.url}`}
                  element={data.component}
                />
              ))}
          </Route>
        </Routes>
        <Setting />
        <ScrollToTop />
    </>
  );
};

function MainLayout(){
  const { menuToggle, sidebariconHover } = useContext(ThemeContext);
  return (
    <div id="main-wrapper" className={`show ${sidebariconHover ? "iconhover-toggle": ""} ${ menuToggle ? "menu-toggle" : ""}`}>  
      <Nav />
      <div className="content-body" style={{ minHeight: window.screen.height - 45 }}>
          <div className="container-fluid">
            <Outlet />                
          </div>
      </div>
      <Footer />
    </div>
  )

};

export default Markup;
