import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Table, Spinner, Badge, Form, Row, Col, Card, Alert, Tab, Nav } from 'react-bootstrap';
import { 
    FaDownload, FaUpload, FaFileExcel, FaCopy, FaCheckCircle, 
    FaExclamationTriangle, FaSave, FaTimes, FaCalendarAlt, FaMagic, FaEye, FaUndo
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_WEB_URLS } from '../../../constants/constAPI';

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
    containerId: initialContainerId,
    containerNumber: initialContainerNumber,
    containerList = [],
    onSuccess,
}) => {
    const [currentContainerId, setCurrentContainerId] = useState(initialContainerId);
    const [currentContainerNumber, setCurrentContainerNumber] = useState(initialContainerNumber);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [planItems, setPlanItems] = useState([]);
    const [originalItems, setOriginalItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('grid');
    
    // Upload & Preview state
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadFileName, setUploadFileName] = useState('');

    useEffect(() => {
        setCurrentContainerId(initialContainerId);
        setCurrentContainerNumber(initialContainerNumber);
    }, [initialContainerId, initialContainerNumber]);

    // Fetch container items and existing plan targets
    useEffect(() => {
        if (show && currentContainerId) {
            fetchContainerPlan(currentContainerId);
        }
    }, [show, currentContainerId]);

    const fetchContainerPlan = async (cId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
            const userId = localStorage.getItem('userId') || '0';
            const url = `${API_WEB_URLS.BASE}ShipmentPlanning/GetPlan/${cId}/${userId}/token`;

            const res = await axios.get(url, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                }
            });

            if (res.data && res.data.Success && Array.isArray(res.data.Data)) {
                // Compute initial dates for each row
                const computed = res.data.Data.map(item => calculateRowSchedule(item));
                setPlanItems(computed);
                setOriginalItems(JSON.parse(JSON.stringify(computed)));
            } else {
                toast.warn(res.data?.Message || 'No line items found for this shipment.');
                setPlanItems([]);
            }
        } catch (err) {
            console.error('Error fetching shipment plan:', err);
            toast.error('Failed to load shipment planning data: ' + (err.response?.data?.Message || err.message));
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
    const handleDayChange = (index, field, value) => {
        const intVal = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
        setPlanItems(prev => {
            const updated = [...prev];
            updated[index] = calculateRowSchedule({
                ...updated[index],
                [field]: intVal
            });
            return updated;
        });
    };

    // Handle inspection date change
    const handleInspectionDateChange = (index, value) => {
        setPlanItems(prev => {
            const updated = [...prev];
            updated[index] = calculateRowSchedule({
                ...updated[index],
                InspectionDate: value
            });
            return updated;
        });
    };

    // Smart Action: Copy Row 1 Lead Times to ALL Rows
    const handleCopyRow1ToAll = () => {
        if (planItems.length === 0) return;
        const row1 = planItems[0];
        const confirmation = window.confirm(
            `Apply Row 1 lead times (Wood: ${row1.WoodIssueDays}d, PreCut: ${row1.PreCuttingDays}d, Mach: ${row1.MachiningDays}d, etc.) to all ${planItems.length} items?`
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
        toast.info('⚡ Lead times copied from Row 1 to all items successfully!');
    };

    // Reset to initial
    const handleReset = () => {
        if (window.confirm('Reset all changes back to originally loaded plan?')) {
            setPlanItems(JSON.parse(JSON.stringify(originalItems)));
            toast.info('Changes reset.');
        }
    };

    // Download Pre-filled Template (.xlsx) matching the 39-column standard
    const handleDownloadTemplate = () => {
        if (!planItems || planItems.length === 0) {
            toast.warn('No items to export.');
            return;
        }

        // Build exact 2 header rows
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
            currentContainerNumber || item.ContainerNumber || '',
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

        // Set column widths
        ws['!cols'] = [
            { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 14 }, // A-F
            { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, // G-Q
            { wch: 12 }, // R
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, // S-Z
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, // AA-AL
            { wch: 16 } // AM
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PRODUCTION TARGET');
        XLSX.writeFile(wb, `AARA_${currentContainerNumber || 'Shipment'}_Target_Template.xlsx`);
        toast.success('📥 Template downloaded with pre-filled items!');
    };

    // Excel Upload Handler
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadFileName(file.name);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const firstSheetName = wb.SheetNames[0];
                const ws = wb.Sheets[firstSheetName];

                // Convert to array of arrays
                const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
                if (!aoa || aoa.length < 3) {
                    toast.error('Invalid Excel file format: Must have headers in rows 1-2 and data starting at row 3.');
                    return;
                }

                // Parse uploaded rows starting at row 3 (index 2)
                const parsedRows = [];
                for (let r = 2; r < aoa.length; r++) {
                    const row = aoa[r];
                    if (!row || row.length === 0 || (!row[0] && !row[1] && !row[2])) continue;

                    const shipmentNo = String(row[0] || '').trim();
                    const itemCode = String(row[1] || '').trim();
                    const contractNo = String(row[2] || '').trim();
                    const itemName = String(row[3] || '').trim();
                    const qty = parseInt(row[4], 10) || 0;
                    const inspDate = row[5] ? String(row[5]).trim().split('T')[0] : null;

                    // Days from Col 7 to 17 (index 6 to 16)
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

                    // Check if row matches an item in current container
                    const matchedItem = planItems.find(p => 
                        (contractNo && String(p.ContractNo).trim().toLowerCase() === contractNo.toLowerCase()) ||
                        (itemCode && String(p.ItemCode).trim().toLowerCase() === itemCode.toLowerCase())
                    );

                    let status = 'matched';
                    let statusMsg = 'Ready to merge';

                    if (!matchedItem) {
                        status = 'unmatched';
                        statusMsg = 'Item/Contract not found in this shipment';
                    } else if (!inspDate && !matchedItem.InspectionDate) {
                        status = 'warning';
                        statusMsg = 'Inspection Date missing';
                    }

                    parsedRows.push({
                        rowIdx: r + 1,
                        ShipmentNo: shipmentNo,
                        ItemCode: itemCode,
                        ContractNo: contractNo,
                        ItemName: itemName || (matchedItem ? matchedItem.ItemName : ''),
                        Quantity: qty || (matchedItem ? matchedItem.Quantity : 0),
                        InspectionDate: inspDate || (matchedItem ? matchedItem.InspectionDate : null),
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
                        matchedItem: matchedItem,
                        status: status,
                        statusMsg: statusMsg
                    });
                }

                setUploadPreview(parsedRows);
                setActiveTab('preview');
                toast.success(`Excel file parsed: ${parsedRows.length} rows loaded into Preview.`);
            } catch (err) {
                console.error('Error reading excel:', err);
                toast.error('Failed to parse Excel file: ' + err.message);
            }
        };

        reader.readAsBinaryString(file);
    };

    // Apply Preview data into active planning state
    const handleApplyPreview = () => {
        if (!uploadPreview || uploadPreview.length === 0) return;

        let matchCount = 0;
        const updated = planItems.map(item => {
            const found = uploadPreview.find(p => 
                (p.ContractNo && String(p.ContractNo).trim().toLowerCase() === String(item.ContractNo).trim().toLowerCase()) ||
                (p.ItemCode && String(p.ItemCode).trim().toLowerCase() === String(item.ItemCode).trim().toLowerCase())
            );

            if (found) {
                matchCount++;
                return calculateRowSchedule({
                    ...item,
                    InspectionDate: found.InspectionDate || item.InspectionDate,
                    WoodIssueDays: found.WoodIssueDays,
                    PreCuttingDays: found.PreCuttingDays,
                    OutSourceDays: found.OutSourceDays,
                    MachiningDays: found.MachiningDays,
                    AssemblyDays: found.AssemblyDays,
                    SandingDays: found.SandingDays,
                    PolishDays: found.PolishDays,
                    FittingDays: found.FittingDays,
                    QcDays: found.QcDays,
                    FinalQcDays: found.FinalQcDays,
                    PackingDays: found.PackingDays,
                });
            }
            return item;
        });

        setPlanItems(updated);
        setActiveTab('grid');
        toast.success(`Successfully updated ${matchCount} shipment items from uploaded Excel!`);
    };

    // Save plan to backend
    const handleSavePlan = async () => {
        if (!planItems || planItems.length === 0) {
            toast.warn('No items to save.');
            return;
        }

        // Validate: Warn if any row has deadline exceeded
        const overdueItems = planItems.filter(p => p.IsDeadlineExceeded);
        if (overdueItems.length > 0) {
            const proceed = window.confirm(
                `⚠️ Warning: ${overdueItems.length} item(s) have packing finish dates that exceed the Target Inspection Date!\n\nDo you still want to proceed and save this target plan?`
            );
            if (!proceed) return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
            const userId = localStorage.getItem('userId') || '0';
            const url = `${API_WEB_URLS.BASE}ShipmentPlanning/SavePlan/${userId}/token`;

            // Prepare clean payload
            const payloadData = planItems.map(item => ({
                ContainerMasterLId: item.ContainerMasterLId,
                ContainerId: containerId,
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
                toast.success('✅ Production planning targets saved successfully!');
                setOriginalItems(JSON.parse(JSON.stringify(planItems)));
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.data?.Message || 'Failed to save production plan.');
            }
        } catch (err) {
            console.error('Error saving plan:', err);
            toast.error('Error saving plan: ' + (err.response?.data?.Message || err.message));
        } finally {
            setSaving(false);
        }
    };

    // Filter items based on search term
    const filteredItems = useMemo(() => {
        if (!searchTerm) return planItems;
        const lower = searchTerm.toLowerCase();
        return planItems.filter(item => 
            (item.ContractNo && item.ContractNo.toLowerCase().includes(lower)) ||
            (item.ItemCode && item.ItemCode.toLowerCase().includes(lower)) ||
            (item.ItemName && item.ItemName.toLowerCase().includes(lower))
        );
    }, [planItems, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const total = planItems.length;
        const planned = planItems.filter(p => p.TotalLeadDays > 0).length;
        const overdue = planItems.filter(p => p.IsDeadlineExceeded).length;
        const unplanned = total - planned;
        return { total, planned, overdue, unplanned };
    }, [planItems]);

    return (
        <Modal show={show} onHide={onHide} size="fullscreen" centered className="production-planning-modal">
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
                <div className="d-flex align-items-center justify-content-between w-100 me-3">
                    <div className="d-flex align-items-center gap-3">
                        <span style={{ fontSize: '1.4rem' }}>🎯</span>
                        <div>
                            {containerList && containerList.length > 1 ? (
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 600 }}>
                                        Production Planning Targets — Shipment:
                                    </span>
                                    <Form.Select 
                                        size="sm" 
                                        value={currentContainerId}
                                        onChange={e => {
                                            const sel = containerList.find(c => String(c.id) === String(e.target.value));
                                            if (sel) {
                                                setCurrentContainerId(sel.id);
                                                setCurrentContainerNumber(sel.number);
                                            }
                                        }}
                                        style={{ 
                                            width: 'auto', 
                                            display: 'inline-block', 
                                            backgroundColor: '#0f172a', 
                                            color: '#fbbf24', 
                                            fontWeight: 'bold', 
                                            border: '1px solid #475569' 
                                        }}
                                    >
                                        {containerList.map(c => (
                                            <option key={c.id} value={c.id}>{c.number || `Container #${c.id}`}</option>
                                        ))}
                                    </Form.Select>
                                </div>
                            ) : (
                                <Modal.Title style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
                                    Production Planning Targets — Shipment: <span className="text-warning">{currentContainerNumber || 'N/A'}</span>
                                </Modal.Title>
                            )}
                            <small className="text-light opacity-75 d-block">
                                Backward Scheduling & Department Date Allocation Engine
                            </small>
                        </div>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="d-none d-md-flex align-items-center gap-2">
                        <Badge bg="secondary" className="px-3 py-2">Total Items: {stats.total}</Badge>
                        <Badge bg="success" className="px-3 py-2">Planned: {stats.planned}</Badge>
                        {stats.overdue > 0 ? (
                            <Badge bg="danger" className="px-3 py-2 animate__animated animate__pulse animate__infinite">
                                ⚠️ Overdue: {stats.overdue}
                            </Badge>
                        ) : (
                            <Badge bg="info" className="px-3 py-2">On-Time</Badge>
                        )}
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body style={{ backgroundColor: '#f8fafc', padding: '16px' }}>
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                        <h5 className="mt-3 text-muted">Loading shipment target planning data...</h5>
                    </div>
                ) : (
                    <>
                        {/* Toolbar: Actions & Search */}
                        <Card className="mb-3 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <Row className="align-items-center g-2">
                                    <Col lg={3} md={4}>
                                        <Form.Control 
                                            type="text" 
                                            size="sm" 
                                            placeholder="🔍 Search Contract, Item Code, Name..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </Col>

                                    <Col lg={9} md={8} className="d-flex flex-wrap align-items-center justify-content-md-end gap-2">
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm" 
                                            onClick={handleCopyRow1ToAll}
                                            disabled={planItems.length === 0}
                                            title="Copy lead times of Row 1 to all items in this container"
                                        >
                                            <FaMagic className="me-1" /> Copy Row 1 Days to All
                                        </Button>

                                        <Button 
                                            variant="outline-info" 
                                            size="sm" 
                                            onClick={handleDownloadTemplate}
                                            disabled={planItems.length === 0}
                                            title="Download Excel template pre-filled with shipment items"
                                        >
                                            <FaDownload className="me-1" /> Download Template (.xlsx)
                                        </Button>

                                        <label className="btn btn-outline-success btn-sm mb-0 cursor-pointer" title="Upload filled Excel target template">
                                            <FaUpload className="me-1" /> Upload Excel
                                            <input 
                                                type="file" 
                                                accept=".xlsx, .xlsm" 
                                                style={{ display: 'none' }} 
                                                onChange={handleFileUpload} 
                                            />
                                        </label>

                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm" 
                                            onClick={handleReset}
                                            title="Reset unsaved changes"
                                        >
                                            <FaUndo className="me-1" /> Reset
                                        </Button>

                                        <Button 
                                            variant="success" 
                                            size="sm" 
                                            onClick={handleSavePlan}
                                            disabled={saving || planItems.length === 0}
                                        >
                                            {saving ? (
                                                <>
                                                    <Spinner as="span" animation="border" size="sm" role="status" className="me-1" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <FaSave className="me-1" /> Save Plan
                                                </>
                                            )}
                                        </Button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* Navigation Tabs */}
                        <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k)}>
                            <Nav variant="tabs" className="mb-2">
                                <Nav.Item>
                                    <Nav.Link eventKey="grid" className="fw-semibold">
                                        📊 Smart Planning Grid ({filteredItems.length})
                                    </Nav.Link>
                                </Nav.Item>
                                {uploadPreview && (
                                    <Nav.Item>
                                        <Nav.Link eventKey="preview" className="fw-semibold text-success">
                                            <FaEye className="me-1" /> Excel Upload Preview ({uploadPreview.length} rows)
                                        </Nav.Link>
                                    </Nav.Item>
                                )}
                            </Nav>

                            <Tab.Content>
                                {/* TAB 1: Smart Planning Grid */}
                                <Tab.Pane eventKey="grid">
                                    <div className="table-responsive bg-white rounded shadow-sm" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                                        <Table bordered hover size="sm" className="mb-0 text-nowrap" style={{ fontSize: '0.8rem' }}>
                                            <thead className="table-dark sticky-top text-center" style={{ zIndex: 1 }}>
                                                <tr>
                                                    <th rowSpan="2" style={{ width: '40px' }}>#</th>
                                                    <th rowSpan="2" style={{ width: '100px' }}>Contract No</th>
                                                    <th rowSpan="2" style={{ width: '90px' }}>Item Code</th>
                                                    <th rowSpan="2" style={{ minWidth: '180px' }}>Item Description</th>
                                                    <th rowSpan="2" style={{ width: '60px' }}>Qty</th>
                                                    <th rowSpan="2" style={{ width: '130px' }} className="table-warning text-dark">Target Insp Date</th>
                                                    
                                                    {/* Departments Days */}
                                                    <th colSpan="11" className="bg-primary text-white">Department Lead Times (Days Required)</th>
                                                    
                                                    {/* Summary & Key Dates */}
                                                    <th rowSpan="2" className="bg-info text-dark" style={{ width: '70px' }}>Total Days</th>
                                                    <th rowSpan="2" className="bg-success text-white" style={{ width: '110px' }}>Wood Issue IN</th>
                                                    <th rowSpan="2" style={{ width: '110px' }}>Wood Issue OUT</th>
                                                    <th rowSpan="2" style={{ width: '110px' }}>Machining OUT</th>
                                                    <th rowSpan="2" style={{ width: '110px' }}>Assembly OUT</th>
                                                    <th rowSpan="2" style={{ width: '110px' }}>Polish OUT</th>
                                                    <th rowSpan="2" style={{ width: '110px' }}>Final QC OUT</th>
                                                    <th rowSpan="2" className="bg-success text-white" style={{ width: '110px' }}>Packing OUT</th>
                                                    <th rowSpan="2" style={{ width: '80px' }}>Buffer Days</th>
                                                    <th rowSpan="2" style={{ width: '100px' }}>Status</th>
                                                </tr>
                                                <tr>
                                                    <th style={{ width: '55px' }}>Wood</th>
                                                    <th style={{ width: '55px' }}>PreCut</th>
                                                    <th style={{ width: '65px' }} className="bg-secondary text-white" title="Informational only (No date impact)">OutSrc*</th>
                                                    <th style={{ width: '55px' }}>Mach</th>
                                                    <th style={{ width: '55px' }}>Assem</th>
                                                    <th style={{ width: '55px' }}>Sand</th>
                                                    <th style={{ width: '55px' }}>Polish</th>
                                                    <th style={{ width: '55px' }}>Fitting</th>
                                                    <th style={{ width: '55px' }}>QC</th>
                                                    <th style={{ width: '60px' }}>FinalQC</th>
                                                    <th style={{ width: '55px' }}>Pack</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {filteredItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="25" className="text-center py-4 text-muted">
                                                            No line items match your criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredItems.map((item, idx) => {
                                                        const isLate = item.IsDeadlineExceeded;
                                                        return (
                                                            <tr 
                                                                key={item.ContainerMasterLId || idx}
                                                                className={isLate ? 'table-danger' : (item.TotalLeadDays > 0 ? '' : 'table-light')}
                                                            >
                                                                <td className="text-center font-monospace">{idx + 1}</td>
                                                                <td className="fw-semibold">{item.ContractNo || '-'}</td>
                                                                <td className="font-monospace">{item.ItemCode || '-'}</td>
                                                                <td title={item.ItemName} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {item.ItemName || '-'}
                                                                </td>
                                                                <td className="text-center fw-bold">{item.Quantity || 0}</td>
                                                                
                                                                {/* Inspection Date (Editable) */}
                                                                <td>
                                                                    <Form.Control 
                                                                        type="date"
                                                                        size="sm"
                                                                        value={item.InspectionDate ? String(item.InspectionDate).split('T')[0] : ''}
                                                                        onChange={e => handleInspectionDateChange(idx, e.target.value)}
                                                                        style={{ fontSize: '0.75rem', padding: '2px 4px' }}
                                                                    />
                                                                </td>

                                                                {/* Department Inputs */}
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.WoodIssueDays}
                                                                        onChange={e => handleDayChange(idx, 'WoodIssueDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.PreCuttingDays}
                                                                        onChange={e => handleDayChange(idx, 'PreCuttingDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td className="bg-light">
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.OutSourceDays}
                                                                        onChange={e => handleDayChange(idx, 'OutSourceDays', e.target.value)}
                                                                        className="text-center p-1 text-muted"
                                                                        title="Outsource Job (Informational save only)"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.MachiningDays}
                                                                        onChange={e => handleDayChange(idx, 'MachiningDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.AssemblyDays}
                                                                        onChange={e => handleDayChange(idx, 'AssemblyDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.SandingDays}
                                                                        onChange={e => handleDayChange(idx, 'SandingDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.PolishDays}
                                                                        onChange={e => handleDayChange(idx, 'PolishDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.FittingDays}
                                                                        onChange={e => handleDayChange(idx, 'FittingDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.QcDays}
                                                                        onChange={e => handleDayChange(idx, 'QcDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.FinalQcDays}
                                                                        onChange={e => handleDayChange(idx, 'FinalQcDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control 
                                                                        type="number" min="0" size="sm"
                                                                        value={item.PackingDays}
                                                                        onChange={e => handleDayChange(idx, 'PackingDays', e.target.value)}
                                                                        className="text-center p-1"
                                                                    />
                                                                </td>

                                                                {/* Computed Summary Columns */}
                                                                <td className="text-center fw-bold bg-light">{item.TotalLeadDays}d</td>
                                                                <td className="text-center fw-semibold text-primary">{formatDisplayDate(item.WoodIssueIn)}</td>
                                                                <td className="text-center text-muted">{formatDisplayDate(item.WoodIssueOut)}</td>
                                                                <td className="text-center text-muted">{formatDisplayDate(item.MachiningOut)}</td>
                                                                <td className="text-center text-muted">{formatDisplayDate(item.AssemblyOut)}</td>
                                                                <td className="text-center text-muted">{formatDisplayDate(item.PolishOut)}</td>
                                                                <td className="text-center text-muted">{formatDisplayDate(item.FinalQcOut)}</td>
                                                                <td className={`text-center fw-bold ${isLate ? 'text-danger' : 'text-success'}`}>
                                                                    {formatDisplayDate(item.PackingOut)}
                                                                </td>
                                                                <td className="text-center">{item.DaysWithBuffer ? `${item.DaysWithBuffer}d` : '-'}</td>
                                                                
                                                                {/* Status Alert Badge */}
                                                                <td className="text-center">
                                                                    {isLate ? (
                                                                        <Badge bg="danger" title={`Calculated packing finishes ${item.OverdueDays} days after Inspection Date!`}>
                                                                            ⚠️ Late ({item.OverdueDays}d)
                                                                        </Badge>
                                                                    ) : item.TotalLeadDays > 0 ? (
                                                                        <Badge bg="success">🟢 On Target</Badge>
                                                                    ) : (
                                                                        <Badge bg="secondary">Pending</Badge>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Tab.Pane>

                                {/* TAB 2: Upload Preview */}
                                {uploadPreview && (
                                    <Tab.Pane eventKey="preview">
                                        <div className="bg-white p-3 rounded shadow-sm mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <div>
                                                    <h5 className="mb-1 text-dark">
                                                        <FaFileExcel className="text-success me-2" />
                                                        File: <span className="fw-bold">{uploadFileName}</span>
                                                    </h5>
                                                    <small className="text-muted">
                                                        Review matched rows before applying them into the live grid.
                                                    </small>
                                                </div>

                                                <div className="d-flex gap-2">
                                                    <Button 
                                                        variant="success" 
                                                        size="sm" 
                                                        onClick={handleApplyPreview}
                                                    >
                                                        <FaCheckCircle className="me-1" /> Apply Preview to Plan Grid
                                                    </Button>
                                                    <Button 
                                                        variant="outline-secondary" 
                                                        size="sm" 
                                                        onClick={() => setUploadPreview(null)}
                                                    >
                                                        <FaTimes className="me-1" /> Discard Preview
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                                                <Table bordered hover size="sm" className="mb-0 text-nowrap" style={{ fontSize: '0.8rem' }}>
                                                    <thead className="table-light sticky-top">
                                                        <tr>
                                                            <th>Excel Row</th>
                                                            <th>Status</th>
                                                            <th>Contract No</th>
                                                            <th>Item Code</th>
                                                            <th>Description</th>
                                                            <th>Qty</th>
                                                            <th>Inspection Date</th>
                                                            <th>Wood</th>
                                                            <th>PreCut</th>
                                                            <th>OutSrc</th>
                                                            <th>Mach</th>
                                                            <th>Assem</th>
                                                            <th>Sand</th>
                                                            <th>Polish</th>
                                                            <th>Fitting</th>
                                                            <th>QC</th>
                                                            <th>FinalQC</th>
                                                            <th>Pack</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {uploadPreview.map((p, pIdx) => (
                                                            <tr 
                                                                key={pIdx} 
                                                                className={p.status === 'matched' ? '' : (p.status === 'warning' ? 'table-warning' : 'table-danger')}
                                                            >
                                                                <td className="text-center font-monospace">{p.rowIdx}</td>
                                                                <td>
                                                                    {p.status === 'matched' && <Badge bg="success">Matched</Badge>}
                                                                    {p.status === 'warning' && <Badge bg="warning" text="dark">Warning</Badge>}
                                                                    {p.status === 'unmatched' && <Badge bg="danger">Not Found</Badge>}
                                                                    <small className="ms-1 text-muted">({p.statusMsg})</small>
                                                                </td>
                                                                <td className="fw-semibold">{p.ContractNo || '-'}</td>
                                                                <td className="font-monospace">{p.ItemCode || '-'}</td>
                                                                <td>{p.ItemName || '-'}</td>
                                                                <td className="text-center">{p.Quantity}</td>
                                                                <td className="text-center">{p.InspectionDate || '-'}</td>
                                                                <td className="text-center">{p.WoodIssueDays}</td>
                                                                <td className="text-center">{p.PreCuttingDays}</td>
                                                                <td className="text-center text-muted">{p.OutSourceDays}</td>
                                                                <td className="text-center">{p.MachiningDays}</td>
                                                                <td className="text-center">{p.AssemblyDays}</td>
                                                                <td className="text-center">{p.SandingDays}</td>
                                                                <td className="text-center">{p.PolishDays}</td>
                                                                <td className="text-center">{p.FittingDays}</td>
                                                                <td className="text-center">{p.QcDays}</td>
                                                                <td className="text-center">{p.FinalQcDays}</td>
                                                                <td className="text-center">{p.PackingDays}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </div>
                                    </Tab.Pane>
                                )}
                            </Tab.Content>
                        </Tab.Container>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light py-2">
                <div className="d-flex align-items-center justify-content-between w-100">
                    <small className="text-muted">
                        💡 <strong>Scheduling Rule:</strong> Wood Issue IN = [Target Date - Total Days]. Each handover department adds +1 day buffer. Out Source Job is informational only.
                    </small>
                    <div className="d-flex gap-2">
                        <Button variant="secondary" size="sm" onClick={onHide}>
                            Close
                        </Button>
                        <Button 
                            variant="success" 
                            size="sm" 
                            onClick={handleSavePlan}
                            disabled={saving || planItems.length === 0}
                        >
                            {saving ? 'Saving...' : '💾 Save Target Plan'}
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default ProductionPlanningModal;
