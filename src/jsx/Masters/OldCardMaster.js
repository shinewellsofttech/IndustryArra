import React, { useEffect, useMemo, useState } from "react";
import PageTitle from "../layouts/PageTitle";
import {
  useTable,
  useGlobalFilter,
  useFilters,
  usePagination,
} from "react-table";
import MOCK_DATA from "../components/table/FilteringTable/MOCK_DATA_2.json";
import { Row, Col, Button, FormControl, Table, Spinner } from "react-bootstrap";
import { GlobalFilter } from "../components/table/FilteringTable/GlobalFilter";
//import './table.css';
import "../components/table/FilteringTable/filtering.css";
import { ColumnFilter } from "../components/table/FilteringTable/ColumnFilter";
import { DateFilter } from "../components/table/FilteringTable/DateFilter";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { API_WEB_URLS } from "../../constants/constAPI";
import { Fn_AddEditData, Fn_FillListData } from "../../store/Functions";
import { OutTable, ExcelRenderer } from "react-excel-renderer";
import * as XLSX from "xlsx";

export const PageList_CardMaster = () => {
  const [State, setState] = useState({
    id: 0,
    FillArray: [],
    formData: {},
    OtherDataScore: [],
    isProgress: true,
  });
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const API_URL = API_WEB_URLS.MASTER + "/0/token/MainMaster";
  const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/Items`;
  const rtPage_Add = "/AddCard";
  const rtPage_Edit = "/AddCard";
  const rtPage_Job = "/jobcardform";
  const [excelData, setExcelData] = useState(null);
  const [F_ItemMaster, setItemMaster] = useState(0);
  const API_URL_SAVE = "MainMasterExcel/0/token";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      Fn_FillListData(dispatch, setState, "FillArray", 	`${API_URL1}/Id/0`);
      Fn_FillListData(dispatch, setGridData, "gridData", API_URL + "/Id/0");
      setLoading(false);
    };

    fetchData();
  }, [dispatch, API_URL]);

  const btnAddOnClick = () => {
    navigate(rtPage_Add, { state: { Id: 0 } });
  };

  const btnEditOnClick = (Id) => {
    navigate(rtPage_Edit, { state: { Id } });
  };

  const btnCreateJobCard = (Id) => {
    navigate(rtPage_Job, { state: { Id } });
    console.log("created", Id);
  };

  const COLUMNS = [
    {
      Header: "Id",
      Footer: "Id",
      accessor: "Id",
      Filter: ColumnFilter,
      //disableFilters: true,
    },
    {
      Header: "CategoryName",
      Footer: "CategoryName",
      accessor: "CategoryName",
      Filter: ColumnFilter,
    },
    {
      Header: "ComponentName",
      Footer: "ComponentName",
      accessor: "ComponentName",
      Filter: ColumnFilter,
    },
    {
      Header: "JobCardNo",
      Footer: "JobCardNo",
      accessor: "JobCardNo",
      Filter: ColumnFilter,
    },
    {
      Header: "L1",
      Footer: "L1",
      accessor: "L1",
      Filter: ColumnFilter,
    },
    {
      Header: "W1",
      Footer: "W1",
      accessor: "W1",
      Filter: ColumnFilter,
    },
    {
      Header: "T1",
      Footer: "T1",
      accessor: "T1",
      Filter: ColumnFilter,
    },
    {
      Header: "Qty1",
      Footer: "Qty1",
      accessor: "Qty1",
      Filter: ColumnFilter,
    },
    {
      Header: "L2",
      Footer: "L2",
      accessor: "L2",
      Filter: ColumnFilter,
    },
    {
      Header: "W2",
      Footer: "W2",
      accessor: "W2",
      Filter: ColumnFilter,
    },
    {
      Header: "T2",
      Footer: "T2",
      accessor: "T2",
      Filter: ColumnFilter,
    },
    {
      Header: "Qty2",
      Footer: "Qty2",
      accessor: "Qty2",
      Filter: ColumnFilter,
    },

    {
      Header: "Edit",
      Cell: ({ row }) => (
        <Button
          variant="warning"
          size="sm"
          onClick={() => btnEditOnClick(row.original.Id)}
        >
          Edit
        </Button>
      ),
    },
    {
      Header: "Create",
      Cell: ({ row }) =>
      row.original.JobCardNo == null ? (
        <Button
            variant="warning"
            size="sm"
            onClick={() => btnCreateJobCard(row.original.Id)}
          >
            Create Job Card
          </Button>
        ) : null,
    },
  ];
  const columns = useMemo(() => COLUMNS, []);
  const data = useMemo(() => gridData, [gridData]);
  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0 },
    },
    useFilters,
    useGlobalFilter,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state,
    page,
    gotoPage,
    pageCount,
    pageOptions,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    setGlobalFilter,
  } = tableInstance;

  const { globalFilter, pageIndex } = state;

  // const handleFileUpload = (event) => {
  //   const file = event.target.files[0];
  //   if (file) {
  //     ExcelRenderer(file, (err, resp) => {
  //       if (err) {
  //         console.error(err);
  //       } else {
  //         const { rows } = resp;
  //         if (rows.length < 2) return; 
  
  //         const headers = rows[0]; 
  //         const renameMap = {
  //           "CATEGORY": "Category",
  //           "COMPONENT NAME": "ComponentName"
  //         };
  
  //         const unwantedKeys = [
  //           "ITEM CODE", 
  //           "WOOD AND SUB ASSEMBLY", 
  //           "JOB CARD NUMBER", 
  //           "PICTURE", 
  //           "S No"
  //         ];
  
  //         const filteredHeaders = headers.filter(header => !unwantedKeys.includes(header));
  
  //         const data = rows.slice(1).map((row) => {
  //           let obj = {};
  //           filteredHeaders.forEach((header, index) => {
  //             const newKey = renameMap[header] || header; 
  //             let value = row[headers.indexOf(header)];
  
  //             // Convert null, undefined, or empty values to 0
  //             obj[newKey] = value !== null && value !== undefined && value !== "" ? value : 0;
  //           });
  //           return obj;
  //         });
  
  //         console.log(data);
  //         setExcelData(data);
  //       }
  //     });
  //   }
  // };
  

   const handleFileUpload = (event) => {


     const file = event.target.files[0];
    
        if (file) {
          const reader = new FileReader();
    
          reader.onload = (e) => {
            const binaryStr = e.target.result;
            const workbook = XLSX.read(binaryStr, { type: "binary" });
    
            // Get all sheet names
            const sheetNames = workbook.SheetNames;
    
            if (sheetNames.length >= 3) {
              // Get the 3rd sheet (index 2)
              const thirdSheet = workbook.Sheets[sheetNames[1]];

              const sheetData = XLSX.utils.sheet_to_json(thirdSheet, { header: 1 }); // Extract as array

              let columns = sheetData[0];

              // Handle duplicate column names
              let columnCount = {};
              columns = columns.map((column) => {
                if (["L", "W", "T", "QTY"].includes(column)) {
                  columnCount[column] = (columnCount[column] || 0) + 1;
                  return `${column}${columnCount[column]}`;
                }
                return column;
              });

              const data = sheetData.slice(1);

              const transformedData = data.map((row) => {
                const rowData = {};
                columns.forEach((column, index) => {
                  rowData[column] = row[index];
                });
                return rowData;
              });

              const filteredData = transformedData.map(obj => ({
                CATEGORY: obj.CATEGORY,
                COMPONENTNAME: obj["COMPONENT NAME"], // Rename key by removing space
                L1: obj.L1,
                L2: obj.L2,
                QTY1: obj.QTY1,
                QTY2: obj.QTY2,
                T1: obj.T1,
                T2: obj.T2,
                W1: obj.W1,
                W2: obj.W2
              }));



              setExcelData(filteredData);

              
              
              
          
            // let copiedRows = [...filteredAndSortedData]; // Copy the data
                    
            //   // Convert to JSON
            //   const jsonData = JSON.stringify(copiedRows, null, 2);
              
            //   // Create a Blob
            //   const blob = new Blob([jsonData], { type: "application/json" });
              
            //   // Create a downloadable link
            //   const link = document.createElement("a");
            //   link.href = URL.createObjectURL(blob);
            //   link.download = "excel-data.json"; // File name
            //   document.body.appendChild(link);
            //   link.click();
            //   document.body.removeChild(link);
              
    
    
            } else {
              alert("The Excel file must have at least 3 sheets!");
            }
          };
    
          reader.readAsBinaryString(file);
        }

   }
  
  


  

  const handleSaveFile = (event) => {
    event.preventDefault();
    try {
      const formData = new FormData();

      formData.append("UserId", 1);
      formData.append("F_ItemMaster", F_ItemMaster);
      formData.append("Data", JSON.stringify(excelData));

      Fn_AddEditData(
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

  return (
    <>
      <PageTitle activeMenu="Filtering" motherMenu="Table" />
<Row>
	<Col lg='8'>

      <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
	</Col>
	<Col lg='4'>
	<Button
            type="button"
            onClick={btnAddOnClick}
            variant="success"
            className="mb-2"
          >
            Add New
          </Button>
	</Col>
</Row>

      <Row className="mb-2">
     
		
        <Col lg="2">
          <select
            className="form-control"
            name="F_ItemMaster"
            onChange={(e) => setItemMaster(e.target.value)}
            value={F_ItemMaster}
          >
            <option value="">Select Item</option>
            {State.FillArray.length > 0 &&
              State.FillArray.map((option) => (
                <option key={option.Id} value={option.Id}>
                  {option.Name}
                </option>
              ))}
          </select>
        </Col>
        <Col md="2">
          <FormControl
            type="file"
              accept=".xlsx, .xlsm"
            onChange={handleFileUpload}
            className="mb-2"
          />
        </Col>

        <Col md="1">
          <Button
            type="button"
            onClick={handleSaveFile}
            variant="primary"
            className="mb-2"
          >
            Save
          </Button>
        </Col>
      </Row>
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">Table Filtering</h4>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table {...getTableProps()} className="table dataTable display">
              <thead>
                {headerGroups.map((headerGroup) => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column) => (
                      <th {...column.getHeaderProps()}>
                        {column.render("Header")}
                        {column.canFilter ? column.render("Filter") : null}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()} className="">
                {page.map((row) => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()}>
                      {row.cells.map((cell) => {
                        return (
                          <td {...cell.getCellProps()}>
                            {" "}
                            {cell.render("Cell")}{" "}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="d-flex justify-content-between">
              <span>
                Page{" "}
                <strong>
                  {pageIndex + 1} of {pageOptions.length}
                </strong>
                {""}
              </span>
              <span className="table-index">
                Go to page :{" "}
                <input
                  type="number"
                  className="ml-2"
                  defaultValue={pageIndex + 1}
                  onChange={(e) => {
                    const pageNumber = e.target.value
                      ? Number(e.target.value) - 1
                      : 0;
                    gotoPage(pageNumber);
                  }}
                />
              </span>
            </div>
            <div className="text-center">
              <div className="filter-pagination  mt-3">
                <button
                  className=" previous-button"
                  onClick={() => gotoPage(0)}
                  disabled={!canPreviousPage}
                >
                  {"<<"}
                </button>

                <button
                  className="previous-button"
                  onClick={() => previousPage()}
                  disabled={!canPreviousPage}
                >
                  Previous
                </button>
                <button
                  className="next-button"
                  onClick={() => nextPage()}
                  disabled={!canNextPage}
                >
                  Next
                </button>
                <button
                  className=" next-button"
                  onClick={() => gotoPage(pageCount - 1)}
                  disabled={!canNextPage}
                >
                  {">>"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default PageList_CardMaster;