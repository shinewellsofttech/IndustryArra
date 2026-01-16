import React, { useEffect, useState, useMemo } from "react"
import { FormControl } from "react-bootstrap"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import {
  Table,
  Spinner,
  Input,
  Container,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap"
import { Button } from "react-bootstrap"
import Select from "react-select"
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const PageList_CardMaster = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    FillArray1: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [excelData, setExcelData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [F_ItemMaster, setItemMaster] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [F_ContainerMaster, setContainerMaster] = useState(0);
  const [totals, setTotals] = useState({
    netAmount: 0,
    grossAmount: 0,
    taxAmount: 0,
    netExpense: 0,
    cashTotal: 0,
    onlineTotal: 0
  });
  const [expenseArr, setExpenseArr] = useState([]);
  const [Amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [IsSample, setIsSample] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const API_URL = API_WEB_URLS.MASTER + "/0/token/MainMaster";
  // const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/Items`;
  const API_URL3 = `${API_WEB_URLS.MASTER}/0/token/ItemsForJobCard`;
  const API_URL2 = `${API_WEB_URLS.MASTER}/0/token/ContainerMaster`;
  const API_URL_SAVE = "MainMasterExcel/0/token";
  const API_URL_SAVE1 = "MultiJobCard/0/token";
  const rtPage_Add = "/AddCard";
  const rtPage_Edit = "/AddCard";
  const rtPage_Job = "/jobcardform";

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL1}/Id/0`);
      await Fn_FillListData(dispatch, setState, "FillArray1", `${API_URL2}/Id/0`);

    } catch (error) {
      console.error("Error fetching data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = id => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(prev => 
      prev.length === gridData.length ? [] : gridData.map(item => item?.Id)
    );
  };

  const btnAddOnClick = () => {
    navigate(rtPage_Add, { state: { Id: 0 } });
  };

  const btnEditOnClick = (Id) => {
    navigate(rtPage_Edit, { state: { Id } });
  };

  const btnCreateJobCard = async () => {
    // If IsSample is true, skip validation for selectedIds
    if (!IsSample && selectedIds.length === 0) {
      alert("Please select at least one row");
      return;
    }
    
    const obj = State.FillArray.find(item => item.Id == F_ItemMaster);
    if (!obj) {
      toast.error("Please select a valid item before continuing.");
      return;
    }
    
    const vformData = new FormData();
    vformData.append("F_ContainerMasterL", obj.F_ContainerMasterL);
    vformData.append("IsSample", IsSample);
    vformData.append("UserId", 1);
    
    // Only append IdList if IsSample is false
    if (!IsSample) {
      const selectedIdsString = selectedIds.join(',');
      console.log(selectedIdsString);
      vformData.append("IdList", selectedIdsString);
    }
    
    setIsSubmitting(true);
    const navigateToJobCardForm = () => {
      navigate(rtPage_Job, {
        state: {
          prefillContainerId: F_ContainerMaster,
          prefillItemId: F_ItemMaster,
        },
      });
    };

    try {
      await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData: vformData } },
        API_URL_SAVE1,
        true,
        "memberid",
        navigate,
        "#"
      );
      toast.success(({ closeToast }) => (
        <div>
          Job cards created successfully.{" "}
          <button
            type="button"
            onClick={() => {
              closeToast();
              navigateToJobCardForm();
            }}
            style={{
              border: "none",
              background: "transparent",
              textDecoration: "underline",
              color: "#0d6efd",
              cursor: "pointer",
              padding: 0,
              fontWeight: 600,
            }}
          >
            Click here to go to JobCardForm
          </button>
        </div>
      ), {
        closeOnClick: false,
      });
    } catch (error) {
      console.error("Error while creating job cards", error);
      toast.error("Unable to create job cards. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };



 
 


 

 const handleSaveExcelData = async (event) => {
   event.preventDefault();
   try {
     const formData = new FormData();

     formData.append("UserId", 1);
     formData.append("F_ItemMaster", F_ItemMaster);
     formData.append("Data", JSON.stringify(excelData));

   await  Fn_AddEditData(
       dispatch,
       setState,
       { arguList: { id: State.id, formData } },
       API_URL_SAVE,
       true,
       "memberid",
       navigate,
       "/CardMaster"
     );
   } catch (error) {
     console.error("Error submitting form:", error);
     alert("An error occurred while submitting the form. Please try again.");
   }
 };

  const handleAmountSubmit = async () => {
    try {
      const ExpenseIds = expenseArr.map(item => item.Id).join(',');
      const SaleInvoiceIds = selectedIds;

      let vformData = new FormData();
      vformData.append("ExpenseIds", ExpenseIds);
      vformData.append("SaleInvoiceIds", SaleInvoiceIds);
      vformData.append("IsClear", true);
      vformData.append("F_ItemMaster", F_ItemMaster);
      vformData.append("IsFirstClear", true);
      vformData.append("Amount", Amount);

      await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: State.id, formData: vformData } },
        API_URL_SAVE,
        true,
        "memberid"
      );
      
      setIsModalOpen(false);
      setAmount(0);
      setExpenseArr([]);
      fetchData();
    } catch (error) {
      console.error("Error submitting amount:", error);
      alert("Error submitting amount");
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = gridData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(gridData.length / itemsPerPage);

  const changePage = pageNumber => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };

  const handleItemMasterChange = async (selectedOption) => {
    const value = selectedOption ? selectedOption.value : 0;
    setItemMaster(value);
    setSelectedIds([]); // Clear selected rows when dropdown changes
    await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/" + value);
    // You can add additional logic here if needed
    // For example, resetting other dependent states or triggering API calls
  };

  const handleContainerMasterChange = async (e) => {
    const value = e.target.value;
    setContainerMaster(value);
    setSelectedIds([]); // Clear selected rows when dropdown changes
    setItemMaster(0); // Reset Item Master dropdown
    // Call API to get data related to the selected container
	// const obj = State.FillArray1.find(item => item.Id == value);
    if (value) {
      setLoading(true);
      try {
		await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL3}/Id/${value}`);
		await Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
      } catch (error) {
        console.error("Error fetching container data:", error);
        setGridData([]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Memoize item options for react-select
  const itemOptions = useMemo(() => {
    return State.FillArray.length > 0
      ? State.FillArray.map((option) => ({
          value: option.Id,
          label: `${option.Name} - ${option.ItemCode}`,
        }))
      : [];
  }, [State.FillArray]);

  // Memoize selected item value for react-select
  const selectedItem = useMemo(() => {
    if (!F_ItemMaster || State.FillArray.length === 0) return null;
    const foundOption = State.FillArray.find((option) => option.Id == F_ItemMaster);
    return foundOption
      ? {
          value: foundOption.Id,
          label: `${foundOption.Name} - ${foundOption.ItemCode}`,
        }
      : null;
  }, [F_ItemMaster, State.FillArray]);

  return (
    <Container fluid className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />
      {isSubmitting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <Spinner color="light" />
            <div className="mt-2">Processing...</div>
          </div>
        </div>
      )}
      {/* <Breadcrumbs title={breadCrumbTitle} breadcrumbItem={breadcrumbItem} /> */}
      <Row className="mb-3 align-items-center">
        <Col md="2">
          <h4 className="page-title mb-0" style={{fontFamily:'Poppins'}}>Card Master</h4>
        </Col>
        <Col md="2">
          <div>
            <label className="form-label mb-1 small">Container</label>
            <select
              className="form-control form-control-sm"
              name="F_ContainerMaster"
              onChange={handleContainerMasterChange}
              value={F_ContainerMaster}
            >
              <option value="">Select Container</option>
              {State.FillArray1.length > 0 &&
                State.FillArray1.map((option) => (
                  <option key={option.Id} value={option.Id}>
                    {option.Name}
                  </option>
                ))}
            </select>
          </div>
        </Col>
        <Col md="2">
          <div>
            <label className="form-label mb-1 small">Item</label>
            <Select
              isSearchable
              name="F_ItemMaster"
              options={itemOptions}
              value={selectedItem}
              onChange={handleItemMasterChange}
              placeholder="Select Item"
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "31px",
                  fontSize: "14px",
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
                placeholder: (base) => ({
                  ...base,
                  fontSize: "14px",
                }),
                option: (base) => ({
                  ...base,
                  fontSize: "14px",
                }),
              }}
              classNamePrefix="react-select"
            />
          </div>
        </Col>
        <Col md="2">
          {excelData && F_ItemMaster && (
            <Button
              type="button"
              onClick={handleSaveExcelData}
              variant="primary"
              size="sm"
              className="w-100"
            >
              Save Excel
            </Button>
          )}
        </Col>
        <Col md="1">
          <Button
            type="button"
            onClick={btnAddOnClick}
            variant="success"
            size="sm"
          >
            Add New
          </Button>
        </Col>
      </Row>

      <Row className="mb-2">
        <Col md="3">
          <div className="d-flex align-items-center">
            <Button
              type="button"
              onClick={btnCreateJobCard}
              variant="warning"
              disabled={!IsSample && selectedIds.length === 0}
              size="sm"
              className="me-2"
            >
              Create Job Card
            </Button>
            {selectedIds.length > 0 && (
              <span className="badge bg-primary">
                {selectedIds.length} selected
              </span>
            )}
          </div>
        </Col>
        <Col md="2">
          <div className="d-flex align-items-center">
            <Input
              type="checkbox"
              checked={IsSample}
              onChange={(e) => setIsSample(e.target.checked)}
              className="me-2"
            />
            <label className="form-label mb-0 small">Is Sample</label>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          {loading ? (
            <div className="text-center my-4">
              <Spinner color="primary" />
              <p>Loading data...</p>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                height: "calc(100vh - 250px)",
                overflowY: "auto",
                width: "100%",
                margin: "0",
                padding: "0",
              }}
            >
              <Table 
                bordered 
                hover 
                responsive
                className="table-striped"
                style={{
                  width: "100%",
                  margin: "0",
                  fontSize: "14px",
                }}
              >
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>
                      <Input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          selectedIds.length === gridData.length &&
                          gridData.length > 0
                        }
                        disabled={gridData.length === 0}
                      />
                    </th>
                    <th>Id</th>
                    <th>Category</th>
                    <th>Component</th>
                    <th>Job Card No</th>
                    <th>Length 1</th>
                    <th>Width 1</th>
                    <th>Thickness 1</th>
                    <th>Qty 1</th>
                    <th>Length 2</th>
                    <th>Width 2</th>
                    <th>Thickness 2</th>
                    <th>Qty 2</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map(item => (
                      <tr key={item?.Id || Math.random()}>
                        <td>
                          <Input
                            type="checkbox"
                            checked={selectedIds.includes(item?.Id)}
                            onChange={() => handleCheckboxChange(item?.Id)}
                          />
                        </td>
                        <td>{item?.Id || "N/A"}</td>
                        <td>{item?.CategoryName || "N/A"}</td>
                        <td>{item?.ComponentName || "N/A"}</td>
                        <td>{item?.JobCardNo || "N/A"}</td>
                        <td>{item?.L1?.toFixed(2) || "0.00"}</td>
                        <td>{item?.W1?.toFixed(2) || "0.00"}</td>
                        <td>{item?.T1?.toFixed(2) || "0.00"}</td>
                        <td>{item?.Qty1?.toFixed(2) || "0.00"}</td>
                        <td>{item?.L2?.toFixed(2) || "0.00"}</td>
                        <td>{item?.W2?.toFixed(2) || "0.00"}</td>
                        <td>{item?.T2?.toFixed(2) || "0.00"}</td>
                        <td>{item?.Qty2?.toFixed(2) || "0.00"}</td>
                        <td>
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => btnEditOnClick(item?.Id)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="14" className="text-center">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Col>
      </Row>

      <Row className="mt-3">
        <Col>
          <Button onClick={() => changePage(1)} disabled={currentPage === 1}>
            {"<<"}
          </Button>{" "}
          <Button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {"<"}
          </Button>{" "}
          <Button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {">"}
          </Button>{" "}
          <Button
            onClick={() => changePage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </Button>{" "}
          <span>
            Page{" "}
            <strong>
              {currentPage} of {totalPages}
            </strong>{" "}
          </span>
          <span>
            | Go to page:{" "}
            <input
              type="number"
              value={currentPage}
              onChange={e => changePage(Number(e.target.value))}
              style={{ width: "50px" }}
            />
          </span>
        </Col>
      </Row>

      {/* Modal for showing totals */}
      <Modal
        isOpen={isModalOpen}
        toggle={() => setIsModalOpen(!isModalOpen)}
        size="xl"
        centered
      >
        <ModalHeader toggle={() => setIsModalOpen(!isModalOpen)}>
          Collected Amount Details
        </ModalHeader>
        <ModalBody>
        <Row>
  <Col lg="6">
    <Table
      bordered
      hover
      responsive
      style={{
        maxHeight: "400px", /* Adjust the height as needed */
        overflowY: "auto", /* Vertical scroll */
        overflowX: "auto", /* Horizontal scroll */
        display: "block",
        border: "2px solid black", /* Black border around the table */
      }}
    >
      <thead className="thead-dark">
        <tr>
          <th>SalesPersonName</th>
          <th>Remarks</th>
          <th>Amount</th>
          <th>DateOfCreation</th>
        </tr>
      </thead>
      <tbody>
        {expenseArr.length > 0 ? (
          expenseArr.map(item => (
            <tr key={item?.Id || Math.random()}>
              <td>{item?.SalesPersonName || "N/A"}</td>
              <td>{item?.Remarks || "N/A"}</td>
              <td>{item?.Amount || "N/A"}</td>
              <td>{item?.DateOfCreation || "N/A"}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="11" className="text-center">
              No data available
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </Col>
  
  <Col lg="6" > {/* Vertical line between tables */}
    <Row>
      <Table
        bordered
        hover
        responsive
        style={{
          border: "2px solid black", /* Black border around the table */
        }}
      >
        <thead className="thead-dark">
          <tr>
            <th>Net Amount</th>
            <th>Total Amount</th>
            <th>Tax Amount</th>
            <th>Total Expense</th>
            <th>Cash Amount</th>
            <th>Online Amount</th>
            <th>Net-Expense</th>
            <th>Total - Expense</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{totals.netAmount.toFixed(2)}</td>
            <td>{totals.grossAmount.toFixed(2)}</td>
            <td>{totals.taxAmount.toFixed(2)}</td>
            <td>{parseFloat(totals.netExpense ?? 0).toFixed(2)}</td>
            <td>{parseFloat(totals.cashTotal ?? 0).toFixed(2)}</td>
            <td>{parseFloat(totals.onlineTotal ?? 0).toFixed(2)}</td>
            <td>
              {(totals.grossAmount - (parseFloat(totals.netExpense) || 0)).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </Table>
    </Row>
    <Row className="mb-2">
        <Col md="3">
          <FormControl
            type="number"
            value={Amount}
            onChange={e => setAmount(e.target.value)}
            className="mb-2"
          />
        </Col>
      
        <Col md="3">
          <Button
            type="button"
            onClick={handleAmountSubmit}
            variant="success"
            className="mb-2"
          >
            Submit
          </Button>
        </Col>
      </Row>
  </Col>
</Row>

        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  )
}

export default PageList_CardMaster
