import React, { useState } from 'react';
import { Row, Col, Card, CardHeader, CardBody, Modal, ModalHeader, ModalBody, ModalFooter, Button, Table, Input, Spinner } from 'reactstrap';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Fn_AddEditData, Fn_FillListData, Fn_GetReport } from '../../store/Functions';
import { API_WEB_URLS } from '../../constants/constAPI';

ChartJS.register(ArcElement, Tooltip, Legend);

const ReportingEntrySystem = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [state, setState] = useState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [selectedSequenceItem, setSelectedSequenceItem] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [editedItems, setEditedItems] = useState({});
  const API_URL_ByStatus = `${API_WEB_URLS.MASTER}/0/token/NewReportingByStatus`;
  const API_URL_ByContainer = `${API_WEB_URLS.MASTER}/0/token/NewReportingByContainer`;
  const API_URL_ByDepartment1 = `${API_WEB_URLS.MASTER}/0/token/NewTransferDataH`;
  const API_URL_ByTransferComponent = `${API_WEB_URLS.MASTER}/0/token/NewTransferDataComponents`;
  const API_URL_ByTransferMachine = `${API_WEB_URLS.MASTER}/0/token/TransferComponentMachineData`;
  const cards = [
    { id: 1, title: 'Not Started', color: '#10b981', icon: 'fa-circle' },
    { id: 2, title: 'Running', color: '#3b82f6', icon: 'fa-spinner' },
    { id: 3, title: 'Done', color: '#8b5cf6', icon: 'fa-check-circle' }
  ];

  const reloadData = async () => {
    if (selectedCard) {
      await Fn_FillListData(dispatch, setState, "ContainerArray", `${API_URL_ByStatus}/Id/${selectedCard}`);
    }
    if (selectedContainer) {
      await Fn_FillListData(dispatch, setState, "DepartmentArray", `${API_URL_ByContainer}/Id/${selectedContainer.ContainerMasterId}`);
    }
    if (selectedDepartment) {
      if (selectedDepartment.DepartmentId === 1) {
        await Fn_FillListData(dispatch, setState, "MachineDepartmentData", `${API_URL_ByDepartment1}/Id/${selectedDepartment.F_ContainerMaster}`);
      } else {
        const vformData = new FormData();
        vformData.append('F_ContainerMaster', selectedContainer?.ContainerMasterId || 0);
        vformData.append('DepartmentId', selectedDepartment.DepartmentId);
        await Fn_GetReport(dispatch, setState, "DepartmentWiseData", 'GetTransferDataByDepartment/0/token', { arguList: { id: 0, formData: vformData } }, true);
      }
    }
  };

  const handleCardClick = async (card) => {
    setIsLoading(true);
    try {
      setSelectedCard(card.id);
      setSearchQuery('');
      console.log(`Card clicked: ${card.title}`);
      await Fn_FillListData(dispatch, setState, "ContainerArray", `${API_URL_ByStatus}/Id/${card.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContainerClick = async (container) => {
    setIsLoading(true);
    try {
      console.log('Container Data:', container);
      setSelectedContainer(container);
      setShowModal(true);
      await Fn_FillListData(dispatch, setState, "DepartmentArray", `${API_URL_ByContainer}/Id/${container.ContainerMasterId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentClick = async (department) => {
    setIsLoading(true);
    try {
      console.log('Department Data:', department);

      // Handle DepartmentId = 1 separately
      if (department.DepartmentId === 1) {
        await handleSpecialDepartment(department);
        return;
      }

      setSelectedDepartment(department);
      const vformData = new FormData();
      vformData.append('F_ContainerMaster', selectedContainer.ContainerMasterId);
      vformData.append('DepartmentId', department.DepartmentId);
      await Fn_GetReport(
        dispatch,
        setState,
        "DepartmentWiseData",
        'GetTransferDataByDepartment/0/token',
        { arguList: { id: 0, formData: vformData } },
        true
      );
      setShowDetailsModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecialDepartment = async (department) => {
    console.log('Special Department Handling for DepartmentId:', department.DepartmentId);
    console.log('Department Details:', department);
    setSelectedDepartment(department);
    await Fn_FillListData(dispatch, setState, "MachineDepartmentData", `${API_URL_ByDepartment1}/Id/${department.F_ContainerMaster}`);
    setShowMachineModal(true);
  };

  const handleOpenMachineItem = async (item) => {
    setIsLoading(true);
    try {
      console.log('Machine Department Item Opened:', item);
      console.log('Item Details:', {
        Id: item.Id,
        ItemCode: item.ItemCode,
        ItemName: item.ItemName,
        Quantity: item.Quantity,
        ContractNo: item.ContractNo,
        F_ContainerMaster: item.F_ContainerMaster,
        F_ItemMaster: item.F_ItemMaster,
        F_ContainerMasterL: item.F_ContainerMasterL,
        DateOfCreation: item.DateOfCreation,
        LastUpdateOn: item.LastUpdateOn
      });
      await Fn_FillListData(dispatch, setState, "ComponentDetailsData", `${API_URL_ByTransferComponent}/Id/${item.Id}`);
      setShowComponentModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSequenceClick = async (item) => {
    setIsLoading(true);
    try {
      console.log("Sequence button clicked for item:", item);
      setSelectedSequenceItem(item);
      await Fn_FillListData(dispatch, setState, "ComponentMachineData", `${API_URL_ByTransferMachine}/Id/${item.Id}`);
      setShowSequenceModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMachineDateChange = async (id, field, value) => {
    setIsLoading(true);
    try {
      setState(prevState => ({
        ...prevState,
        ComponentMachineData: prevState.ComponentMachineData.map(m =>
          m.Id == id ? { ...m, [field]: value } : m
        )
      }));
      const changedMachine = state?.ComponentMachineData?.find(m => m.Id == id);
      console.log('Machine Date Changed (Sequence):', { 
        id, 
        field, 
        value, 
        relatedData: changedMachine,
        parentRowData: selectedSequenceItem
      });
      const ssmsValue = value ? value + ':00' : '';
      const formData = new FormData();
      formData.append('Id', id);
      formData.append('Type', field =='StartDate' ? 1 : 2);
      formData.append('NewDate', ssmsValue);
      formData.append('F_TransferComponentsL', selectedSequenceItem?.Id);
      
      if (value) {
        await Fn_AddEditData(
          dispatch,
          setState,
          { arguList: { id: 0, formData } },
          'UpdateTransferDate/0/token',
          true,
          "memberid",
          navigate,
          "#"
        );
        await reloadData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWoodIssueDateChange = async (id, field, value) => {
    setIsLoading(true);
    try {
      setState(prevState => ({
        ...prevState,
        ComponentDetailsData: prevState.ComponentDetailsData.map(item =>
          item.Id == id ? { ...item, [field]: value } : item
        )
      }));
      const changedItem = state?.ComponentDetailsData?.find(item => item.Id == id);
      console.log('Wood Issue Date Changed:', { id, field, value, relatedData: changedItem });
      const ssmsValue = value ? (value.includes('T') ? value + ':00' : value + 'T00:00:00') : '';
      let API_URL = '';
      if (field == 'WoodIssueStartDate') {
        API_URL = `${API_WEB_URLS.MASTER}/0/token/UpdateWoodIssueStartDate/${ssmsValue}/${id}`;
      } else {
        API_URL = `${API_WEB_URLS.MASTER}/0/token/UpdateWoodIssueEndDate/${ssmsValue}/${id}`;
      }
      if (value) {
        await Fn_FillListData(dispatch, setState, "nothing", API_URL, {}); 
        await reloadData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStorageDateChange = async (id, field, value) => {
    setIsLoading(true);
    try {
      setState(prevState => ({
        ...prevState,
        ComponentDetailsData: prevState.ComponentDetailsData.map(item =>
          item.Id == id ? { ...item, [field]: value } : item
        )
      }));
      const changedItem = state?.ComponentDetailsData?.find(item => item.Id == id);
      console.log('Storage Date Changed:', { id, field, value, relatedData: changedItem });
      const ssmsValue = value ? (value.includes('T') ? value + ':00' : value + 'T00:00:00') : '';
      let API_URL = '';
      if (field == 'StorageStartDate') {
        API_URL = `${API_WEB_URLS.MASTER}/0/token/UpdateStorageStartDate/${ssmsValue}/${id}`;
      } else {
        API_URL = `${API_WEB_URLS.MASTER}/0/token/UpdateStorageEndDate/${ssmsValue}/${id}`;
      }
      if (value) {
        await Fn_FillListData(dispatch, setState, "nothing", API_URL, {});
        await reloadData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSandingDateChange = async (id, field, value) => {
    setIsLoading(true);
    try {
      setState(prevState => ({
        ...prevState,
        ComponentDetailsData: prevState.ComponentDetailsData.map(item =>
          item.Id == id ? { ...item, [field]: value } : item
        )
      }));
      const changedItem = state?.ComponentDetailsData?.find(item => item.Id == id);
      console.log('Sanding Date Changed:', { id, field, value, relatedData: changedItem });
      const ssmsValue = value ? value + ':00' : '';
      let API_URL = '';
      if (field == 'SandingStartDate') {
        API_URL = `${API_WEB_URLS.MASTER}/0/token/UpdateSandingStartDate/${ssmsValue}/${id}`;
      } else {
        API_URL = `${API_WEB_URLS.MASTER}/0/token/UpdateSandingEndDate/${ssmsValue}/${id}`;
      }
      if (value) {
        await Fn_FillListData(dispatch, setState, "nothing", API_URL, {});
        await reloadData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return dateString.substring(0, 16);
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    return dateString.substring(0, 10);
  };

  const displayTextDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleDateChange = (itemId, field, value) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSaveItem = async (item) => {
    setIsLoading(true);
    try {
      const key = item.F_ContainerMasterL || item.Id;
      const updatedItem = {
        ...item,
        ...editedItems[key]
      };
      console.log('Save Item Data:', updatedItem);

      // Create FormData with required parameters
      const vFormData = new FormData();
      vFormData.append('F_ContainerMaster', updatedItem.F_ContainerMaster);
      vFormData.append('F_ContainerMasterL', updatedItem.F_ContainerMasterL);
      vFormData.append('StartDate', updatedItem.StartDate || '');
      vFormData.append('EndDate', updatedItem.EndDate || '');
      vFormData.append('ReportQty', updatedItem.ReportQty);
      vFormData.append('DepartmentId', selectedDepartment?.DepartmentId);

      // Make API call to save item data
      await Fn_AddEditData(
        dispatch,
        setState,
        { arguList: { id: 0, formData: vFormData } },
        'TransferDataByDepartment/0/token',
        true
      );
      console.log('Item saved successfully');
      // Clear the edited data for this item after save
      setEditedItems(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      await reloadData();
      alert('Item data saved successfully!');
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemValue = (item, field) => {
    const key = item.F_ContainerMasterL || item.Id;
    if (editedItems[key] && editedItems[key][field] !== undefined) {
      return editedItems[key][field];
    }
    return item[field];
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 11 }
        }
      }
    }
  };

  return (
    <Row className="reporting-entry-system">
      {/* Side Panel with Cards - Label: NewReportingEntry */}
      <Col lg="3" md="4" className="mb-3">
        <Card style={{ height: '100%', position: 'sticky', top: '20px' }}>
          <CardHeader>
            <h5 className="mb-0">
              <i className="fas fa-list-check me-2"></i>
              New Reporting Entry
            </h5>
          </CardHeader>
          <CardBody style={{ padding: '0' }}>
            <div className="cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px' }}>
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`card-item ${selectedCard === card.id ? 'active' : ''}`}
                  onClick={() => handleCardClick(card)}
                  style={{
                    borderLeft: `4px solid ${card.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    padding: '15px',
                    borderRadius: '8px',
                    backgroundColor: selectedCard === card.id ? '#f3f4f6' : '#fff',
                    boxShadow: selectedCard === card.id ? `0 4px 8px ${card.color}33` : '0 1px 3px rgba(0,0,0,0.1)',
                    border: `1px solid ${selectedCard === card.id ? card.color : '#e9ecef'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i
                      className={`fas ${card.icon}`}
                      style={{ color: card.color, fontSize: '18px' }}
                    ></i>
                    <div>
                      <h6 style={{ margin: '0', color: card.color, fontWeight: '600', fontSize: '14px' }}>
                        {card.title}
                      </h6>
                      <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '12px' }}>
                        Click to select
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedCard && (
              <div
                className="selected-info"
                style={{
                  margin: '12px 15px 0 15px',
                  padding: '12px',
                  backgroundColor: '#e0e7ff',
                  borderRadius: '8px',
                  borderLeft: `3px solid #3b82f6`,
                }}
              >
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
                  <i className="fas fa-info-circle me-2"></i>
                  Selected: <strong>{cards.find(c => c.id === selectedCard)?.title}</strong>
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </Col>

      {/* Main Content Area */}
      <Col lg="9" md="8">
        <Card>
          <CardHeader>
            <h5 className="mb-0">Reporting Details</h5>
          </CardHeader>
          <CardBody>
            {!selectedCard ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                <i className="fas fa-chart-bar" style={{ fontSize: '48px', marginBottom: '15px', display: 'block' }}></i>
                <p>Select a card from the left panel to view reporting details</p>
              </div>
            ) : (
              <div>
                <h6 style={{ marginBottom: '20px', fontWeight: '600' }}>
                  Containers for: <strong>{cards.find(c => c.id === selectedCard)?.title}</strong>
                </h6>

                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder="Search containers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                  {state?.ContainerArray && state?.ContainerArray.filter(container =>
                    container.ContainerNumber.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length > 0 ? (
                    state?.ContainerArray.filter(container =>
                      container.ContainerNumber.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((container) => (
                      <div
                        key={container.ContainerMasterId}
                        onClick={() => handleContainerClick(container)}
                        style={{
                          padding: '15px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057', marginBottom: '12px', textAlign: 'center' }}>
                          {container.ContainerNumber}
                        </div>
                        <div style={{ height: '150px', width: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pie
                            data={{
                              labels: ['Completed', 'Remaining'],
                              datasets: [{
                                data: [container.CompletionPercentage.toFixed(2), (100 - container.CompletionPercentage).toFixed(2)],
                                backgroundColor: [
                                  container.CompletionPercentage === 100 ? '#d4edda' :
                                    container.CompletionPercentage >= 50 ? '#fff3cd' : '#f8d7da',
                                  '#e9ecef'
                                ],
                                borderColor: [
                                  container.CompletionPercentage === 100 ? '#28a745' :
                                    container.CompletionPercentage >= 50 ? '#ffc107' : '#dc3545',
                                  '#d1d5db'
                                ],
                                borderWidth: 2
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: function (context) {
                                      return context.label + ': ' + context.parsed + '%';
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                      <p>No containers found for this status</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </Col>

      {/* Department Modal */}
      <Modal isOpen={showModal} toggle={() => setShowModal(false)} size="lg">
        <ModalHeader toggle={() => setShowModal(false)}>
          <i className="fas fa-building me-2"></i>
          Departments - <strong>{selectedContainer?.ContainerNumber}</strong>
        </ModalHeader>
        <ModalBody>
          <h6 style={{ marginBottom: '15px', fontWeight: '600' }}>Department Details</h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {state?.DepartmentArray && state?.DepartmentArray.length > 0 ? (
              state?.DepartmentArray.map((department) => (
                <div
                  key={department.DepartmentId}
                  onClick={() => handleDepartmentClick(department)}
                  style={{
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#495057', marginBottom: '12px', textAlign: 'center' }}>
                    {department.DepartmentName}
                  </div>
                  <div style={{ height: '130px', width: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pie
                      data={{
                        labels: ['Completed', 'Remaining'],
                        datasets: [{
                          data: [department.CompletionPercentage.toFixed(2), (100 - department.CompletionPercentage).toFixed(2)],
                          backgroundColor: [
                            department.CompletionPercentage === 100 ? '#d4edda' :
                              department.CompletionPercentage >= 50 ? '#fff3cd' : '#f8d7da',
                            '#e9ecef'
                          ],
                          borderColor: [
                            department.CompletionPercentage === 100 ? '#28a745' :
                              department.CompletionPercentage >= 50 ? '#ffc107' : '#dc3545',
                            '#d1d5db'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return context.label + ': ' + context.parsed + '%';
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6c757d', padding: '30px' }}>
                <p>No departments found</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Import Details Modal */}
      <Modal isOpen={showDetailsModal} toggle={() => setShowDetailsModal(false)} size="lg">
        <ModalHeader toggle={() => setShowDetailsModal(false)}>
          <i className="fas fa-file-import me-2"></i>
          Import Details - <strong>{selectedDepartment?.DepartmentName}</strong>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Items Quantity Distribution Chart */}
          {state?.DepartmentWiseData && state?.DepartmentWiseData.length > 0 && (
            <div style={{ marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <h6 style={{ marginBottom: '20px', fontWeight: '600', textAlign: 'center' }}>
                <i className="fas fa-chart-pie me-2"></i>
                Quantity Distribution
              </h6>
              <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pie
                  data={{
                    labels: state?.DepartmentWiseData.map(item => item.ItemCode),
                    datasets: [{
                      data: state?.DepartmentWiseData.map(item => item.Quantity),
                      backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        ...chartOptions.plugins.legend,
                        position: 'bottom',
                        labels: {
                          font: { size: 11 }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          <h6 style={{ marginBottom: '15px', fontWeight: '600' }}>Item Details</h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {state?.DepartmentWiseData && state?.DepartmentWiseData.length > 0 ? (
              state?.DepartmentWiseData.map((item) => (
                <div
                  key={item.F_ContainerMasterL || item.Id}
                  style={{
                    padding: '15px',
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ marginBottom: '12px', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
                      {item.ItemCode}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {item.ItemName}
                    </div>
                  </div>

                  {/* Pie Chart for Item Qty Distribution */}
                  <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                    <Pie
                      data={{
                        labels: ['Reported', 'Remaining'],
                        datasets: [{
                          data: [item.ReportQty, (item.Quantity - item.ReportQty)],
                          backgroundColor: [
                            item.ReportQty === item.Quantity ? '#d4edda' :
                              item.ReportQty > 0 ? '#fff3cd' : '#f8d7da',
                            '#e9ecef'
                          ],
                          borderColor: [
                            item.ReportQty === item.Quantity ? '#28a745' :
                              item.ReportQty > 0 ? '#ffc107' : '#dc3545',
                            '#d1d5db'
                          ],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return context.label + ': ' + context.parsed;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid #e9ecef' }}>
                    <div style={{ fontWeight: '600', color: '#495057', fontSize: '12px', marginBottom: '6px' }}>
                      Dimensions (W × D × H):
                    </div>
                    <div style={{ color: '#6c757d', fontSize: '11px' }}>
                      {item.ItemWidth} × {item.ItemDepth} × {item.ItemHeight} cm
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>ALCode:</span>
                      <div style={{ color: '#6c757d' }}>{item.ALCode}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Job Card:</span>
                      <div style={{ color: '#6c757d' }}>{item.JobCardInitial}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Contract:</span>
                      <div style={{ color: '#6c757d' }}>{item.ContractNo}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Container:</span>
                      <div style={{ color: '#3b82f6', fontWeight: '500' }}>{item.ContainerNumber}</div>
                    </div>
                  </div>

                  {/* Start Date and End Date */}
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e9ecef' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontWeight: '600', color: '#495057', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                          Report Qty / Actual qty ({item.Quantity}):
                        </label>
                        <input
                          type="number"
                          value={getItemValue(item, 'ReportQty')}
                          onChange={(e) => handleDateChange(item.F_ContainerMasterL || item.Id, 'ReportQty', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontWeight: '600', color: '#495057', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                          Start Date:
                        </label>
                        <input
                          type="date"
                          value={getItemValue(item, 'StartDate') ? getItemValue(item, 'StartDate').split('T')[0] : ''}
                          onChange={(e) => handleDateChange(item.F_ContainerMasterL || item.Id, 'StartDate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontWeight: '600', color: '#495057', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                          End Date:
                        </label>
                        <input
                          type="date"
                          value={getItemValue(item, 'EndDate') ? getItemValue(item, 'EndDate').split('T')[0] : ''}
                          onChange={(e) => handleDateChange(item.F_ContainerMasterL || item.Id, 'EndDate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveItem(item)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      <i className="fas fa-save me-2"></i>Save
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6c757d', padding: '30px' }}>
                <p>No import details found</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Machine Department Modal - For DepartmentId = 1 */}
      <Modal isOpen={showMachineModal} toggle={() => setShowMachineModal(false)} size="lg">
        <ModalHeader toggle={() => setShowMachineModal(false)}>
          <i className="fas fa-cogs me-2"></i>
          Machine Department Items - <strong>{selectedDepartment?.DepartmentName}</strong>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <h6 style={{ marginBottom: '15px', fontWeight: '600' }}>Available Items</h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {state?.MachineDepartmentData && state?.MachineDepartmentData.length > 0 ? (
              state?.MachineDepartmentData.map((item) => (
                <div
                  key={item.Id}
                  style={{
                    padding: '15px',
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ marginBottom: '12px', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
                      {item.ItemCode}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {item.ItemName}
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid #e9ecef' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#495057' }}>Quantity:</span>
                        <div style={{ color: '#6c757d', fontWeight: '600', fontSize: '12px' }}>{item.Quantity}</div>
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: '#495057' }}>Contract:</span>
                        <div style={{ color: '#6c757d' }}>{item.ContractNo}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Container Master:</span>
                      <div style={{ color: '#3b82f6', fontWeight: '500' }}>{item.F_ContainerMaster}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Item Master:</span>
                      <div style={{ color: '#3b82f6', fontWeight: '500' }}>{item.F_ItemMaster}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Container Master L:</span>
                      <div style={{ color: '#6c757d' }}>{item.F_ContainerMasterL}</div>
                    </div>
                    <div>
                      <span style={{ fontWeight: '600', color: '#495057' }}>Created Date:</span>
                      <div style={{ color: '#6c757d' }}>{new Date(item.DateOfCreation).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenMachineItem(item)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      marginTop: '12px',
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10b981';
                    }}
                  >
                    <i className="fas fa-folder-open me-2"></i>Open
                  </button>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#dc3545', padding: '30px', fontWeight: 'bold' }}>
                <p>Create jobCard first to Start Reporting</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowMachineModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Component Details Fullscreen Modal */}
      <Modal isOpen={showComponentModal} toggle={() => setShowComponentModal(false)} fullscreen>
        <ModalHeader toggle={() => setShowComponentModal(false)}>
          <i className="fas fa-list me-2"></i>
          Component Details
        </ModalHeader>
        <ModalBody style={{ overflowX: 'auto' }}>
          <Table bordered hover responsive size="sm" className="text-center align-middle" style={{ minWidth: '1200px' }}>
            <thead className="table-light">
              <tr>
                <th rowSpan="2" className="align-middle">Component Name</th>
                <th rowSpan="2" className="align-middle">Size</th>
                <th colSpan="2" className="align-middle">Wood Issue</th>
                <th colSpan="3" className="align-middle">Machine</th>
                <th colSpan="2" className="align-middle">Storage</th>
                <th colSpan="2" className="align-middle">Sanding</th>
              </tr>
              <tr>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Action</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {state?.ComponentDetailsData && state?.ComponentDetailsData.length > 0 ? (
                state?.ComponentDetailsData.map((comp) => (
                  <tr key={comp.Id}>
                    <td className="text-start">{comp.ComponentName}</td>
                    <td>{comp.Size}</td>

                    {/* Wood Issue */}
                    <td>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={formatDateOnly(comp.WoodIssueStartDate)}
                        onChange={(e) => handleWoodIssueDateChange(comp.Id, 'WoodIssueStartDate', e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={formatDateOnly(comp.WoodIssueEndDate)}
                        onChange={(e) => handleWoodIssueDateChange(comp.Id, 'WoodIssueEndDate', e.target.value)}
                      />
                    </td>

                    {/* Machine */}
                    <td>{displayTextDate(comp.MachineStartDate)}</td>
                    <td>{displayTextDate(comp.MachineEndDate)}</td>
                    <td>
                      <Button color="primary" size="sm" onClick={() => handleSequenceClick(comp)}>
                        Sequence
                      </Button>
                    </td>

                    {/* Storage */}
                    <td>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={formatDateOnly(comp.StorageStartDate)}
                        onChange={(e) => handleStorageDateChange(comp.Id, 'StorageStartDate', e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={formatDateOnly(comp.StorageEndDate)}
                        onChange={(e) => handleStorageDateChange(comp.Id, 'StorageEndDate', e.target.value)}
                      />
                    </td>

                    {/* Sanding */}
                    <td>
                      <Input
                        type="datetime-local"
                        bsSize="sm"
                        value={formatDateTime(comp.SandingStartDate)}
                        onChange={(e) => handleSandingDateChange(comp.Id, 'SandingStartDate', e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        type="datetime-local"
                        bsSize="sm"
                        value={formatDateTime(comp.SandingEndDate)}
                        onChange={(e) => handleSandingDateChange(comp.Id, 'SandingEndDate', e.target.value)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center">No Data Available</td>
                </tr>
              )}
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowComponentModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Sequence Modal */}
      <Modal isOpen={showSequenceModal} toggle={() => setShowSequenceModal(false)} size="lg">
        <ModalHeader toggle={() => setShowSequenceModal(false)}>
          <i className="fas fa-list-ol me-2"></i>
          Sequence Details
        </ModalHeader>
        <ModalBody style={{ overflowX: 'auto' }}>
          <Table bordered hover responsive size="sm" className="text-center align-middle">
            <thead className="table-light">
              <tr>
                <th>Machine Name</th>
                <th>Sequence</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {state?.ComponentMachineData && state?.ComponentMachineData.length > 0 ? (
                state?.ComponentMachineData.map((machine) => (
                  <tr key={machine.Id}>
                    <td className="text-start">{machine.MachineName}</td>
                    <td>{machine.Sequence}</td>
                    <td>
                      <Input
                        type="datetime-local"
                        bsSize="sm"
                        value={formatDateTime(machine.StartDate)}
                        onChange={(e) => handleMachineDateChange(machine.Id, 'StartDate', e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        type="datetime-local"
                        bsSize="sm"
                        value={formatDateTime(machine.EndDate)}
                        onChange={(e) => handleMachineDateChange(machine.Id, 'EndDate', e.target.value)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">No Data Available</td>
                </tr>
              )}
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowSequenceModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Global Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(255, 255, 255, 0.7)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        </div>
      )}
    </Row>
  );
};

export default ReportingEntrySystem;
