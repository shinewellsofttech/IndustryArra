import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Spinner, Form, Row, Col, Badge } from 'react-bootstrap';
import { 
    FaDownload, FaUpload, FaFileExcel, 
    FaSave, FaTimes, FaMagic, FaUndo, FaSearch
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_WEB_URLS } from '../../constants/constAPI';

// Helper to safely add integer days to a Date object or YYYY-MM-DD string
const addDays = (dateInput, days) => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + parseInt(days || 0, 10));
    return d.toISOString().split('T')[0];
};

// Helper to calculate difference in calendar days between two dates
const getDayDifference = (dateStr1, dateStr2) => {
    if (!dateStr1 || !dateStr2) return 0;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// Format date to readable DD-MM-YYYY
const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    } catch {
        // fallback
    }
    return String(dateStr).split('T')[0];
};

export const ProductionPlanningModal = ({
    show,
    onHide,
    selectedItems = [],
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [planItems, setPlanItems] = useState([]);
    const [originalItems, setOriginalItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShipmentFilter, setSelectedShipmentFilter] = useState('ALL');

    // Fetch existing planning data from DB for all selected container IDs
    useEffect(() => {
        if (show && selectedItems && selectedItems.length > 0) {
            loadPlanningForSelectedItems();
        } else if (show) {
            setPlanItems([]);
            setOriginalItems([]);
        }
    }, [show, selectedItems]);

    const loadPlanningForSelectedItems = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
            const userId = localStorage.getItem('userId') || '0';

            // Collect unique container IDs
            const containerIds = Array.from(new Set(
                selectedItems.map(i => i.F_ContainerMaster || i.ContainerId).filter(Boolean)
            )).join(',');

            let existingSavedMap = new Map();

            if (containerIds) {
                try {
                    const url = `${API_WEB_URLS.BASE}ShipmentPlanning/GetPlan/0/${userId}/token?containerIds=${containerIds}`;
                    const res = await axios.get(url, {
                        headers: { Authorization: token ? `Bearer ${token}` : '' }
                    });

                    if (res.data && res.data.Success && Array.isArray(res.data.Data)) {
                        res.data.Data.forEach(savedItem => {
                            if (savedItem.ContainerMasterLId) {
                                existingSavedMap.set(String(savedItem.ContainerMasterLId), savedItem);
                            }
                        });
                    }
                } catch (fetchErr) {
                    console.warn('Could not fetch existing saved plans from DB, will initialize from selection:', fetchErr);
                }
            }

            // Merge selected items with existing saved plans
            const merged = selectedItems.map(item => {
                const lineId = String(item.F_ContainerMasterL || item.ContainerMasterLId || item.Id || '');
                const saved = existingSavedMap.get(lineId) || {};

                const initialObj = {
                    ContainerMasterLId: parseInt(lineId, 10) || 0,
                    ContainerId: item.F_ContainerMaster || item.ContainerId || saved.ContainerId || 0,
                    ContainerNumber: item.ContainerNumber || saved.ContainerNumber || 'N/A',
                    ContractNo: item.ContractNo || saved.ContractNo || '',
                    ItemCode: item.ItemCode || saved.ItemCode || '',
                    ItemName: item.ItemName || saved.ItemName || '',
                    Quantity: item.Quantity || saved.Quantity || 0,
                    InspectionDate: item.InspectionDate || saved.InspectionDate || null,
                    WoodIssueDays: saved.WoodIssueDays !== undefined ? saved.WoodIssueDays : 0,
                    PreCuttingDays: saved.PreCuttingDays !== undefined ? saved.PreCuttingDays : 0,
                    OutSourceDays: saved.OutSourceDays !== undefined ? saved.OutSourceDays : 0,
                    MachiningDays: saved.MachiningDays !== undefined ? saved.MachiningDays : 0,
                    AssemblyDays: saved.AssemblyDays !== undefined ? saved.AssemblyDays : 0,
                    SandingDays: saved.SandingDays !== undefined ? saved.SandingDays : 0,
                    PolishDays: saved.PolishDays !== undefined ? saved.PolishDays : 0,
                    FittingDays: saved.FittingDays !== undefined ? saved.FittingDays : 0,
                    QcDays: saved.QcDays !== undefined ? saved.QcDays : 0,
                    FinalQcDays: saved.FinalQcDays !== undefined ? saved.FinalQcDays : 0,
                    PackingDays: saved.PackingDays !== undefined ? saved.PackingDays : 0,
                };

                return calculateRowSchedule(initialObj);
            });

            setPlanItems(merged);
            setOriginalItems(JSON.parse(JSON.stringify(merged)));
        } catch (err) {
            console.error('Error loading planning targets:', err);
            toast.error('Failed to load planning targets: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Core Scheduling Cascade Engine
     * OUT SOURCE JOB is strictly informational and does NOT affect timeline dates.
     */
    const calculateRowSchedule = (item) => {
        const woodDays = parseInt(item.WoodIssueDays, 10) || 0;
        const preCutDays = parseInt(item.PreCuttingDays, 10) || 0;
        const outSourceDays = parseInt(item.OutSourceDays, 10) || 0; // Informational only
        const machDays = parseInt(item.MachiningDays, 10) || 0;
        const assemDays = parseInt(item.AssemblyDays, 10) || 0;
        const sandDays = parseInt(item.SandingDays, 10) || 0;
        const polishDays = parseInt(item.PolishDays, 10) || 0;
        const fitDays = parseInt(item.FittingDays, 10) || 0;
        const qcDays = parseInt(item.QcDays, 10) || 0;
        const finalQcDays = parseInt(item.FinalQcDays, 10) || 0;
        const packDays = parseInt(item.PackingDays, 10) || 0;

        // Total Lead Days excludes OutSourceDays as clarified
        const totalLeadDays = woodDays + preCutDays + machDays + assemDays + sandDays + 
                              polishDays + fitDays + qcDays + finalQcDays + packDays;

        const inspectionDate = item.InspectionDate ? String(item.InspectionDate).split('T')[0] : null;

        let woodIssueIn = null, woodIssueOut = null;
        let preCutIn = null, preCutOut = null;
        let machIn = null, machOut = null;
        let assemIn = null, assemOut = null;
        let sandIn = null, sandOut = null;
        let polishIn = null, polishOut = null;
        let fitIn = null, fitOut = null;
        let qcIn = null, qcOut = null;
        let finalQcIn = null, finalQcOut = null;
        let packIn = null, packOut = null;
        let daysWithBuffer = 0;
        let isDeadlineExceeded = false;
        let overdueDays = 0;

        if (inspectionDate && totalLeadDays > 0) {
            // Backward calculation: Wood Issue IN = InspectionDate - TotalLeadDays
            woodIssueIn = addDays(inspectionDate, -totalLeadDays);
            woodIssueOut = addDays(woodIssueIn, woodDays);

            // Forward cascades (+1 day buffer for each department transition)
            preCutIn = addDays(woodIssueOut, 1);
            preCutOut = addDays(preCutIn, preCutDays);

            // Machining starts after PreCutting (+1 day buffer). Outsource Job is skipped from date math.
            machIn = addDays(preCutOut, 1);
            machOut = addDays(machIn, machDays);

            assemIn = addDays(machOut, 1);
            assemOut = addDays(assemIn, assemDays);

            sandIn = addDays(assemOut, 1);
            sandOut = addDays(sandIn, sandDays);

            polishIn = addDays(sandOut, 1);
            polishOut = addDays(polishIn, polishDays);

            fitIn = addDays(polishOut, 1);
            fitOut = addDays(fitIn, fitDays);

            qcIn = addDays(fitOut, 1);
            qcOut = addDays(qcIn, qcDays);

            finalQcIn = addDays(qcOut, 1);
            finalQcOut = addDays(finalQcIn, finalQcDays);

            packIn = addDays(finalQcOut, 1);
            packOut = addDays(packIn, packDays);

            // Days with Buffer = Packing OUT minus Wood Issue IN
            daysWithBuffer = getDayDifference(packOut, woodIssueIn);

            // Check if Packing OUT goes past Target Inspection Date
            if (packOut && inspectionDate) {
                overdueDays = getDayDifference(packOut, inspectionDate);
                isDeadlineExceeded = overdueDays > 0;
            }
        }

        return {
            ...item,
            WoodIssueDays: woodDays,
            PreCuttingDays: preCutDays,
            OutSourceDays: outSourceDays,
            MachiningDays: machDays,
            AssemblyDays: assemDays,
            SandingDays: sandDays,
            PolishDays: polishDays,
            FittingDays: fitDays,
            QcDays: qcDays,
            FinalQcDays: finalQcDays,
            PackingDays: packDays,
            TotalLeadDays: totalLeadDays,
            DaysWithBuffer: daysWithBuffer,
            IsDeadlineExceeded: isDeadlineExceeded,
            OverdueDays: overdueDays,
            WoodIssueIn: woodIssueIn,
            WoodIssueOut: woodIssueOut,
            PreCuttingIn: preCutIn,
            PreCuttingOut: preCutOut,
            MachiningIn: machIn,
            MachiningOut: machOut,
            AssemblyIn: assemIn,
            AssemblyOut: assemOut,
            SandingIn: sandIn,
            SandingOut: sandOut,
            PolishIn: polishIn,
            PolishOut: polishOut,
            FittingIn: fitIn,
            FittingOut: fitOut,
            QcIn: qcIn,
            QcOut: qcOut,
            FinalQcIn: finalQcIn,
            FinalQcOut: finalQcOut,
            PackingIn: packIn,
            PackingOut: packOut,
        };
    };

    // Handle single day input change with validation
    const handleDayChange = (itemKey, field, value) => {
        const intVal = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
        setPlanItems(prev => prev.map(p => {
            if (p.ContainerMasterLId === itemKey) {
                return calculateRowSchedule({ ...p, [field]: intVal });
            }
            return p;
        }));
    };

    // Handle inspection date change
    const handleInspectionDateChange = (itemKey, value) => {
        setPlanItems(prev => prev.map(p => {
            if (p.ContainerMasterLId === itemKey) {
                return calculateRowSchedule({ ...p, InspectionDate: value });
            }
            return p;
        }));
    };

    // Smart Action: Copy Row 1 Lead Times to ALL Rows
    const handleCopyRow1ToAll = () => {
        if (planItems.length === 0) return;
        const row1 = planItems[0];
        const confirmation = window.confirm(
            `Apply Row 1 lead times to ALL ${planItems.length} items across all shipments?`
        );
        if (!confirmation) return;

        const updated = planItems.map(item => calculateRowSchedule({
            ...item,
            WoodIssueDays: row1.WoodIssueDays,
            PreCuttingDays: row1.PreCuttingDays,
            OutSourceDays: row1.OutSourceDays,
            MachiningDays: row1.MachiningDays,
            AssemblyDays: row1.AssemblyDays,
            SandingDays: row1.SandingDays,
            PolishDays: row1.PolishDays,
            FittingDays: row1.FittingDays,
            QcDays: row1.QcDays,
            FinalQcDays: row1.FinalQcDays,
            PackingDays: row1.PackingDays,
        }));

        setPlanItems(updated);
        toast.info(`⚡ Lead times applied to all ${planItems.length} items!`);
    };

    // Reset to initial
    const handleReset = () => {
        if (window.confirm('Reset all changes back to originally loaded plan?')) {
            setPlanItems(JSON.parse(JSON.stringify(originalItems)));
            toast.info('Changes reset.');
        }
    };

    // Download Pre-filled Template (.xlsx) matching the 39-column standard for all selected shipments
    const handleDownloadTemplate = () => {
        if (!planItems || planItems.length === 0) {
            toast.warn('No items to export.');
            return;
        }

        const row1 = [
            'ShipmentNo', 'ItemCode', 'ContractNo', 'ItemName', 'Quantity QTY', 'InspectionDate',
            'WOOD ISSUE', 'PRE CUTTING', 'OUT SOURCE JOB', 'MACHINING', 'ASSEMBLY', 'SANDING', 'POLISH', 'FITTING', 'QC', 'FINAL QC INSPECTION', 'PACKING',
            'TOTAL DAYS',
            'WOOD ISSUE', 'WOOD ISSUE',
            'PRE CUTTING', 'PRE CUTTING',
            'MACHINING', 'MACHINING',
            'ASSEMBLY', 'ASSEMBLY',
            'SANDING', 'SANDING',
            'POLISH', 'POLISH',
            'FITTING', 'FITTING',
            'QC', 'QC',
            'FINAL QC', 'FINAL QC',
            'PACKING', 'PACKING',
            'DAYS WITH BUFFER'
        ];

        const row2 = [
            '', '', '', '', '', '',
            '', '', '', '', '', '', '', '', '', '', '',
            '',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT',
            ''
        ];

        const rowsData = planItems.map(item => [
            item.ContainerNumber || '',
            item.ItemCode || '',
            item.ContractNo || '',
            item.ItemName || '',
            item.Quantity || 0,
            item.InspectionDate ? String(item.InspectionDate).split('T')[0] : '',
            item.WoodIssueDays || 0,
            item.PreCuttingDays || 0,
            item.OutSourceDays || 0,
            item.MachiningDays || 0,
            item.AssemblyDays || 0,
            item.SandingDays || 0,
            item.PolishDays || 0,
            item.FittingDays || 0,
            item.QcDays || 0,
            item.FinalQcDays || 0,
            item.PackingDays || 0,
            item.TotalLeadDays || 0,
            item.WoodIssueIn || '', item.WoodIssueOut || '',
            item.PreCuttingIn || '', item.PreCuttingOut || '',
            item.MachiningIn || '', item.MachiningOut || '',
            item.AssemblyIn || '', item.AssemblyOut || '',
            item.SandingIn || '', item.SandingOut || '',
            item.PolishIn || '', item.PolishOut || '',
            item.FittingIn || '', item.FittingOut || '',
            item.QcIn || '', item.QcOut || '',
            item.FinalQcIn || '', item.FinalQcOut || '',
            item.PackingIn || '', item.PackingOut || '',
            item.DaysWithBuffer || 0
        ]);

        const fullAOA = [row1, row2, ...rowsData];
        const ws = XLSX.utils.aoa_to_sheet(fullAOA);

        ws['!cols'] = [
            { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 14 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 },
            { wch: 11 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 14 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PRODUCTION TARGET');
        XLSX.writeFile(wb, `AARA_Multi_Shipment_Target_Template.xlsx`);
        toast.success(`📥 Template downloaded with ${planItems.length} items!`);
    };

    // Excel Upload Handler: Direct inline update into the same table!
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const firstSheetName = wb.SheetNames[0];
                const ws = wb.Sheets[firstSheetName];

                const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
                if (!aoa || aoa.length < 3) {
                    toast.error('Invalid Excel file format: Must have headers in rows 1-2 and data starting at row 3.');
                    return;
                }

                // Map uploaded data directly into existing items
                let matchedCount = 0;
                const updated = planItems.map(item => {
                    // search through rows
                    for (let r = 2; r < aoa.length; r++) {
                        const row = aoa[r];
                        if (!row || row.length === 0) continue;

                        const shipmentNo = String(row[0] || '').trim();
                        const itemCode = String(row[1] || '').trim();
                        const contractNo = String(row[2] || '').trim();

                        const matchContract = contractNo && String(item.ContractNo).trim().toLowerCase() === contractNo.toLowerCase();
                        const matchItem = itemCode && String(item.ItemCode).trim().toLowerCase() === itemCode.toLowerCase();
                        const matchShip = !shipmentNo || String(item.ContainerNumber).trim().toLowerCase() === shipmentNo.toLowerCase();

                        if ((matchContract || matchItem) && matchShip) {
                            matchedCount++;
                            const inspDate = row[5] ? String(row[5]).trim().split('T')[0] : item.InspectionDate;
                            const woodDays = parseInt(row[6], 10) || 0;
                            const preCutDays = parseInt(row[7], 10) || 0;
                            const outSourceDays = parseInt(row[8], 10) || 0;
                            const machDays = parseInt(row[9], 10) || 0;
                            const assemDays = parseInt(row[10], 10) || 0;
                            const sandDays = parseInt(row[11], 10) || 0;
                            const polishDays = parseInt(row[12], 10) || 0;
                            const fitDays = parseInt(row[13], 10) || 0;
                            const qcDays = parseInt(row[14], 10) || 0;
                            const finalQcDays = parseInt(row[15], 10) || 0;
                            const packDays = parseInt(row[16], 10) || 0;

                            return calculateRowSchedule({
                                ...item,
                                InspectionDate: inspDate,
                                WoodIssueDays: woodDays,
                                PreCuttingDays: preCutDays,
                                OutSourceDays: outSourceDays,
                                MachiningDays: machDays,
                                AssemblyDays: assemDays,
                                SandingDays: sandDays,
                                PolishDays: polishDays,
                                FittingDays: fitDays,
                                QcDays: qcDays,
                                FinalQcDays: finalQcDays,
                                PackingDays: packDays,
                            });
                        }
                    }
                    return item;
                });

                setPlanItems(updated);
                toast.success(`✅ Excel Uploaded: Updated ${matchedCount} items directly in the table! Review and save.`);
            } catch (err) {
                console.error('Error reading excel:', err);
                toast.error('Failed to parse Excel file: ' + err.message);
            }
        };

        reader.readAsBinaryString(file);
        // reset file input
        e.target.value = '';
    };

    // Save ALL selected shipments plan to backend in ONE JSON POST
    const handleSavePlan = async () => {
        if (!planItems || planItems.length === 0) {
            toast.warn('No items to save.');
            return;
        }

        const overdueItems = planItems.filter(p => p.IsDeadlineExceeded);
        if (overdueItems.length > 0) {
            const proceed = window.confirm(
                `⚠️ Note: ${overdueItems.length} item(s) have packing finish dates exceeding their Target Inspection Date!\n\nDo you want to proceed and save this target plan?`
            );
            if (!proceed) return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
            const userId = localStorage.getItem('userId') || '0';
            const url = `${API_WEB_URLS.BASE}ShipmentPlanning/SavePlan/${userId}/token`;

            const payloadData = planItems.map(item => ({
                ContainerMasterLId: item.ContainerMasterLId,
                ContainerId: item.ContainerId,
                WoodIssueDays: item.WoodIssueDays || 0,
                PreCuttingDays: item.PreCuttingDays || 0,
                OutSourceDays: item.OutSourceDays || 0,
                MachiningDays: item.MachiningDays || 0,
                AssemblyDays: item.AssemblyDays || 0,
                SandingDays: item.SandingDays || 0,
                PolishDays: item.PolishDays || 0,
                FittingDays: item.FittingDays || 0,
                QcDays: item.QcDays || 0,
                FinalQcDays: item.FinalQcDays || 0,
                PackingDays: item.PackingDays || 0,
                TotalLeadDays: item.TotalLeadDays || 0,
                DaysWithBuffer: item.DaysWithBuffer || 0,
                IsDeadlineExceeded: item.IsDeadlineExceeded ? true : false,
                WoodIssueIn: item.WoodIssueIn,
                WoodIssueOut: item.WoodIssueOut,
                PreCuttingIn: item.PreCuttingIn,
                PreCuttingOut: item.PreCuttingOut,
                MachiningIn: item.MachiningIn,
                MachiningOut: item.MachiningOut,
                AssemblyIn: item.AssemblyIn,
                AssemblyOut: item.AssemblyOut,
                SandingIn: item.SandingIn,
                SandingOut: item.SandingOut,
                PolishIn: item.PolishIn,
                PolishOut: item.PolishOut,
                FittingIn: item.FittingIn,
                FittingOut: item.FittingOut,
                QcIn: item.QcIn,
                QcOut: item.QcOut,
                FinalQcIn: item.FinalQcIn,
                FinalQcOut: item.FinalQcOut,
                PackingIn: item.PackingIn,
                PackingOut: item.PackingOut
            }));

            const res = await axios.post(url, { Data: JSON.stringify(payloadData) }, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });

            if (res.data && res.data.Success) {
                toast.success(`✅ Saved ${planItems.length} items across all shipments successfully!`);
                setOriginalItems(JSON.parse(JSON.stringify(planItems)));
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.data?.Message || 'Failed to save production plan.');
            }
        } catch (err) {
            console.error('Error saving multi-shipment plan:', err);
            toast.error('Error saving plan: ' + (err.response?.data?.Message || err.message));
        } finally {
            setSaving(false);
        }
    };

    // Unique list of shipments in current modal
    const uniqueShipments = useMemo(() => {
        const set = new Set();
        planItems.forEach(p => {
            if (p.ContainerNumber) set.add(p.ContainerNumber);
        });
        return Array.from(set);
    }, [planItems]);

    // Filter items based on search term & shipment dropdown
    const filteredItems = useMemo(() => {
        let items = planItems;
        if (selectedShipmentFilter !== 'ALL') {
            items = items.filter(p => p.ContainerNumber === selectedShipmentFilter);
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(item => 
                (item.ContainerNumber && item.ContainerNumber.toLowerCase().includes(lower)) ||
                (item.ContractNo && item.ContractNo.toLowerCase().includes(lower)) ||
                (item.ItemCode && item.ItemCode.toLowerCase().includes(lower)) ||
                (item.ItemName && item.ItemName.toLowerCase().includes(lower))
            );
        }
        return items;
    }, [planItems, selectedShipmentFilter, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const total = planItems.length;
        const planned = planItems.filter(p => p.TotalLeadDays > 0).length;
        const overdue = planItems.filter(p => p.IsDeadlineExceeded).length;
        const shipmentsCount = uniqueShipments.length;
        return { total, planned, overdue, shipmentsCount };
    }, [planItems, uniqueShipments]);

    return (
        <Modal show={show} onHide={onHide} size="fullscreen" centered className="desktop-planning-modal">
            {/* Desktop ERP Style Header */}
            <Modal.Header closeButton style={{ background: '#1e293b', color: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #334155' }}>
                <div className="d-flex align-items-center justify-content-between w-100 me-3">
                    <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '1.1rem', color: '#38bdf8' }}>📋</span>
                        <div>
                            <Modal.Title style={{ color: '#f8fafc', fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.3px', margin: 0 }}>
                                Production Planning Target Management
                            </Modal.Title>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Desktop Data Entry & Schedule Grid | Selected Shipments: <strong style={{ color: '#e2e8f0' }}>{stats.shipmentsCount}</strong> ({stats.total} total items)
                            </span>
                        </div>
                    </div>

                    {/* Desktop Counter Badges */}
                    <div className="d-none d-md-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
                        <span style={{ padding: '3px 8px', background: '#334155', color: '#e2e8f0', borderRadius: '3px', border: '1px solid #475569' }}>
                            Total: <strong>{stats.total}</strong>
                        </span>
                        <span style={{ padding: '3px 8px', background: '#064e3b', color: '#6ee7b7', borderRadius: '3px', border: '1px solid #047857' }}>
                            Planned: <strong>{stats.planned}</strong>
                        </span>
                        {stats.overdue > 0 ? (
                            <span style={{ padding: '3px 8px', background: '#7f1d1d', color: '#fca5a5', borderRadius: '3px', border: '1px solid #b91c1c' }}>
                                Late: <strong>{stats.overdue}</strong>
                            </span>
                        ) : (
                            <span style={{ padding: '3px 8px', background: '#1e3a8a', color: '#93c5fd', borderRadius: '3px', border: '1px solid #1d4ed8' }}>
                                On-Time
                            </span>
                        )}
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body style={{ backgroundColor: '#f1f5f9', padding: '10px' }}>
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="secondary" style={{ width: '2.5rem', height: '2.5rem' }} />
                        <div className="mt-2 text-muted" style={{ fontSize: '13px' }}>Loading production planning grid...</div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Toolbar */}
                        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', marginBottom: '8px' }}>
                            <Row className="align-items-center g-2">
                                <Col lg={3} md={4} sm={6}>
                                    <div className="position-relative">
                                        <Form.Control 
                                            type="text" 
                                            size="sm" 
                                            placeholder="Search Shipment, Contract, Item..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{ fontSize: '12px', height: '28px', paddingLeft: '26px' }}
                                        />
                                        <FaSearch style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8', fontSize: '11px' }} />
                                    </div>
                                </Col>

                                {uniqueShipments.length > 1 && (
                                    <Col lg={2} md={3} sm={6}>
                                        <Form.Select 
                                            size="sm"
                                            value={selectedShipmentFilter}
                                            onChange={e => setSelectedShipmentFilter(e.target.value)}
                                            style={{ fontSize: '12px', height: '28px' }}
                                            title="Filter by Shipment"
                                        >
                                            <option value="ALL">All Shipments ({uniqueShipments.length})</option>
                                            {uniqueShipments.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </Form.Select>
                                    </Col>
                                )}

                                <Col lg={uniqueShipments.length > 1 ? 7 : 9} md={uniqueShipments.length > 1 ? 5 : 8} className="d-flex flex-wrap align-items-center justify-content-md-end gap-1">
                                    <button 
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={handleCopyRow1ToAll}
                                        disabled={planItems.length === 0}
                                        style={{ fontSize: '11px', padding: '3px 8px', height: '28px' }}
                                        title="Copy Row 1 department lead times to all rows"
                                    >
                                        <FaMagic className="me-1 text-primary" /> Copy Row 1 to All
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={handleDownloadTemplate}
                                        disabled={planItems.length === 0}
                                        style={{ fontSize: '11px', padding: '3px 8px', height: '28px' }}
                                        title="Download Excel template with all selected rows"
                                    >
                                        <FaDownload className="me-1 text-info" /> Download Excel
                                    </button>

                                    <label 
                                        className="btn btn-sm btn-outline-secondary mb-0 cursor-pointer" 
                                        style={{ fontSize: '11px', padding: '3px 8px', height: '28px', display: 'inline-flex', alignItems: 'center' }}
                                        title="Upload filled Excel file to update table data"
                                    >
                                        <FaUpload className="me-1 text-success" /> Upload Excel
                                        <input 
                                            type="file" 
                                            accept=".xlsx, .xlsm" 
                                            style={{ display: 'none' }} 
                                            onChange={handleFileUpload} 
                                        />
                                    </label>

                                    <button 
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={handleReset}
                                        style={{ fontSize: '11px', padding: '3px 8px', height: '28px' }}
                                        title="Reset unsaved changes"
                                    >
                                        <FaUndo className="me-1" /> Reset
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-sm btn-primary ms-1"
                                        onClick={handleSavePlan}
                                        disabled={saving || planItems.length === 0}
                                        style={{ fontSize: '11px', padding: '3px 12px', height: '28px', fontWeight: 600 }}
                                    >
                                        {saving ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" role="status" className="me-1" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="me-1" /> Save Plan ({planItems.length})
                                            </>
                                        )}
                                    </button>
                                </Col>
                            </Row>
                        </div>

                        {/* Desktop ERP Unified Data Grid (Show & Edit in Same Table) */}
                        <div 
                            style={{ 
                                background: '#fff', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '4px', 
                                maxHeight: 'calc(100vh - 190px)', 
                                overflow: 'auto' 
                            }}
                        >
                            <table 
                                className="table-bordered"
                                style={{ 
                                    width: '100%', 
                                    borderCollapse: 'collapse', 
                                    fontSize: '11px', 
                                    color: '#0f172a',
                                    fontFamily: 'Segoe UI, Arial, sans-serif'
                                }}
                            >
                                <thead 
                                    style={{ 
                                        position: 'sticky', 
                                        top: 0, 
                                        backgroundColor: '#e2e8f0', 
                                        zIndex: 2,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {/* Level 1 Header */}
                                    <tr style={{ backgroundColor: '#e2e8f0', color: '#1e293b' }}>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '32px' }}>#</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', width: '80px' }}>Shipment</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', width: '90px' }}>Contract</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', width: '80px' }}>Item Code</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', minWidth: '160px' }}>Description</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '45px' }}>Qty</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '110px' }}>Insp Date</th>
                                        
                                        {/* Department Days Group */}
                                        <th colSpan="11" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>
                                            Department Lead Times (Days)
                                        </th>
                                        
                                        {/* Computed Output Dates */}
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '55px', backgroundColor: '#f1f5f9' }}>Total</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>Wood IN</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>Wood OUT</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>Mach OUT</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>Assem OUT</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>Polish OUT</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>FinalQC OUT</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', backgroundColor: '#f1f5f9' }}>Pack OUT</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '55px', backgroundColor: '#f1f5f9' }}>Buffer</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '75px', backgroundColor: '#f1f5f9' }}>Status</th>
                                    </tr>

                                    {/* Level 2 Subheaders */}
                                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px' }}>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Wood</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>PreCut</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '45px', color: '#64748b' }} title="Outsource Job (Informational save only, dates unaffected)">OutSrc*</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Mach</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Assem</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Sand</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Polish</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Fit</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>QC</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '45px' }}>FinalQC</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Pack</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="26" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                No items match your filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item, idx) => {
                                            const isLate = item.IsDeadlineExceeded;
                                            const rowBg = isLate ? '#fef2f2' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');

                                            return (
                                                <tr 
                                                    key={item.ContainerMasterLId || idx}
                                                    style={{ backgroundColor: rowBg, height: '28px' }}
                                                >
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '10px' }}>
                                                        {idx + 1}
                                                    </td>
                                                    <td style={{ border: '1px solid #e2e8f0', fontWeight: 600, color: '#334155' }}>
                                                        {item.ContainerNumber || '-'}
                                                    </td>
                                                    <td style={{ border: '1px solid #e2e8f0', color: '#1e293b' }}>
                                                        {item.ContractNo || '-'}
                                                    </td>
                                                    <td style={{ border: '1px solid #e2e8f0', fontFamily: 'monospace', color: '#0f172a' }}>
                                                        {item.ItemCode || '-'}
                                                    </td>
                                                    <td style={{ border: '1px solid #e2e8f0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.ItemName}>
                                                        {item.ItemName || '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                                                        {item.Quantity || 0}
                                                    </td>

                                                    {/* Inspection Date Cell */}
                                                    <td style={{ border: '1px solid #e2e8f0', padding: '1px 2px' }}>
                                                        <input 
                                                            type="date"
                                                            value={item.InspectionDate ? String(item.InspectionDate).split('T')[0] : ''}
                                                            onChange={e => handleInspectionDateChange(item.ContainerMasterLId, e.target.value)}
                                                            style={{ 
                                                                width: '100%', 
                                                                height: '22px', 
                                                                fontSize: '11px', 
                                                                border: '1px solid #cbd5e1', 
                                                                borderRadius: '2px',
                                                                padding: '1px 2px',
                                                                backgroundColor: '#fff'
                                                            }}
                                                        />
                                                    </td>

                                                    {/* Department Inputs: Wood to Pack */}
                                                    {[
                                                        { f: 'WoodIssueDays', w: 'Wood' },
                                                        { f: 'PreCuttingDays', w: 'PreCut' },
                                                        { f: 'OutSourceDays', w: 'OutSrc', isInfo: true },
                                                        { f: 'MachiningDays', w: 'Mach' },
                                                        { f: 'AssemblyDays', w: 'Assem' },
                                                        { f: 'SandingDays', w: 'Sand' },
                                                        { f: 'PolishDays', w: 'Polish' },
                                                        { f: 'FittingDays', w: 'Fit' },
                                                        { f: 'QcDays', w: 'QC' },
                                                        { f: 'FinalQcDays', w: 'FinalQC' },
                                                        { f: 'PackingDays', w: 'Pack' },
                                                    ].map(dept => (
                                                        <td key={dept.f} style={{ border: '1px solid #e2e8f0', padding: '1px 2px' }}>
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                value={item[dept.f]}
                                                                onChange={e => handleDayChange(item.ContainerMasterLId, dept.f, e.target.value)}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    height: '22px', 
                                                                    textAlign: 'center', 
                                                                    fontSize: '11px', 
                                                                    border: '1px solid #cbd5e1', 
                                                                    borderRadius: '2px',
                                                                    backgroundColor: dept.isInfo ? '#f8fafc' : '#fff',
                                                                    color: dept.isInfo ? '#64748b' : '#0f172a'
                                                                }}
                                                                title={dept.isInfo ? 'Outsource Job (Informational save only)' : dept.w}
                                                            />
                                                        </td>
                                                    ))}

                                                    {/* Computed Output Dates */}
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                                                        {item.TotalLeadDays}d
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#1e40af', fontWeight: 500 }}>
                                                        {formatDisplayDate(item.WoodIssueIn)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {formatDisplayDate(item.WoodIssueOut)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {formatDisplayDate(item.MachiningOut)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {formatDisplayDate(item.AssemblyOut)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {formatDisplayDate(item.PolishOut)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {formatDisplayDate(item.FinalQcOut)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 600, color: isLate ? '#dc2626' : '#15803d' }}>
                                                        {formatDisplayDate(item.PackingOut)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {item.DaysWithBuffer ? `${item.DaysWithBuffer}d` : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                                        {isLate ? (
                                                            <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '10px' }}>
                                                                Late +{item.OverdueDays}d
                                                            </span>
                                                        ) : item.TotalLeadDays > 0 ? (
                                                            <span style={{ color: '#15803d', fontWeight: 600, fontSize: '10px' }}>
                                                                OK
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                                                                -
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer style={{ background: '#f8fafc', padding: '8px 16px', borderTop: '1px solid #e2e8f0' }}>
                <div className="d-flex align-items-center justify-content-between w-100">
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        * <strong>Wood Issue IN</strong> = [Target Date - Total Days]. Each handover adds +1 day transit buffer. Outsource Job is informational only.
                    </span>
                    <div className="d-flex gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={onHide} 
                            style={{ fontSize: '11px', height: '28px' }}
                        >
                            Close
                        </Button>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={handleSavePlan}
                            disabled={saving || planItems.length === 0}
                            style={{ fontSize: '11px', height: '28px', fontWeight: 600 }}
                        >
                            {saving ? 'Saving...' : `💾 Save Target Plan (${planItems.length})`}
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default ProductionPlanningModal;
