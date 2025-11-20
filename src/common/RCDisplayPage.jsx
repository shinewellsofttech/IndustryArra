import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Input,
  Button,
  Card,
  CardBody,
  Table,
  Label,
  UncontrolledTooltip,
  Pagination,
  PaginationItem,
  PaginationLink,
  Progress,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import SweetAlert from "react-bootstrap-sweetalert";
import Breadcrumbs from "../components/Common/Breadcrumb";

const RCDisplayPage = ({
  breadCrumbTitle,
  breadcrumbItem,
  dynamic_title,
  dynamic_description,
  gridData,
  gridHeader,
  gridBody,
  isOpenModal,
  isSearchBox,
  isAdd,
  isEdit,
  isDelete,
  isCheckBox,
  isSNo,
  isViewDetails,
  isProgress,
  isPagination,
  confirm_alert,
  success_dlg,
  modalTitle,
  modalBody,
  togglemodal,
  toggleDeleteConfirm,
  toggleDeleteSuccess,
  btnAdd_onClick,
  btnEdit_onClick,
  btnDelete_onClick,
  SearchKeyArray,
  searchKey,
  handleSearchChange,
  handleSearchKey,
  handlePageChange,
  CheckedArray,
  CheckBoxChange,
  CheckAllChange,
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);


  const paginationItems = [];
  let currentItems;
  const dataToPaginate = gridData;

  if (dataToPaginate) {
    
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    currentItems = dataToPaginate.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(dataToPaginate.length / itemsPerPage);

    for (let i = 1; i <= totalPages; i++) {
      paginationItems.push(
        <PaginationItem key={i} active={i === currentPage}>
          <PaginationLink onClick={() => handlePageChange(i)} href="#">
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
  }

  return (
    <React.Fragment>
      <div>
        <Container fluid>
          <Breadcrumbs title={breadCrumbTitle} breadcrumbItem={breadcrumbItem} />
          <Row style={{ marginTop: "0px" }}>
            <Col xs="12">
              <Card>
                <CardBody>
                  {/* Search Container */}
                  {SearchKeyArray &&
                    SearchKeyArray.length > 0 &&
                    SearchKeyArray.map((item, index) => (
                      <span
                        key={index}
                        style={{
                          margin: "10px",
                          cursor: "pointer",
                          padding: "5px 10px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          display: "inline-block",
                          transition: "transform 0.2s",
                          backgroundColor: searchKey === item ? "blue" : "white",
                          color: searchKey === item ? "white" : "black",
                        }}
                        onClick={() => handleSearchKey(item)}
                      >
                        {item}
                      </span>
                    ))}

                  {isSearchBox || isAdd ? (
                    <Row className="mb-2">
                      {isSearchBox ? (
                        <Col sm="4">
                          <div className="search-box mr-2 mb-2 d-inline-block">
                            <div className="position-relative">
                              <Input
                                type="text"
                                className="form-control"
                                placeholder="Search..."
                                onChange={handleSearchChange}
                              />
                              <i className="bx bx-search-alt search-icon"></i>
                            </div>
                          </div>
                        </Col>
                      ) : null}
                      {isAdd ? (
                        <Col sm="8">
                          <div className="text-sm-right">
                            <Button
                              type="button"
                              onClick={btnAdd_onClick}
                              color="success"
                              className="btn-rounded waves-effect waves-light mb-2 mr-2"
                            >
                              <i className="mdi mdi-plus mr-1"></i> Add New
                            </Button>
                          </div>
                        </Col>
                      ) : null}
                    </Row>
                  ) : null}

                  {/* Table Data */}
                  <div className="table-responsive">
                    {isProgress ? (
                      <Progress
                        value={100}
                        color="primary"
                        style={{ width: "100%" }}
                        animated
                      ></Progress>
                    ) : null}
                    {!dataToPaginate || dataToPaginate.length === 0 ? (
                      <div>Data not Found</div>
                    ) : (
                      <Table className="table table-centered table-nowrap">
                        <thead className="thead-light">
                          <tr>
                            {isCheckBox ? (
                              <th style={{ width: "20px" }}>
                                <div className="custom-control custom-checkbox">
                                  <Input
                                    type="checkbox"
                                    className="custom-control-input"
                                    id="chkAll"
                                    onChange={CheckAllChange}
                                  />
                                  <Label
                                    className="custom-control-label"
                                    htmlFor="chkAll"
                                  >
                                    &nbsp;
                                  </Label>
                                </div>
                              </th>
                            ) : null}
                            {isSNo ? <th>S. No.</th> : null}
                            {gridHeader()}
                            {isViewDetails ? <th>View Details</th> : null}
                            {isEdit || isDelete ? <th>Action</th> : null}
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems
                            ? currentItems.map((formData, key) => (
                                <tr key={"rawData_" + key}>
                                  {isCheckBox ? (
                                    <td>
                                      <div className="custom-control custom-checkbox">
                                        <Input
                                          type="checkbox"
                                          className="custom-control-input"
                                          id={formData.id}
                                          checked={CheckedArray.includes(formData.Id)}
                                          onChange={(event) =>
                                            CheckBoxChange(formData.Id, event)
                                          }
                                        />
                                        <Label
                                          className="custom-control-label"
                                          htmlFor={formData.id}
                                        >
                                          &nbsp;
                                        </Label>
                                      </div>
                                    </td>
                                  ) : null}
                                  {isSNo ? (
                                    <td>{indexOfFirstItem + key + 1}</td>
                                  ) : null}
                                  {gridBody(formData)}
                                  {isViewDetails ? (
                                    <td>
                                      <Button
                                        type="button"
                                        color="primary"
                                        className="btn-sm btn-rounded"
                                        onClick={() =>
                                          togglemodal(props.obj, formData)
                                        }
                                      >
                                        View Details
                                      </Button>
                                    </td>
                                  ) : null}
                                  <td>
                                    <div className="d-flex gap-3">
                                      {isEdit ? (
                                        <Link
                                          to="#"
                                          value={formData}
                                          className="mr-3 text-primary"
                                          onClick={(e) => btnEdit_onClick(e,formData)}
                                        >
                                          <i
                                            className="mdi mdi-pencil font-size-18 mr-3"
                                            id="edittooltip"
                                          ></i>
                                          <UncontrolledTooltip
                                            placement="top"
                                            target="edittooltip"
                                          >
                                            Edit
                                          </UncontrolledTooltip>
                                        </Link>
                                      ) : null}
                                      {isDelete ? (
                                        <Link
                                          to="#"
                                          value={formData}
                                          className="text-danger"
                                          onClick={() =>
                                            toggleDeleteConfirm(props.obj, formData, true)
                                          }
                                        >
                                          <i
                                            className="mdi mdi-close font-size-18 mr-3"
                                            id="deletetooltip"
                                          ></i>
                                          <UncontrolledTooltip
                                            placement="top"
                                            target="deletetooltip"
                                          >
                                            Delete
                                          </UncontrolledTooltip>
                                        </Link>
                                      ) : null}
                                    </div>
                                    {confirm_alert ? (
                                      <SweetAlert
                                        title="Are you sure?"
                                        warning
                                        showCancel
                                        confirmButtonText="Yes, delete it!"
                                        confirmBtnBsStyle="success"
                                        cancelBtnBsStyle="danger"
                                        onConfirm={() => btnDelete_onClick(props.selectedFormData)}
                                        onCancel={() =>
                                          toggleDeleteConfirm(props.obj, formData, false)
                                        }
                                      >
                                        You won&apos;t be able to revert this!
                                      </SweetAlert>
                                    ) : null}
                                    {success_dlg ? (
                                      <SweetAlert
                                        success
                                        title={dynamic_title}
                                        onConfirm={() => toggleDeleteSuccess(props.obj, false)}
                                      >
                                        {dynamic_description}
                                      </SweetAlert>
                                    ) : null}
                                  </td>
                                </tr>
                              ))
                            : null}
                        </tbody>
                      </Table>
                    )}
                  </div>

                  {/* Pagination */}
                  {isPagination ? (
                    <Pagination className="pagination pagination-rounded justify-content-end mb-2">
                      {paginationItems}
                      </Pagination>
                    ) : null}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </Container>
        </div>

        <Modal
          isOpen={isOpenModal}
          role="dialog"
          autoFocus={true}
          centered={true}
          className="exampleModal"
          tabIndex="-1"
          toggle={() => togglemodal(props.obj, null)}
        >
          <div className="modal-content">
            <ModalHeader toggle={() => togglemodal(props.obj, null)}>
              {modalTitle}
            </ModalHeader>
            <ModalBody>{modalBody(props.selectedFormData)}</ModalBody>
            <ModalFooter>
              <Button
                type="button"
                color="secondary"
                onClick={() => togglemodal(props.obj, null)}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      </React.Fragment>
    );
};

RCDisplayPage.propTypes = {
  obj: PropTypes.object,
  selectedFormData: PropTypes.object,
  breadCrumbTitle: PropTypes.string,
  breadcrumbItem: PropTypes.string,
  dynamic_title: PropTypes.string,
  dynamic_description: PropTypes.string,
  gridData: PropTypes.array,
  gridHeader: PropTypes.func,
  gridBody: PropTypes.func,
  isOpenModal: PropTypes.bool,
  isSearchBox: PropTypes.bool,
  isAdd: PropTypes.bool,
  isEdit: PropTypes.bool,
  isDelete: PropTypes.bool,
  isCheckBox: PropTypes.bool,
  isSNo: PropTypes.bool,
  isViewDetails: PropTypes.bool,
  isProgress: PropTypes.bool,
  isPagination: PropTypes.bool,
  confirm_alert: PropTypes.bool,
  success_dlg: PropTypes.bool,
  modalTitle: PropTypes.string,
  modalBody: PropTypes.func,
  togglemodal: PropTypes.func,
  toggleDeleteConfirm: PropTypes.func,
  toggleDeleteSuccess: PropTypes.func,
  btnAdd_onClick: PropTypes.func,
  btnEdit_onClick: PropTypes.func,
  btnDelete_onClick: PropTypes.func,
  SearchKeyArray: PropTypes.array,
  searchKey: PropTypes.string,
  handleSearchChange: PropTypes.func,
  handleSearchKey: PropTypes.func,
  handlePageChange: PropTypes.func,
  CheckedArray: PropTypes.array,
  CheckBoxChange: PropTypes.func,
  CheckAllChange: PropTypes.func,
};

export default RCDisplayPage;
