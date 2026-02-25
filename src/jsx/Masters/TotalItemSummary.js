import React, { useEffect, useState } from 'react'
import { Fn_FillListData } from '../../store/Functions';
import { useDispatch } from 'react-redux';
import { API_WEB_URLS } from '../../constants/constAPI';
import { Spinner, Modal, Table, Button, FormControl } from 'react-bootstrap';
import { PageList_ComponentMaster } from './PageList_ComponentMaster';

function TotalItemSummary() {
    const [state, setState] = useState({})
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [componentsData, setComponentsData] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewMode, setViewMode] = useState('items'); // 'items' or 'components'
    const [statusFilter, setStatusFilter] = useState(null); // null (all), true (active), false (inactive)
    const [searchTerm, setSearchTerm] = useState('');
    const [compSearchTerm, setCompSearchTerm] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const [compModalLoading, setCompModalLoading] = useState(false);
    const dispatch = useDispatch();
    const API_URL = API_WEB_URLS.MASTER + '/0/token/ItemTotalSummary/Id/0'
    useEffect(() => {
            const fetchData = async () => {
              console.log('useEffect running');
              setLoading(true);
               Fn_FillListData(dispatch, setState, "SummaryData", API_URL);
              setLoading(false);
            };
        
            fetchData();
          }, [dispatch, API_URL]);

    const handleTotalItemsClick = async () => {
        try {
            setViewMode('items');
            setSelectedItem(null);
            setStatusFilter(null);
            setShowModal(true);
            setModalLoading(true);
            await Fn_FillListData(dispatch, setGridData, "gridData", API_WEB_URLS.MASTER + "/0/token/ItemMaster/Id/0");
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setModalLoading(false);
        }
    };

    const filteredItems = (Array.isArray(gridData) ? gridData : []).filter(item => 
        item.Name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.ItemCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleItemRowClick = async (item) => {
        setSelectedItem(item);
        setCompModalLoading(true);
        setViewMode('components');
        // Fetch components for this item
        await Fn_FillListData(dispatch, setComponentsData, "gridData", API_WEB_URLS.MASTER + "/0/token/Components/Id/0");
        setCompModalLoading(false);
    };

    const handleActualComponentsClick = async () => {
        try {
            setSelectedItem(null);
            setStatusFilter(null);
            setViewMode('components');
            setShowModal(true);
            setCompModalLoading(true);
            // Fetch all components
            await Fn_FillListData(dispatch, setComponentsData, "gridData", API_WEB_URLS.MASTER + "/0/token/Components/Id/0");
        } catch (error) {
            console.error("Error fetching all components:", error);
        } finally {
            setCompModalLoading(false);
        }
    };

    const handleStatusComponentClick = async (isActive) => {
        try {
            setSelectedItem(null);
            setStatusFilter(isActive);
            setViewMode('components');
            setShowModal(true);
            setCompModalLoading(true);
            // Fetch components
            await Fn_FillListData(dispatch, setComponentsData, "gridData", API_WEB_URLS.MASTER + "/0/token/Components/Id/0");
        } catch (error) {
            console.error(`Error fetching ${isActive ? 'active' : 'inactive'} components:`, error);
        } finally {
            setCompModalLoading(false);
        }
    };

    const handleBackToItems = () => {
        setViewMode('items');
        setSelectedItem(null);
        setStatusFilter(null);
        setCompSearchTerm('');
    };

    const filteredComponents = (Array.isArray(componentsData) ? componentsData : []).filter(comp => {
        const matchesItem = selectedItem ? comp.ItemCode === selectedItem.ItemCode : true;
        const matchesStatus = statusFilter !== null ? comp.IsActive === statusFilter : true;
        const matchesSearch = comp.Name?.toLowerCase().includes(compSearchTerm.toLowerCase()) || 
                             comp.CategoryName?.toLowerCase().includes(compSearchTerm.toLowerCase()) ||
                             comp.ItemCode?.toLowerCase().includes(compSearchTerm.toLowerCase());
        return matchesItem && matchesStatus && matchesSearch;
    });
  const summary = state.SummaryData && state.SummaryData.length > 0 ? state.SummaryData[0] : {};

  return (
    <div className="container-fluid">
       <div className="row page-titles mx-0">
            <div className="col-sm-6 p-md-0">
                <div className="welcome-text">
                    <h4>Total Item Summary</h4>
                    <p className="mb-0">Overview of items and components statistics</p>
                </div>
            </div>
        </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading summary data...</p>
        </div>
      ) : (
        <div className="row">
          {/* Total Items Card */}
          <div className="col-xl-3 col-xxl-3 col-lg-6 col-sm-6">
            <div className="widget-stat card bg-primary shadow-sm h-100 hover-card" style={{ cursor: 'pointer' }} onClick={handleTotalItemsClick}>
              <div className="card-body p-4">
                <div className="media">
                  <span className="me-3">
                    <i className="la la-cubes"></i>
                  </span>
                  <div className="media-body text-white">
                    <p className="mb-1">Total Items</p>
                    <h3 className="text-white">{summary.TotalItems || 0}</h3>
                    <div className="progress mb-2 bg-secondary">
                      <div className="progress-bar progress-animated bg-white" style={{ width: "100%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actual Components Card */}
          <div className="col-xl-3 col-xxl-3 col-lg-6 col-sm-6">
            <div className="widget-stat card bg-info shadow-sm h-100 hover-card" style={{ cursor: 'pointer' }} onClick={handleActualComponentsClick}>
              <div className="card-body p-4">
                <div className="media">
                  <span className="me-3">
                    <i className="la la-tools"></i>
                  </span>
                  <div className="media-body text-white">
                    <p className="mb-1">Actual Components</p>
                    <h3 className="text-white">{summary.TotalActualComponents || 0}</h3>
                    <div className="progress mb-2 bg-secondary">
                      <div className="progress-bar progress-animated bg-white" style={{ width: "80%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Card */}
          <div className="col-xl-3 col-xxl-3 col-lg-6 col-sm-6">
            <div className="widget-stat card bg-success shadow-sm h-100 hover-card" style={{ cursor: 'pointer' }} onClick={() => handleStatusComponentClick(true)}>
              <div className="card-body p-4">
                <div className="media">
                  <span className="me-3">
                    <i className="la la-check-circle"></i>
                  </span>
                  <div className="media-body text-white">
                    <p className="mb-1">Active Components</p>
                    <h3 className="text-white">{summary.TotalActiveComponents || 0}</h3>
                    <div className="progress mb-2 bg-secondary">
                      <div className="progress-bar progress-animated bg-white" style={{ width: (summary.TotalActiveComponents / summary.TotalActualComponents * 100).toFixed(0) + "%" }}></div>
                    </div>
                    <small>{((summary.TotalActiveComponents / summary.TotalActualComponents) * 100).toFixed(1)}% Active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inactive Card */}
          <div className="col-xl-3 col-xxl-3 col-lg-6 col-sm-6">
            <div className="widget-stat card bg-danger shadow-sm h-100 hover-card" style={{ cursor: 'pointer' }} onClick={() => handleStatusComponentClick(false)}>
              <div className="card-body p-4">
                <div className="media">
                  <span className="me-3">
                    <i className="la la-times-circle"></i>
                  </span>
                  <div className="media-body text-white">
                    <p className="mb-1">Inactive Components</p>
                    <h3 className="text-white">{summary.TotalInactiveComponents || 0}</h3>
                    <div className="progress mb-2 bg-secondary">
                      <div className="progress-bar progress-animated bg-white" style={{ width: (summary.TotalInactiveComponents / summary.TotalActualComponents * 100).toFixed(0) + "%" }}></div>
                    </div>
                    <small>{((summary.TotalInactiveComponents / summary.TotalActualComponents) * 100).toFixed(1)}% Inactive</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Stats Row - Components and Items */}
          <div className="col-xl-6 col-xxl-6 col-lg-12">
            <div className="card">
                <div className="card-header border-0 pb-0">
                    <h4 className="card-title">Photography Status of Components</h4>
                </div>
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-sm-6">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 rounded bg-success-light me-3">
                                    <i className="la la-image text-success fs-24"></i>
                                </div>
                                <div className="media-body">
                                    <p className="mb-1">Components With Photo</p>
                                    <h4 className="mb-0">{summary.TotalComponentsWithPhoto || 0}</h4>
                                </div>
                            </div>
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 rounded bg-warning-light me-3">
                                    <i className="la la-camera text-warning fs-24"></i>
                                </div>
                                <div className="media-body">
                                    <p className="mb-1">Photo Pending Components</p>
                                    <h4 className="mb-0">{summary.TotalComponentPhotoPending || summary.TotalPhotoPendingComponents || 0}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6 text-center">
                            <div className="display-4 font-w600 text-black mb-2">
                                {summary.TotalActualComponents > 0 ? ((summary.TotalComponentsWithPhoto / summary.TotalActualComponents) * 100).toFixed(1) : 0}%
                            </div>
                            <span className="fs-14">Components Coverage</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="col-xl-6 col-xxl-6 col-lg-12">
            <div className="card">
                <div className="card-header border-0 pb-0">
                    <h4 className="card-title">Photography Status of Items</h4>
                </div>
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-sm-6">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 rounded bg-info-light me-3">
                                    <i className="la la-file-image text-info fs-24"></i>
                                </div>
                                <div className="media-body">
                                    <p className="mb-1">Items With Photo</p>
                                    <h4 className="mb-0">{summary.ItemsWithPhoto || 0}</h4>
                                </div>
                            </div>
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-3 rounded bg-danger-light me-3">
                                    <i className="la la-camera-retro text-danger fs-24"></i>
                                </div>
                                <div className="media-body">
                                    <p className="mb-1">Photo Pending Items</p>
                                    <h4 className="mb-0">{summary.ItemsPhotoPending || 0}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6 text-center">
                            <div className="display-4 font-w600 text-black mb-2">
                                {summary.TotalItems > 0 ? ((summary.ItemsWithPhoto / summary.TotalItems) * 100).toFixed(1) : 0}%
                            </div>
                            <span className="fs-14">Items Coverage</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Short/Excess Card */}
          <div className="col-xl-6 col-xxl-6 col-lg-12">
            <div className="card">
                <div className="card-header border-0 pb-0">
                    <h4 className="card-title">Inventory Audit</h4>
                </div>
                <div className="card-body">
                    <div className={`widget-stat card ${summary.TotalShortOrExcessComponents < 0 ? 'bg-warning' : 'bg-primary'} mb-0`}>
                        <div className="card-body p-4">
                            <div className="media">
                                <span className="me-3">
                                    <i className={`la ${summary.TotalShortOrExcessComponents < 0 ? 'la-exclamation-triangle' : 'la-check-circle'}`}></i>
                                </span>
                                <div className="media-body text-white text-end">
                                    <p className="mb-1">Short / Excess Components</p>
                                    <h3 className="text-white">{summary.TotalShortOrExcessComponents || 0}</h3>
                                    <p className="mb-0">
                                        {summary.TotalShortOrExcessComponents < 0 
                                            ? "Discrepancy detected in component count" 
                                            : "Component counts are balanced"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Item/Component List Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); setViewMode('items'); setSelectedItem(null); setStatusFilter(null); }} fullscreen={true} scrollable>
        <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title className="text-white">
                {viewMode === 'items' ? 'Detailed Item List' : 
                 selectedItem ? `Components for: ${selectedItem?.ItemCode}` : 
                 statusFilter === true ? 'Active Components' :
                 statusFilter === false ? 'Inactive Components' :
                 'All Actual Components'}
            </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
            {viewMode === 'items' && (
                <div className="p-3 border-bottom sticky-top bg-white">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <h5 className="mb-0">Total Items ({filteredItems.length})</h5>
                        </div>
                        <div className="col-md-6">
                            <FormControl
                                type="search"
                                placeholder="Search Items..."
                                className="form-control-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'items' ? (
                modalLoading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Fetching items details...</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="mb-0 table-borderless table-striped cursor-pointer">
                            <thead className="bg-light">
                                <tr>
                                    <th>#</th>
                                    <th>Item Code</th>
                                    <th>Name</th>
                                    <th className="text-center">Components Count</th>
                                    <th className="text-center">Photo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item, index) => (
                                        <tr key={index} onClick={() => handleItemRowClick(item)} style={{ cursor: 'pointer' }}>
                                            <td>{index + 1}</td>
                                            <td><strong>{item.ItemCode}</strong></td>
                                            <td>{item.Name}</td>
                                            <td className="text-center">
                                                <span className="badge badge-info light badge-sm">
                                                    {item.NoOfComponents || 0} Components
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                {item.ItemPhoto ? (
                                                    <i className="la la-check-circle text-success fs-20"></i>
                                                ) : (
                                                    <i className="la la-times-circle text-danger fs-20"></i>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-4">No items found matching your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                )
            ) : (
                <div className="p-0">
                    <PageList_ComponentMaster 
                        filterItemCode={selectedItem?.ItemCode} 
                        filterIsActive={statusFilter} 
                        isModalView={true}
                    />
                </div>
            )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
            {viewMode === 'components' && selectedItem && (
                <Button variant="outline-primary" className="me-auto" onClick={handleBackToItems}>
                    <i className="la la-arrow-left"></i> Back to Items
                </Button>
            )}
            <Button variant="secondary" onClick={() => { setShowModal(false); setViewMode('items'); setSelectedItem(null); setStatusFilter(null); }}>
                Close
            </Button>
        </Modal.Footer>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-card {
            transition: all 0.3s ease;
        }
        .hover-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.15) !important;
        }
        .bg-light {
            background-color: #f8f9fa !important;
        }
      `}} />
    </div>
  )
}

export default TotalItemSummary