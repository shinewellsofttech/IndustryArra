import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Button, Table, Card, Badge, FormControl, Form, Spinner } from 'react-bootstrap';
import { useTable, useGlobalFilter, usePagination, useSortBy } from 'react-table';
import { GlobalFilter } from '../components/table/FilteringTable/GlobalFilter';
import '../components/table/FilteringTable/filtering.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import XLSX from 'xlsx';
import { Fn_FillListData, Fn_GetReport } from '../../store/Functions';
import { API_WEB_URLS } from '../../constants/constAPI';
import { useDispatch } from 'react-redux';

// Helper function to format numbers - remove .00 if no decimal value
const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return '0';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0';
    const formatted = numValue.toFixed(decimals);
    // Remove trailing zeros after decimal point
    return formatted.replace(/\.?0+$/, '');
};

function WoodComponentReport() {
    const dispatch = useDispatch();
    const [State, setState] = useState({
        id: 0,
        ContainerData: [],
        formData: {},
        OtherDataScore: [],
        isProgress: true,
    });
    const [gridData, setGridData] = useState([]);
    const [selectedContainer, setSelectedContainer] = useState('');
    const [loading, setLoading] = useState(false);
    const [editableData, setEditableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [commonBuffer, setCommonBuffer] = useState(0);

    useEffect(() => {
        const fetchContainerData = async () => {
            try {
                await Fn_FillListData(dispatch, setState, "ContainerData", `${API_WEB_URLS.MASTER}/0/token/ContainerMaster/Id/0`);
            } catch (error) {
                console.error("Error fetching container data:", error);
            }
        };
        fetchContainerData();
    }, [dispatch]);

    // Initialize editable data when gridData changes
    useEffect(() => {
        if (gridData.length > 0) {
            // Start with original gridData values
            setEditableData([...gridData]);
        } else {
            setEditableData([]);
        }
    }, [gridData]);

    // Handle buffer percentage change - memoized with useCallback
    const handleBufferChange = useCallback((index, newBuffer) => {
        const bufferValue = parseFloat(newBuffer) || 0;
        console.log('Buffer change:', { index, newBuffer, bufferValue });
        
        setEditableData(prevData => {
            // Safety check to ensure we have valid data
            if (!prevData || index >= prevData.length || !prevData[index]) {
                console.error('Invalid data or index for buffer change');
                return prevData;
            }
            
            const currentItem = prevData[index];
            const totalCft = currentItem.TotalCft || 0; // Default to 0 if TotalCft is undefined
            
            const updatedData = [...prevData];
            updatedData[index] = {
                ...currentItem,
                Buffer: bufferValue,
                TotalCftWithBuffer: totalCft * (1 + bufferValue / 100)
            };
            return updatedData;
        });
    }, []);

    // Handle common buffer change and apply to all rows
    const handleCommonBufferChange = useCallback((value) => {
        setCommonBuffer(value);
        const bufferValue = parseFloat(value) || 0;
        
        setEditableData(prevData => {
            return prevData.map(item => {
                const totalCft = item.TotalCft || 0;
                return {
                    ...item,
                    Buffer: bufferValue,
                    TotalCftWithBuffer: totalCft * (1 + bufferValue / 100)
                };
            });
        });
    }, []);

    // Initialize columns only once
    useEffect(() => {
        const initialColumns = [
            {
                Header: 'WOOD SIZES',
                columns: [
                    {
                        Header: 'L (in)',
                        accessor: 'Length',
                        sortType: 'basic',
                        Cell: ({ value }) => formatNumber(value)
                    },
                    {
                        Header: 'Thk (in)',
                        accessor: 'Thk',
                        sortType: 'basic',
                        Cell: ({ value }) => formatNumber(value)
                    }
                ]
            },
            {
                Header: 'ACTUALLY REQUIRED',
                columns: [
                    {
                        Header: 'Cft',
                        accessor: 'TotalCft',
                        sortType: 'basic',
                        Cell: ({ value }) => `${formatNumber(value)} Cft`
                    }
                ]
            },
            {
                Header: 'BUFFER',
                columns: [
                    {
                        Header: '%',
                        accessor: 'Buffer',
                        Cell: ({ value, row }) => {
                            return (
                                <FormControl
                                    type="number"
                                    value={value || 0}
                                    onChange={(e) => handleBufferChange(row.index, e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    size="sm"
                                    style={{ width: '80px' }}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                            );
                        }
                    }
                ]
            },
            {
                Header: 'Total cft with buffer',
                columns: [
                    {
                        Header: 'Cft',
                        accessor: 'TotalCftWithBuffer',
                        sortType: 'basic',
                        Cell: ({ value }) => `${formatNumber(value)} Cft`
                    }
                ]
            }
        ];
        setColumns(initialColumns);
    }, [handleBufferChange]);

    const handleContainerChange = async (e) => {
        const value = e.target.value;
        setSelectedContainer(value);
        
        if (value) {
            setLoading(true);
            let vformData = new FormData();
            vformData.append("F_ContainerMaster", value);
        
            try {
                await Fn_GetReport(
                    dispatch,
                    setGridData,
                    "tenderData",
                    "WoodComponentReport/0/token",
                    { arguList: { id: 0, formData: vformData } },
                    true
                );
            } catch (error) {
                console.error("Error fetching data:", error);
                setGridData([]);
            } finally {
                setLoading(false);
            }
        } else {
            setGridData([]);
        }
    }


    const data = editableData;

    const tableInstance = useTable(
        {
            columns,
            data,
            initialState: { pageIndex: 0, pageSize: 20 }
        },
        useGlobalFilter,
        useSortBy,
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

    // Calculate totals
    const totalActuallyRequired = editableData.reduce((sum, item) => {
        return sum + (item.TotalCft || 0);
    }, 0);
    const totalWithBuffer = editableData.reduce((sum, item) => {
        const totalCft = item.TotalCft || 0;
        const buffer = item.Buffer !== undefined ? item.Buffer : 0;
        return sum + (totalCft * (1 + buffer / 100));
    }, 0);
    
    const totals = {
        totalActuallyRequired: formatNumber(totalActuallyRequired),
        totalWithBuffer: formatNumber(totalWithBuffer)
    };

    // Export to PDF
    const exportToPDF = async () => {
        // Create a temporary table with all data for PDF export
        const tempTableId = 'temp-pdf-table';
        const existingTempTable = document.getElementById(tempTableId);
        if (existingTempTable) {
            existingTempTable.remove();
        }

        // Create temporary table element with better styling
        const tempTable = document.createElement('div');
        tempTable.id = tempTableId;
        tempTable.style.position = 'absolute';
        tempTable.style.left = '-9999px';
        tempTable.style.top = '-9999px';
        tempTable.style.width = '1200px';
        tempTable.style.backgroundColor = '#ffffff';
        tempTable.style.fontFamily = 'Arial, sans-serif';
        tempTable.style.fontSize = '12px';
        
        tempTable.innerHTML = `
            <style>
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                }
                .pdf-table th {
                    background-color: #343a40;
                    color: white;
                    padding: 8px 12px;
                    text-align: center;
                    font-weight: bold;
                    border: 1px solid #000;
                }
                .pdf-table td {
                    padding: 6px 12px;
                    text-align: center;
                    border: 1px solid #000;
                    background-color: #ffffff;
                }
                .pdf-table tr:nth-child(even) td {
                    background-color: #f8f9fa;
                }
                .pdf-table tfoot th {
                    background-color: #d1ecf1;
                    color: #000;
                    font-weight: bold;
                    text-align: right;
                }
                .pdf-header {
                    text-align: center;
                    margin-bottom: 20px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #000;
                }
                .pdf-container {
                    padding: 20px;
                    background-color: #ffffff;
                }
            </style>
            <div class="pdf-container">
                <div class="pdf-header">CONTAINER WOOD REQUIREMENT SUMMARY</div>
                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th style="width: 20%;">WOOD SIZES</th>
                            <th style="width: 20%;"></th>
                            <th style="width: 20%;">ACTUALLY REQUIRED</th>
                            <th style="width: 20%;">BUFFER</th>
                            <th style="width: 20%;">TOTAL WITH BUFFER</th>
                        </tr>
                        <tr>
                            <th>L (in)</th>
                            <th>Thk (in)</th>
                            <th>Cft</th>
                            <th>%</th>
                            <th>Cft</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${editableData.map(item => `
                            <tr>
                                <td>${formatNumber(item.Length)}</td>
                                <td>${formatNumber(item.Thk)}</td>
                                <td>${formatNumber(item.TotalCft)}</td>
                                <td>${formatNumber(item.Buffer, 1)}</td>
                                <td>${formatNumber(item.TotalCftWithBuffer)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="2" style="text-align: right;">TOTAL:</th>
                            <th>${totals.totalActuallyRequired}</th>
                            <th></th>
                            <th>${totals.totalWithBuffer}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        document.body.appendChild(tempTable);
        
        // Wait a bit for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(tempTable, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 1200,
            height: tempTable.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Clean up temporary element
        tempTable.remove();
        
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgWidth = 297;
        const pageHeight = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('wood-component-report.pdf');
    };

    // Export to Excel
    const exportToExcel = () => {
        // Prepare data with totals - use all data, not just current page
        const exportData = [...editableData];
        
        // Add empty row for spacing
        exportData.push({
            Length: '',
            Thk: '',
            TotalCft: '',
            Buffer: '',
            TotalCftWithBuffer: ''
        });
        
        // Add totals row
        exportData.push({
            Length: 'TOTAL:',
            Thk: '',
            TotalCft: totals.totalActuallyRequired,
            Buffer: '',
            TotalCftWithBuffer: totals.totalWithBuffer
        });
        
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Style the totals row (last row)
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const totalsRowIndex = exportData.length - 1; // Last row index
        
        // Style the totals row
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
            if (!worksheet[cellAddress]) {
                worksheet[cellAddress] = { v: '', t: 's' };
            }
            worksheet[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "E6F3FF" } }
            };
        }
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Wood Requirement Summary');
        XLSX.writeFile(workbook, 'wood-component-report.xlsx');
    };
  
  return (
        <div className="container-fluid">
            <Row>
                <Col>
                    <Card>
                        <Card.Header>
                            <Row className="align-items-center mb-2">
                                <Col md={3}>
                                    <h4 className="card-title mb-0" style={{ fontFamily: 'Arial, sans-serif', fontWeight: '600', fontSize: '1.5rem' }}>CONTAINER WOOD REQUIREMENT SUMMARY</h4>
                                </Col>
                                <Col md={3}>
                                    <Form.Select 
                                        value={selectedContainer} 
                                        onChange={handleContainerChange}
                                        placeholder="Select Container"
                                        size="sm"
                                        style={{ color: '#000000', fontFamily: 'Arial, sans-serif' }}
                                    >
                                        <option value="" style={{ color: '#000000' }}>Select Container</option>
                                        {State.ContainerData.map((container) => (
                                            <option key={container.Id} value={container.Id} style={{ color: '#000000' }}>
                                                {container.Name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={6} className="text-end">
                                    <Button variant="success" size="sm" className="me-2" onClick={exportToExcel}>
                                        <i className="fa fa-file-excel-o me-1"></i> Excel
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={exportToPDF}>
                                        <i className="fa fa-file-pdf-o me-1"></i> PDF
                                    </Button>
                                </Col>
                            </Row>
                            <Row className="align-items-center mt-2">
                                <Col md={3}>
                                    <Form.Label className="mb-0 me-2" style={{ fontWeight: '500', fontSize: '0.95rem' }}>
                                        Common Buffer for All Rows:
                                    </Form.Label>
                                </Col>
                                <Col md={2}>
                                    <div className="d-flex align-items-center">
                                        <FormControl
                                            type="number"
                                            value={commonBuffer}
                                            onChange={(e) => handleCommonBufferChange(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="Enter %"
                                            size="sm"
                                            style={{ width: '100px' }}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            disabled={editableData.length === 0}
                                        />
                                        <span className="ms-1">%</span>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body>
                            
                            {loading ? (
                                <div className="text-center py-4">
                                    <Spinner animation="border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </Spinner>
                                    <p className="mt-2">Loading wood component data...</p>
                                </div>
                            ) : (
                                <div className="table-responsive" id="wood-report-table">
                                    <Table {...getTableProps()} className="table table-striped table-bordered">
                                        <thead className="table-dark">
                                            {headerGroups.map(headerGroup => (
                                                <tr {...headerGroup.getHeaderGroupProps()}>
                                                    {headerGroup.headers.map(column => (
                                                        <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                                                            <div className="d-flex align-items-center">
                                                                {column.render('Header')}
                                                                <span className="ms-1">
                                                                    {column.isSorted ? (
                                                                        column.isSortedDesc ? ' ↓' : ' ↑'
                                                                    ) : ' ↕'}
                                                                </span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody {...getTableBodyProps()}>
                                            {page.length > 0 ? (
                                                page.map((row) => {
                                                    prepareRow(row);
                                                    return (
                                                        <tr {...row.getRowProps()}>
                                                            {row.cells.map((cell) => (
                                                                <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-4">
                                                        {selectedContainer ? 'No data found for selected container' : 'Please select a container to view data'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {editableData.length > 0 && (
                                            <tfoot className="table-info">
                                                <tr>
                                                    <th colSpan="2" className="text-end">Total:</th>
                                                    <th>{totals.totalActuallyRequired} Cft</th>
                                                    <th></th>
                                                    <th>{totals.totalWithBuffer} Cft</th>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </Table>
                                </div>
                            )}

                            {/* Pagination */}
                            {editableData.length > 0 && (
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <div>
                                        <span className="me-2">
                                            Page{' '}
                                            <strong>
                                                {pageIndex + 1} of {pageOptions.length}
                                            </strong>{' '}
                                        </span>
                                        <span className="me-2">
                                            | Go to page:{' '}
                                            <FormControl
                                                type="number"
                                                defaultValue={pageIndex + 1}
                                                onChange={e => {
                                                    const page = e.target.value ? Number(e.target.value) - 1 : 0;
                                                    gotoPage(page);
                                                }}
                                                style={{ width: '100px', display: 'inline-block' }}
                                            />
                                        </span>
                                    </div>
                                    <div>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => gotoPage(0)}
                                            disabled={!canPreviousPage}
                                        >
                                            {'<<'}
                                        </Button>{' '}
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => previousPage()}
                                            disabled={!canPreviousPage}
                                        >
                                            {'<'}
                                        </Button>{' '}
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => nextPage()}
                                            disabled={!canNextPage}
                                        >
                                            {'>'}
                                        </Button>{' '}
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => gotoPage(pageCount - 1)}
                                            disabled={!canNextPage}
                                        >
                                            {'>>'}
                                        </Button>{' '}
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default WoodComponentReport