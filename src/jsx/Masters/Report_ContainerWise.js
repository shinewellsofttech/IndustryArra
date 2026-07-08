import React, { useEffect, useState, useMemo, memo } from 'react';
import PageTitle from "../layouts/PageTitle";
import { Row, Col, Button, FormControl, Spinner, Badge, Card, Modal, Pagination, Table, ButtonGroup } from "react-bootstrap";
import { useDispatch } from 'react-redux';
import { Fn_GetReport } from '../../store/Functions';
import { API_WEB_URLS } from '../../constants/constAPI';
import { HubConnectionBuilder } from '@microsoft/signalr';
import ReactFlow, { MiniMap, Controls, Background, MarkerType, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

// Helper to sort nodes by InspectionDate (with fallback to Id)
const sortByHistory = (a, b, descending = false) => {
  const dateA = a.InspectionDate ? new Date(a.InspectionDate).getTime() : 0;
  const dateB = b.InspectionDate ? new Date(b.InspectionDate).getTime() : 0;
  
  if (dateA !== dateB) {
    return descending ? dateB - dateA : dateA - dateB;
  }
  return descending ? b.Id - a.Id : a.Id - b.Id;
};

// ReactFlow Custom Node Component
const FlowCustomNode = memo(({ data }) => {
  const { node, isHighlighted } = data;
  
  return (
    <div className={`rf-node-card shadow-sm ${node.IsActive ? 'node-active' : 'node-inactive'} ${node.IsTikamoon ? 'node-tikamoon' : ''} ${isHighlighted ? 'node-highlighted' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#cbd5e0', width: '8px', height: '8px' }}
      />
      
      <div className="d-flex justify-content-between align-items-center mb-1 text-muted" style={{ fontSize: '9px', fontWeight: '600' }}>
        <span>ID: #{node.Id}</span>
        <Badge bg={node.IsActive ? "success" : "secondary"} style={{ fontSize: '8px', padding: '2px 4px' }}>
          {node.IsActive ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      <h6 className="mb-1 text-dark" style={{ fontSize: '13px', fontWeight: '700' }}>
        {node.ContainerNumber}
      </h6>
      
      <div className="node-details-grid" style={{ fontSize: '10px', color: '#4a5568' }}>
        <div className="d-flex justify-content-between border-bottom border-light py-1">
          <span>Qty:</span>
          <strong>{node.Quantity}</strong>
        </div>
        <div className="d-flex justify-content-between border-bottom border-light py-1 text-truncate">
          <span>Item:</span>
          <strong title={node.ItemName}>{node.ItemCode}</strong>
        </div>
        {node.ContractNo && (
          <div className="d-flex justify-content-between py-1">
            <span>Contract:</span>
            <strong className="text-primary">{node.ContractNo}</strong>
          </div>
        )}
      </div>

      <div className="d-flex flex-wrap gap-1 mt-1">
        {node.IsTikamoon && (
          <span className="badge bg-info text-white" style={{ fontSize: '8px', padding: '2px 4px' }}>Tikamoon</span>
        )}
        {(!node.ContractNo || node.ContractNo.toLowerCase().includes('sample') || node.ItemName.toLowerCase().includes('sample')) && (
          <span className="badge bg-warning text-dark" style={{ fontSize: '8px', padding: '2px 4px' }}>Sample</span>
        )}
      </div>

      {node.MergeParentId && (
        <div className="mt-1 text-muted" style={{ fontSize: '8px' }}>
          🔗 Merged from #{node.MergeParentId}
        </div>
      )}

      {isHighlighted && (
        <div className="highlighted-tag text-center mt-1">
          🎯 Active Container
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#cbd5e0', width: '8px', height: '8px' }}
      />
    </div>
  );
});

// Register Custom Node Type
const nodeTypes = {
  customNode: FlowCustomNode
};

export const Report_ContainerWise = () => {
  const [searchVal, setSearchVal] = useState('');
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter types: 'all', 'chain', 'no-chain'
  const [filterType, setFilterType] = useState('all');

  // Fullscreen flow modal states
  const [selectedRoots, setSelectedRoots] = useState([]);
  const [highlightNodeIds, setHighlightNodeIds] = useState([]);
  const [selectedContractName, setSelectedContractName] = useState('');
  const [showFlowModal, setShowFlowModal] = useState(false);

  // Node details panel state inside the flowchart modal
  const [selectedNode, setSelectedNode] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const dispatch = useDispatch();
  const API_URL_SAVE = "GetContainerLineage/0/token";

  // Fetch all lineage records on component mount
  useEffect(() => {
    fetchAllData();
  }, [dispatch]);

  // Establish SignalR connection for real-time updates
  useEffect(() => {
    let connection = null;

    const startSignalR = async () => {
      try {
        const hubUrl = API_WEB_URLS.BASE.replace("/api/V1/", "/qrScannerHub").replace("/api/v1/", "/qrScannerHub");
        console.log("🔌 Container Trace Report connecting to SignalR Hub at:", hubUrl);

        connection = new HubConnectionBuilder()
          .withUrl(hubUrl)
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveUpdate", (updatedJobCardId) => {
          console.log("⚡ SignalR Update Received. Refreshing container trace data...");
          fetchAllData();
        });

        await connection.start();
        console.log("✅ Container Trace Report SignalR Connected Successfully!");
      } catch (err) {
        console.warn("❌ Container Trace Report SignalR Connection Failed:", err);
      }
    };

    startSignalR();

    return () => {
      if (connection) {
        connection.stop().catch(err => console.warn("Error stopping SignalR connection:", err));
      }
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      let vformData = new FormData();
      vformData.append("SearchVal", ""); // Empty fetches all

      await Fn_GetReport(
        dispatch,
        setGridData,
        "tenderData",
        API_URL_SAVE,
        { arguList: { id: 0, formData: vformData } },
        true
      );
    } catch (error) {
      console.error("Error fetching lineage data:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchVal(e.target.value);
    setCurrentPage(1); // Reset to page 1 on search
  };

  // Traces upward from a node to find the oldest ancestor (root)
  const findAbsoluteRoot = (node, allNodes) => {
    let current = node;
    const visited = new Set();
    while (current && current.SplitParentId && !visited.has(current.Id)) {
      visited.add(current.Id);
      const parent = allNodes.find(n => n.Id === current.SplitParentId);
      if (!parent) break;
      current = parent;
    }
    return current;
  };

  const handleOpenFlowchart = (group) => {
    // Resolve absolute roots of all active containers in the selected contract
    const roots = [];
    group.Containers.forEach(c => {
      const root = findAbsoluteRoot(c, gridData);
      if (root && !roots.some(r => r.Id === root.Id)) {
        roots.push(root);
      }
    });

    setSelectedContractName(group.ContractNo);
    setSelectedRoots(roots);
    setHighlightNodeIds(group.Containers.map(c => c.Id)); // Highlight all active containers of this contract
    setSelectedNode(group.Containers[0] || null); // Default details panel to first container
    setShowFlowModal(true);
  };

  const handleNodeClick = (event, rfNode) => {
    setSelectedNode(rfNode.data.node);
  };

  // Helper to determine if a container node has any split/merge relationships (chain)
  const hasLineageChain = (node, allNodes) => {
    if (node.SplitParentId) return true;
    if (node.MergeParentId) return true;
    
    const children = allNodes.filter(n => n.SplitParentId === node.Id);
    if (children.length > 0) return true;

    const mergedChild = allNodes.find(n => n.MergeParentId === node.Id);
    if (mergedChild) return true;

    return false;
  };

  // Show only ACTIVE containers
  const activeNodes = useMemo(() => {
    return gridData
      .filter(node => node.IsActive === 1)
      .sort((a, b) => sortByHistory(a, b, true));
  }, [gridData]);

  // Group active containers by ContractNo (Contract-wise grouping)
  const contractGroups = useMemo(() => {
    const groups = {};
    activeNodes.forEach(node => {
      const contract = node.ContractNo || 'N/A';
      if (!groups[contract]) {
        groups[contract] = {
          ContractNo: contract,
          InspectionDate: node.InspectionDate,
          Containers: [],
          TotalQuantity: 0,
          Items: new Set()
        };
      }
      groups[contract].Containers.push(node);
      groups[contract].TotalQuantity += node.Quantity;
      if (node.ItemCode) {
        groups[contract].Items.add(node.ItemCode);
      }
      
      // Keep the latest inspection date for the group
      if (node.InspectionDate && (!groups[contract].InspectionDate || new Date(node.InspectionDate) > new Date(groups[contract].InspectionDate))) {
        groups[contract].InspectionDate = node.InspectionDate;
      }
    });

    return Object.values(groups).sort((a, b) => {
      const dateA = a.InspectionDate ? new Date(a.InspectionDate).getTime() : 0;
      const dateB = b.InspectionDate ? new Date(b.InspectionDate).getTime() : 0;
      return dateB - dateA; // Show latest contract first
    });
  }, [activeNodes]);

  // Filter grouped contracts by search query and chain type
  const filteredContractGroups = useMemo(() => {
    return contractGroups.filter(group => {
      // Search filter
      const lowercaseQuery = searchVal.toLowerCase().trim();
      const matchesSearch = !lowercaseQuery || 
        group.ContractNo.toLowerCase().includes(lowercaseQuery) ||
        Array.from(group.Items).some(item => item.toLowerCase().includes(lowercaseQuery)) ||
        group.Containers.some(c => c.ContainerNumber.toLowerCase().includes(lowercaseQuery));

      if (!matchesSearch) return false;

      // Chain filter (does any active container in this contract have splits/merges?)
      const isChained = group.Containers.some(c => hasLineageChain(c, gridData));
      if (filterType === 'chain') return isChained;
      if (filterType === 'no-chain') return !isChained;
      return true; // 'all'
    });
  }, [contractGroups, gridData, searchVal, filterType]);

  // Paginated grouped contracts for the table
  const totalPages = Math.ceil(filteredContractGroups.length / pageSize);
  const paginatedGroups = useMemo(() => {
    return filteredContractGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredContractGroups, currentPage, pageSize]);

  // Generate React Flow Nodes and Edges for the selected contract roots
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!selectedRoots || selectedRoots.length === 0) return { flowNodes: [], flowEdges: [] };

    // Get all descendant nodes for selected roots
    const chainNodes = [];
    const collectChain = (node) => {
      if (chainNodes.some(n => n.Id === node.Id)) return;
      chainNodes.push(node);
      const children = gridData.filter(n => n.SplitParentId === node.Id);
      children.forEach(collectChain);
    };
    selectedRoots.forEach(root => collectChain(root));

    // Also include merge parent nodes if they exist in gridData
    chainNodes.forEach(node => {
      if (node.MergeParentId && !chainNodes.some(n => n.Id === node.MergeParentId)) {
        const mergeParent = gridData.find(n => n.Id === node.MergeParentId);
        if (mergeParent) {
          chainNodes.push(mergeParent);
        }
      }
    });

    const reactNodes = [];
    const reactEdges = [];

    // Compute column indexes (X coordinates)
    const nodeColMap = {};
    const computeCol = (node, col) => {
      nodeColMap[node.Id] = Math.max(nodeColMap[node.Id] || 0, col);
      const children = gridData.filter(n => n.SplitParentId === node.Id);
      children.forEach(child => computeCol(child, col + 1));
    };
    selectedRoots.forEach(root => computeCol(root, 0));

    // Map column position for merged parent nodes
    chainNodes.forEach(node => {
      if (nodeColMap[node.Id] === undefined) {
        const childNode = chainNodes.find(n => n.MergeParentId === node.Id);
        const childCol = childNode ? nodeColMap[childNode.Id] || 1 : 1;
        nodeColMap[node.Id] = Math.max(0, childCol - 1);
      }
    });

    // Layout Y coordinates using unique vertical spacing for leaf nodes,
    // and centering parent nodes exactly between their children.
    const nodeYMap = {};
    let leafCount = 0;

    const layoutNodeY = (node) => {
      const children = gridData
        .filter(n => n.SplitParentId === node.Id)
        .sort((a, b) => sortByHistory(a, b, false));

      if (children.length === 0) {
        nodeYMap[node.Id] = leafCount * 180 + 50;
        leafCount++;
        return nodeYMap[node.Id];
      }

      const childYs = children.map(child => layoutNodeY(child));
      const parentY = childYs.reduce((a, b) => a + b, 0) / childYs.length;
      nodeYMap[node.Id] = parentY;
      return parentY;
    };

    selectedRoots.forEach(root => layoutNodeY(root));

    // For any remaining merge parent nodes, assign Y coordinates at the bottom
    chainNodes.forEach(node => {
      if (nodeYMap[node.Id] === undefined) {
        nodeYMap[node.Id] = leafCount * 180 + 50;
        leafCount++;
      }
    });

    // Map to React Flow Nodes
    chainNodes.forEach(node => {
      const col = nodeColMap[node.Id] || 0;
      const y = nodeYMap[node.Id] || 50;
      const x = col * 320 + 50;

      reactNodes.push({
        id: String(node.Id),
        type: 'customNode',
        data: { 
          node, 
          isHighlighted: highlightNodeIds && highlightNodeIds.includes(node.Id) 
        },
        position: { x, y }
      });

      // Add split edge
      if (node.SplitParentId) {
        reactEdges.push({
          id: `split-${node.SplitParentId}-${node.Id}`,
          source: String(node.SplitParentId),
          target: String(node.Id),
          animated: true,
          label: 'Split',
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#4a5568' },
          style: { stroke: '#4a5568', strokeWidth: 2 }
        });
      }

      // Add merge edge
      if (node.MergeParentId && chainNodes.some(n => n.Id === node.MergeParentId)) {
        reactEdges.push({
          id: `merge-${node.MergeParentId}-${node.Id}`,
          source: String(node.MergeParentId),
          target: String(node.Id),
          animated: true,
          label: 'Merge Join',
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3182ce' },
          style: { stroke: '#3182ce', strokeWidth: 2, strokeDasharray: '5,5' }
        });
      }
    });

    return { flowNodes: reactNodes, flowEdges: reactEdges };
  }, [selectedRoots, gridData, highlightNodeIds]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item 
          key={number} 
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return items;
  };

  return (
    <>
      <PageTitle activeMenu="Container Track Report" motherMenu="Reports" />
      <div className="container-fluid">
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm border-0 bg-light-gradient">
              <Card.Body>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '400px' }}>
                    <i className="fa fa-filter text-primary fs-5"></i>
                    <FormControl
                      type="text"
                      placeholder="Filter by Contract No, Item, or Container..."
                      value={searchVal}
                      onChange={handleSearchChange}
                      className="form-control-custom"
                    />
                  </div>
                  
                  {/* Segmented Filter Buttons */}
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">Show:</span>
                    <ButtonGroup size="sm">
                      <Button 
                        variant={filterType === 'all' ? 'primary' : 'outline-primary'} 
                        onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                      >
                        All
                      </Button>
                      <Button 
                        variant={filterType === 'chain' ? 'primary' : 'outline-primary'} 
                        onClick={() => { setFilterType('chain'); setCurrentPage(1); }}
                      >
                        Chains Only
                      </Button>
                      <Button 
                        variant={filterType === 'no-chain' ? 'primary' : 'outline-primary'} 
                        onClick={() => { setFilterType('no-chain'); setCurrentPage(1); }}
                      >
                        Without Chain
                      </Button>
                    </ButtonGroup>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">Items per page:</span>
                    <select 
                      className="form-select form-select-sm" 
                      style={{ width: '80px' }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <Button variant="outline-primary" onClick={fetchAllData} disabled={loading} size="sm">
                      <i className="fa fa-refresh"></i> Refresh
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={12}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-white">Active Contracts Inventory</h5>
                <Badge bg="info" className="fs-6">
                  {filteredContractGroups.length} Contracts
                </Badge>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Loading contracts...</p>
                  </div>
                ) : paginatedGroups.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped hover className="mb-0 custom-inventory-table align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>Contract No</th>
                          <th>Latest Inspection Date</th>
                          <th>Active Containers Count</th>
                          <th>Items Summary</th>
                          <th>Total Qty</th>
                          <th>Lineage Type</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedGroups.map((group) => {
                          const isChained = group.Containers.some(c => hasLineageChain(c, gridData));
                          return (
                            <tr key={group.ContractNo}>
                              <td className="fw-bold text-primary">{group.ContractNo}</td>
                              <td>
                                {group.InspectionDate 
                                  ? new Date(group.InspectionDate).toLocaleDateString('en-GB') 
                                  : 'N/A'
                                }
                              </td>
                              <td className="fw-bold">{group.Containers.length}</td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: '300px' }} title={Array.from(group.Items).join(', ')}>
                                  {Array.from(group.Items).join(', ') || 'N/A'}
                                </div>
                              </td>
                              <td className="fw-bold">{group.TotalQuantity}</td>
                              <td>
                                <Badge bg={isChained ? "info" : "light"} text={isChained ? "white" : "dark"}>
                                  {isChained ? "⛓ Chain (Splits/Merges)" : "Single Container"}
                                </Badge>
                              </td>
                              <td className="text-center">
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => handleOpenFlowchart(group)}
                                >
                                  <i className="fa fa-sitemap me-1"></i> View Flowchart
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center p-4 bg-light border-top">
                        <div className="text-muted small">
                          Showing { (currentPage - 1) * pageSize + 1 } to { Math.min(currentPage * pageSize, filteredContractGroups.length) } of { filteredContractGroups.length } contracts
                        </div>
                        <Pagination className="mb-0">
                          <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                          <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                          {renderPaginationItems()}
                          <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                          <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                        </Pagination>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-5 text-muted">
                    <i className="fa fa-search fa-3x mb-3 text-light-gray"></i>
                    <h5>No active contracts found matching filters.</h5>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Fullscreen Flowchart Modal */}
      {selectedRoots.length > 0 && (
        <Modal 
          show={showFlowModal} 
          onHide={() => setShowFlowModal(false)} 
          fullscreen={true}
          dialogClassName="fullscreen-flowchart-modal"
        >
          <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title className="text-white d-flex align-items-center gap-2">
              <i className="fa fa-sitemap"></i>
              <span>Container Lineage Map: {selectedContractName}</span>
              <Badge bg="light" text="dark" className="fs-6 ms-2">
                Roots Count: {selectedRoots.length}
              </Badge>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0 d-flex flex-row overflow-hidden bg-light" style={{ height: 'calc(100vh - 58px)' }}>
            
            {/* Left: React Flow Diagram */}
            <div className="flex-grow-1 position-relative" style={{ height: '100%' }}>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                attributionPosition="bottom-right"
              >
                <MiniMap 
                  nodeStrokeColor={(n) => n.data?.node?.IsActive ? '#28a745' : '#6c757d'}
                  nodeColor={(n) => n.data?.node?.IsActive ? '#e6f4ea' : '#f1f3f4'}
                  nodeBorderRadius={8}
                />
                <Controls />
                <Background color="#ccc" gap={16} />
              </ReactFlow>
            </div>

            {/* Right: Node Details Side Panel */}
            <div className="rf-side-details-panel shadow-sm bg-white border-start p-4">
              <h5 className="border-bottom pb-2 mb-3 d-flex align-items-center gap-2 text-primary">
                <i className="fa fa-info-circle"></i> Node Details
              </h5>
              
              {selectedNode ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-sm details-panel-table">
                    <tbody>
                      <tr>
                        <th>Line ID</th>
                        <td className="fw-bold">#{selectedNode.Id}</td>
                      </tr>
                      <tr>
                        <th>Container No</th>
                        <td className="fw-bold">{selectedNode.ContainerNumber}</td>
                      </tr>
                      <tr>
                        <th>Item Code</th>
                        <td>{selectedNode.ItemCode}</td>
                      </tr>
                      <tr>
                        <th>Item Name</th>
                        <td style={{ fontSize: '11px' }}>{selectedNode.ItemName}</td>
                      </tr>
                      <tr>
                        <th>Quantity</th>
                        <td className="fw-bold fs-6">{selectedNode.Quantity}</td>
                      </tr>
                      <tr>
                        <th>Contract No</th>
                        <td className="text-primary fw-bold">{selectedNode.ContractNo || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Active Status</th>
                        <td>
                          <Badge bg={selectedNode.IsActive ? "success" : "secondary"}>
                            {selectedNode.IsActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <th>Is Tikamoon</th>
                        <td>{selectedNode.IsTikamoon ? "Yes" : "No"}</td>
                      </tr>
                      <tr>
                        <th>Inspection Date</th>
                        <td style={{ fontSize: '11px' }}>
                          {selectedNode.InspectionDate 
                            ? new Date(selectedNode.InspectionDate).toLocaleString('en-GB') 
                            : "N/A"
                          }
                        </td>
                      </tr>
                      {selectedNode.ParentIds && (
                        <tr>
                          <th>Split Parent</th>
                          <td>
                            <Badge bg="light" text="dark">ID: #{selectedNode.ParentIds}</Badge>
                          </td>
                        </tr>
                      )}
                      {selectedNode.MergeParentId && (
                        <tr>
                          <th>Merge Parent</th>
                          <td>
                            <Badge bg="info" text="white">ID: #{selectedNode.MergeParentId}</Badge>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  <div className="alert alert-info mt-3 py-2 px-3 small border-0 shadow-none">
                    <i className="fa fa-info-circle me-1"></i>
                    Tip: Click any other card in the diagram to inspect its parameters.
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="fa fa-mouse-pointer fa-2x mb-3 text-light-gray"></i>
                  <p>Click on any node in the flowchart to view its detailed specifications.</p>
                </div>
              )}
            </div>
          </Modal.Body>
        </Modal>
      )}

      <style jsx>{`
        .bg-light-gradient {
          background: linear-gradient(90deg, #f8f9fa 0%, #edf2f7 100%);
        }
        .form-control-custom {
          border-radius: 8px;
          border: 1px solid #cbd5e0;
          padding: 8px 15px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
          transition: border-color 0.2s;
        }
        .form-control-custom:focus {
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
        }

        .custom-inventory-table th {
          font-weight: 600;
          color: #4a5568;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
        }

        .custom-inventory-table td {
          font-size: 13px;
          padding: 12px 16px;
          color: #2d3748;
        }

        /* ReactFlow Side Details Panel */
        .rf-side-details-panel {
          width: 320px;
          flex-shrink: 0;
          height: 100%;
          overflow-y: auto;
          z-index: 10;
        }

        .details-panel-table th {
          font-weight: 600;
          color: #4a5568;
          width: 40%;
          font-size: 12px;
        }
        
        .details-panel-table td {
          font-size: 12px;
        }

        /* ReactFlow Custom Node Styles */
        .rf-node-card {
          width: 200px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #cbd5e0;
          background: #ffffff;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          font-family: inherit;
          text-align: left;
          position: relative;
        }

        .rf-node-card.node-active {
          border-left: 5px solid #28a745;
          background: #f4fbf6;
        }

        .rf-node-card.node-inactive {
          border-left: 5px solid #6c757d;
          background: #f8f9fa;
          opacity: 0.85;
        }

        .rf-node-card.node-tikamoon {
          border-right: 5px solid #17a2b8;
        }

        .rf-node-card.node-highlighted {
          border: 2px solid #ff9800;
          box-shadow: 0 0 10px rgba(255, 152, 0, 0.4);
        }

        .highlighted-tag {
          font-size: 9px;
          color: #ff9800;
          font-weight: bold;
          border-top: 1px dashed #ffe0b2;
          padding-top: 4px;
        }

        .text-light-gray {
          color: #e2e8f0;
        }
      `}</style>
    </>
  );
};

export default Report_ContainerWise;