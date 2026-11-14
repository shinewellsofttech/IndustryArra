import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Spinner, Form, Row, Col } from 'react-bootstrap';
import { 
    FaDownload, FaUpload, 
    FaSave, FaMagic, FaUndo, FaSearch
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

// Helper to calculate difference in calendar days between two dates (dateStr1 - dateStr2)
const getDayDifference = (dateStr1, dateStr2) => {
    if (!dateStr1 || !dateStr2) return 0;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// 10 Standard Active Production Stages in Chronological Order
const STAGE_ORDER = [
    { key: 'WoodIssue', inKey: 'WoodIssueIn', outKey: 'WoodIssueOut', daysKey: 'WoodIssueDays', label: 'Wood Issue' },
    { key: 'PreCutting', inKey: 'PreCuttingIn', outKey: 'PreCuttingOut', daysKey: 'PreCuttingDays', label: 'Pre Cutting' },
    { key: 'Machining', inKey: 'MachiningIn', outKey: 'MachiningOut', daysKey: 'MachiningDays', label: 'Machining' },
    { key: 'Assembly', inKey: 'AssemblyIn', outKey: 'AssemblyOut', daysKey: 'AssemblyDays', label: 'Assembly' },
    { key: 'Sanding', inKey: 'SandingIn', outKey: 'SandingOut', daysKey: 'SandingDays', label: 'Sanding' },
    { key: 'Polish', inKey: 'PolishIn', outKey: 'PolishOut', daysKey: 'PolishDays', label: 'Polish' },
    { key: 'Fitting', inKey: 'FittingIn', outKey: 'FittingOut', daysKey: 'FittingDays', label: 'Fitting' },
    { key: 'Qc', inKey: 'QcIn', outKey: 'QcOut', daysKey: 'QcDays', label: 'QC' },
    { key: 'FinalQc', inKey: 'FinalQcIn', outKey: 'FinalQcOut', daysKey: 'FinalQcDays', label: 'Final QC' },
    { key: 'Packing', inKey: 'PackingIn', outKey: 'PackingOut', daysKey: 'PackingDays', label: 'Packing' },
];

// 32 Editable columns specification for desktop keyboard navigation (Arrow keys, Tab, Enter, Ctrl+D)
const EDITABLE_COLS = [
    // Col 0: Target Date
    { key: 'InspectionDate', label: 'Insp Date', isDate: true },

    // Cols 1 to 11: Department Days
    { key: 'WoodIssueDays', label: 'Wood Days', isDay: true },
    { key: 'PreCuttingDays', label: 'PreCut Days', isDay: true },
    { key: 'OutSourceDays', label: 'OutSrc Days', isDay: true, isInfo: true },
    { key: 'MachiningDays', label: 'Mach Days', isDay: true },
    { key: 'AssemblyDays', label: 'Assem Days', isDay: true },
    { key: 'SandingDays', label: 'Sand Days', isDay: true },
    { key: 'PolishDays', label: 'Polish Days', isDay: true },
    { key: 'FittingDays', label: 'Fit Days', isDay: true },
    { key: 'QcDays', label: 'QC Days', isDay: true },
    { key: 'FinalQcDays', label: 'FinalQC Days', isDay: true },
    { key: 'PackingDays', label: 'Pack Days', isDay: true },

    // Cols 12 to 31: Department Dates (10 stages IN & OUT)
    { key: 'WoodIssueIn', label: 'Wood IN', isDate: true },
    { key: 'WoodIssueOut', label: 'Wood OUT', isDate: true },
    { key: 'PreCuttingIn', label: 'PreCut IN', isDate: true },
    { key: 'PreCuttingOut', label: 'PreCut OUT', isDate: true },
    { key: 'MachiningIn', label: 'Mach IN', isDate: true },
    { key: 'MachiningOut', label: 'Mach OUT', isDate: true },
    { key: 'AssemblyIn', label: 'Assem IN', isDate: true },
    { key: 'AssemblyOut', label: 'Assem OUT', isDate: true },
    { key: 'SandingIn', label: 'Sand IN', isDate: true },
    { key: 'SandingOut', label: 'Sand OUT', isDate: true },
    { key: 'PolishIn', label: 'Polish IN', isDate: true },
    { key: 'PolishOut', label: 'Polish OUT', isDate: true },
    { key: 'FittingIn', label: 'Fit IN', isDate: true },
    { key: 'FittingOut', label: 'Fit OUT', isDate: true },
    { key: 'QcIn', label: 'QC IN', isDate: true },
    { key: 'QcOut', label: 'QC OUT', isDate: true },
    { key: 'FinalQcIn', label: 'FinalQC IN', isDate: true },
    { key: 'FinalQcOut', label: 'FinalQC OUT', isDate: true },
    { key: 'PackingIn', label: 'Pack IN', isDate: true },
    { key: 'PackingOut', label: 'Pack OUT', isDate: true },
];

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
                    WoodIssueIn: saved.WoodIssueIn ? String(saved.WoodIssueIn).split('T')[0] : null,
                    WoodIssueOut: saved.WoodIssueOut ? String(saved.WoodIssueOut).split('T')[0] : null,
                    PreCuttingIn: saved.PreCuttingIn ? String(saved.PreCuttingIn).split('T')[0] : null,
                    PreCuttingOut: saved.PreCuttingOut ? String(saved.PreCuttingOut).split('T')[0] : null,
                    MachiningIn: saved.MachiningIn ? String(saved.MachiningIn).split('T')[0] : null,
                    MachiningOut: saved.MachiningOut ? String(saved.MachiningOut).split('T')[0] : null,
                    AssemblyIn: saved.AssemblyIn ? String(saved.AssemblyIn).split('T')[0] : null,
                    AssemblyOut: saved.AssemblyOut ? String(saved.AssemblyOut).split('T')[0] : null,
                    SandingIn: saved.SandingIn ? String(saved.SandingIn).split('T')[0] : null,
                    SandingOut: saved.SandingOut ? String(saved.SandingOut).split('T')[0] : null,
                    PolishIn: saved.PolishIn ? String(saved.PolishIn).split('T')[0] : null,
                    PolishOut: saved.PolishOut ? String(saved.PolishOut).split('T')[0] : null,
                    FittingIn: saved.FittingIn ? String(saved.FittingIn).split('T')[0] : null,
                    FittingOut: saved.FittingOut ? String(saved.FittingOut).split('T')[0] : null,
                    QcIn: saved.QcIn ? String(saved.QcIn).split('T')[0] : null,
                    QcOut: saved.QcOut ? String(saved.QcOut).split('T')[0] : null,
                    FinalQcIn: saved.FinalQcIn ? String(saved.FinalQcIn).split('T')[0] : null,
                    FinalQcOut: saved.FinalQcOut ? String(saved.FinalQcOut).split('T')[0] : null,
                    PackingIn: saved.PackingIn ? String(saved.PackingIn).split('T')[0] : null,
                    PackingOut: saved.PackingOut ? String(saved.PackingOut).split('T')[0] : null,
                };

                return calculateScheduleFromDays(initialObj);
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
     * Scheduling Engine (Days -> Dates):
     * Reverse schedules from InspectionDate to determine WoodIssueIn,
     * then cascades forward through all 10 stages with +1 day buffer.
     * OUT SOURCE JOB days are added to TotalLeadDays as requested,
     * but strictly excluded from stage date cascades (dates remain unaffected).
     */
    const calculateScheduleFromDays = (item) => {
        const woodDays = parseInt(item.WoodIssueDays, 10) || 0;
        const preCutDays = parseInt(item.PreCuttingDays, 10) || 0;
        const outSourceDays = parseInt(item.OutSourceDays, 10) || 0;
        const machDays = parseInt(item.MachiningDays, 10) || 0;
        const assemDays = parseInt(item.AssemblyDays, 10) || 0;
        const sandDays = parseInt(item.SandingDays, 10) || 0;
        const polishDays = parseInt(item.PolishDays, 10) || 0;
        const fitDays = parseInt(item.FittingDays, 10) || 0;
        const qcDays = parseInt(item.QcDays, 10) || 0;
        const finalQcDays = parseInt(item.FinalQcDays, 10) || 0;
        const packDays = parseInt(item.PackingDays, 10) || 0;

        // Internal production lead days used ONLY for stage date cascading & reverse scheduling (strictly excludes OutSourceDays so dates are NOT affected):
        const productionLeadDays = woodDays + preCutDays + machDays + assemDays + sandDays + 
                              polishDays + fitDays + qcDays + finalQcDays + packDays;

        // Total Lead Days displayed in the Total column before dates (includes OutSourceDays as requested):
        const totalLeadDays = productionLeadDays + outSourceDays;

        const inspectionDate = item.InspectionDate ? String(item.InspectionDate).split('T')[0] : null;

        let woodIssueIn = item.WoodIssueIn ? String(item.WoodIssueIn).split('T')[0] : null;

        // Reverse scheduling: Wood Issue IN = InspectionDate - productionLeadDays
        // (Dates par koi farak nahi padega - Outsource days is NOT subtracted from InspectionDate!)
        if (inspectionDate && productionLeadDays > 0) {
            if (!woodIssueIn) {
                woodIssueIn = addDays(inspectionDate, -productionLeadDays);
            }
        }

        let woodIssueOut = null;
        let preCutIn = null, preCutOut = null;
        let machIn = null, machOut = null;
        let assemIn = null, assemOut = null;
        let sandIn = null, sandOut = null;
        let polishIn = null, polishOut = null;
        let fitIn = null, fitOut = null;
        let qcIn = null, qcOut = null;
        let finalQcIn = null, finalQcOut = null;
        let packIn = null, packOut = null;

        if (woodIssueIn) {
            woodIssueOut = addDays(woodIssueIn, woodDays);

            // Forward cascades (+1 day buffer for each department transition)
            preCutIn = addDays(woodIssueOut, 1);
            preCutOut = addDays(preCutIn, preCutDays);

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
        }

        let daysWithBuffer = 0;
        if (packOut && woodIssueIn) {
            daysWithBuffer = getDayDifference(packOut, woodIssueIn);
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
            IsDeadlineExceeded: false,
            OverdueDays: 0,
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

    // Handle single day input change with validation (re-computes dates)
    const handleDayChange = (itemKey, field, value) => {
        const val = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
        setPlanItems(prev => prev.map(p => {
            if (p.ContainerMasterLId === itemKey) {
                return calculateScheduleFromDays({ ...p, [field]: val });
            }
            return p;
        }));
    };

    /**
     * Smart Bi-Directional Date Cell Change Handler:
     * Allows user to change dates freely!
     * Automatically matches Days = (Date OUT - Date IN),
     * cascades forward with +1 day buffer, and recalculates Total Lead Days
     * (keeping OUT SOURCE JOB completely out of lead calculation).
     */
    const handleDateCellChange = (itemKey, fieldKey, newDateValue) => {
        setPlanItems(prev => prev.map(p => {
            if (p.ContainerMasterLId !== itemKey) return p;

            const val = newDateValue ? String(newDateValue).split('T')[0] : null;
            let updated = { ...p, [fieldKey]: val };

            // 1. If user changes Target Inspection Date:
            if (fieldKey === 'InspectionDate') {
                const prodDays = 
                    (parseInt(updated.WoodIssueDays, 10) || 0) +
                    (parseInt(updated.PreCuttingDays, 10) || 0) +
                    (parseInt(updated.MachiningDays, 10) || 0) +
                    (parseInt(updated.AssemblyDays, 10) || 0) +
                    (parseInt(updated.SandingDays, 10) || 0) +
                    (parseInt(updated.PolishDays, 10) || 0) +
                    (parseInt(updated.FittingDays, 10) || 0) +
                    (parseInt(updated.QcDays, 10) || 0) +
                    (parseInt(updated.FinalQcDays, 10) || 0) +
                    (parseInt(updated.PackingDays, 10) || 0);

                if (val && prodDays > 0) {
                    updated.WoodIssueIn = addDays(val, -prodDays);
                }
                return calculateScheduleFromDays(updated);
            }

            // 2. If user changes WoodIssueIn directly:
            if (fieldKey === 'WoodIssueIn') {
                return calculateScheduleFromDays(updated);
            }

            // 3. If user changes any stage OUT date or IN date:
            const changedStageIdx = STAGE_ORDER.findIndex(
                s => s.inKey === fieldKey || s.outKey === fieldKey
            );

            if (changedStageIdx >= 0) {
                const currentStage = STAGE_ORDER[changedStageIdx];
                const isOutField = currentStage.outKey === fieldKey;

                if (isOutField) {
                    // User edited OUT date: Match days = OUT - IN
                    if (val && updated[currentStage.inKey]) {
                        const daysDiff = getDayDifference(val, updated[currentStage.inKey]);
                        updated[currentStage.daysKey] = Math.max(0, daysDiff);
                    }
                } else {
                    // User edited IN date:
                    if (val && updated[currentStage.outKey] && val <= updated[currentStage.outKey]) {
                        const daysDiff = getDayDifference(updated[currentStage.outKey], val);
                        updated[currentStage.daysKey] = Math.max(0, daysDiff);
                    } else if (val) {
                        updated[currentStage.outKey] = addDays(val, updated[currentStage.daysKey]);
                    }
                }

                // Cascade forward to all subsequent stages (+1 day buffer)
                let prevOut = updated[currentStage.outKey];
                for (let i = changedStageIdx + 1; i < STAGE_ORDER.length; i++) {
                    const stage = STAGE_ORDER[i];
                    if (prevOut) {
                        updated[stage.inKey] = addDays(prevOut, 1);
                        updated[stage.outKey] = addDays(updated[stage.inKey], updated[stage.daysKey]);
                        prevOut = updated[stage.outKey];
                    }
                }

                // Re-calculate total days (INCLUDES OutSourceDays in total lead days, dates unaffected)
                const prodTotal = 
                    (parseInt(updated.WoodIssueDays, 10) || 0) +
                    (parseInt(updated.PreCuttingDays, 10) || 0) +
                    (parseInt(updated.MachiningDays, 10) || 0) +
                    (parseInt(updated.AssemblyDays, 10) || 0) +
                    (parseInt(updated.SandingDays, 10) || 0) +
                    (parseInt(updated.PolishDays, 10) || 0) +
                    (parseInt(updated.FittingDays, 10) || 0) +
                    (parseInt(updated.QcDays, 10) || 0) +
                    (parseInt(updated.FinalQcDays, 10) || 0) +
                    (parseInt(updated.PackingDays, 10) || 0);

                const outSourceDays = parseInt(updated.OutSourceDays, 10) || 0;
                updated.TotalLeadDays = prodTotal + outSourceDays;

                if (updated.PackingOut && updated.WoodIssueIn) {
                    updated.DaysWithBuffer = getDayDifference(updated.PackingOut, updated.WoodIssueIn);
                }
                updated.OverdueDays = 0;
                updated.IsDeadlineExceeded = false;

                return updated;
            }

            return calculateScheduleFromDays(updated);
        }));
    };

    // Keyboard cell focusing helper
    const focusCell = (r, c) => {
        const el = document.getElementById(`cell-${r}-${c}`);
        if (el) {
            el.focus();
            if (el.select) {
                el.select();
            }
        }
    };

    // Comprehensive Keyboard Navigation (Excel-style across all 32 editable columns)
    const handleCellKeyDown = (e, rowIdx, colIdx, totalRows) => {
        // Ctrl + S: Save Plan
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            handleSavePlan();
            return;
        }

        // Ctrl + D: Fill Down (copies value from cell directly above)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            if (rowIdx > 0) {
                const colDef = EDITABLE_COLS[colIdx];
                const prevRowItem = filteredItems[rowIdx - 1];
                if (prevRowItem && filteredItems[rowIdx]) {
                    const prevVal = prevRowItem[colDef.key];
                    if (colDef.isDate) {
                        handleDateCellChange(filteredItems[rowIdx].ContainerMasterLId, colDef.key, prevVal);
                    } else {
                        handleDayChange(filteredItems[rowIdx].ContainerMasterLId, colDef.key, prevVal);
                    }
                }
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (rowIdx < totalRows - 1) {
                focusCell(rowIdx + 1, colIdx);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (rowIdx > 0) {
                focusCell(rowIdx - 1, colIdx);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                if (rowIdx > 0) focusCell(rowIdx - 1, colIdx);
            } else {
                if (rowIdx < totalRows - 1) focusCell(rowIdx + 1, colIdx);
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                if (colIdx > 0) {
                    focusCell(rowIdx, colIdx - 1);
                } else if (rowIdx > 0) {
                    focusCell(rowIdx - 1, EDITABLE_COLS.length - 1);
                }
            } else {
                if (colIdx < EDITABLE_COLS.length - 1) {
                    focusCell(rowIdx, colIdx + 1);
                } else if (rowIdx < totalRows - 1) {
                    focusCell(rowIdx + 1, 0);
                }
            }
        } else if (e.key === 'ArrowLeft') {
            const valLen = e.target.value ? e.target.value.length : 0;
            const isSelected = e.target.selectionStart === 0 && e.target.selectionEnd === valLen;
            const isAtStart = e.target.selectionStart === 0 && e.target.selectionEnd === 0;
            if ((isSelected || isAtStart) && colIdx > 0) {
                e.preventDefault();
                focusCell(rowIdx, colIdx - 1);
            }
        } else if (e.key === 'ArrowRight') {
            const valLen = e.target.value ? e.target.value.length : 0;
            const isSelected = e.target.selectionStart === 0 && e.target.selectionEnd === valLen;
            const isAtEnd = e.target.selectionStart === valLen;
            if ((isSelected || isAtEnd) && colIdx < EDITABLE_COLS.length - 1) {
                e.preventDefault();
                focusCell(rowIdx, colIdx + 1);
            }
        }
    };

    // Smart Action: Copy Row 1 Lead Times to ALL Rows
    const handleCopyRow1ToAll = () => {
        if (planItems.length === 0) return;
        const row1 = planItems[0];
        const confirmation = window.confirm(
            `Apply Row 1 lead times to ALL ${planItems.length} items across all shipments?`
        );
        if (!confirmation) return;

        const updated = planItems.map(item => calculateScheduleFromDays({
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

    // Excel Upload Handler: Direct inline update into the table!
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
                            const outSourceDays = parseInt(row[8], 10) || 0; // Excluded from calculation
                            const machDays = parseInt(row[9], 10) || 0;
                            const assemDays = parseInt(row[10], 10) || 0;
                            const sandDays = parseInt(row[11], 10) || 0;
                            const polishDays = parseInt(row[12], 10) || 0;
                            const fitDays = parseInt(row[13], 10) || 0;
                            const qcDays = parseInt(row[14], 10) || 0;
                            const finalQcDays = parseInt(row[15], 10) || 0;
                            const packDays = parseInt(row[16], 10) || 0;

                            const woodIn = row[18] ? String(row[18]).trim().split('T')[0] : item.WoodIssueIn;

                            return calculateScheduleFromDays({
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
                                WoodIssueIn: woodIn,
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
        e.target.value = '';
    };

    /**
     * Save ALL selected shipments plan to backend in ONE JSON POST
     * Strict Rule: OUT SOURCE JOB is kept OUT of total lead days and timeline calculation.
     * All days are verified against date differences before saving.
     */
    const handleSavePlan = async () => {
        if (!planItems || planItems.length === 0) {
            toast.warn('No items to save.');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
            const userId = localStorage.getItem('userId') || '0';
            const url = `${API_WEB_URLS.BASE}ShipmentPlanning/SavePlan/${userId}/token`;

            const payloadData = planItems.map(item => {
                // Ensure days match dates if both IN and OUT are set
                const wood = (item.WoodIssueIn && item.WoodIssueOut) 
                    ? Math.max(0, getDayDifference(item.WoodIssueOut, item.WoodIssueIn))
                    : (parseInt(item.WoodIssueDays, 10) || 0);

                const preCut = (item.PreCuttingIn && item.PreCuttingOut)
                    ? Math.max(0, getDayDifference(item.PreCuttingOut, item.PreCuttingIn))
                    : (parseInt(item.PreCuttingDays, 10) || 0);

                const outSource = parseInt(item.OutSourceDays, 10) || 0; // Strictly informational

                const mach = (item.MachiningIn && item.MachiningOut)
                    ? Math.max(0, getDayDifference(item.MachiningOut, item.MachiningIn))
                    : (parseInt(item.MachiningDays, 10) || 0);

                const assem = (item.AssemblyIn && item.AssemblyOut)
                    ? Math.max(0, getDayDifference(item.AssemblyOut, item.AssemblyIn))
                    : (parseInt(item.AssemblyDays, 10) || 0);

                const sand = (item.SandingIn && item.SandingOut)
                    ? Math.max(0, getDayDifference(item.SandingOut, item.SandingIn))
                    : (parseInt(item.SandingDays, 10) || 0);

                const polish = (item.PolishIn && item.PolishOut)
                    ? Math.max(0, getDayDifference(item.PolishOut, item.PolishIn))
                    : (parseInt(item.PolishDays, 10) || 0);

                const fit = (item.FittingIn && item.FittingOut)
                    ? Math.max(0, getDayDifference(item.FittingOut, item.FittingIn))
                    : (parseInt(item.FittingDays, 10) || 0);

                const qc = (item.QcIn && item.QcOut)
                    ? Math.max(0, getDayDifference(item.QcOut, item.QcIn))
                    : (parseInt(item.QcDays, 10) || 0);

                const finalQc = (item.FinalQcIn && item.FinalQcOut)
                    ? Math.max(0, getDayDifference(item.FinalQcOut, item.FinalQcIn))
                    : (parseInt(item.FinalQcDays, 10) || 0);

                const pack = (item.PackingIn && item.PackingOut)
                    ? Math.max(0, getDayDifference(item.PackingOut, item.PackingIn))
                    : (parseInt(item.PackingDays, 10) || 0);

                // TOTAL LEAD DAYS INCLUDES OutSourceDays as requested, dates unaffected
                const totalLead = wood + preCut + outSource + mach + assem + sand + polish + fit + qc + finalQc + pack;

                let daysWithBuffer = 0;
                if (item.PackingOut && item.WoodIssueIn) {
                    daysWithBuffer = getDayDifference(item.PackingOut, item.WoodIssueIn);
                }

                return {
                    ContainerMasterLId: item.ContainerMasterLId,
                    ContainerId: item.ContainerId,
                    WoodIssueDays: wood,
                    PreCuttingDays: preCut,
                    OutSourceDays: outSource,
                    MachiningDays: mach,
                    AssemblyDays: assem,
                    SandingDays: sand,
                    PolishDays: polish,
                    FittingDays: fit,
                    QcDays: qc,
                    FinalQcDays: finalQc,
                    PackingDays: pack,
                    TotalLeadDays: totalLead,
                    DaysWithBuffer: daysWithBuffer,
                    IsDeadlineExceeded: false,
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
                };
            });

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
        const shipmentsCount = uniqueShipments.length;
        return { total, planned, shipmentsCount };
    }, [planItems, uniqueShipments]);

    return (
        <Modal show={show} onHide={onHide} size="fullscreen" centered className="desktop-planning-modal">
            {/* Embedded styles for desktop keyboard traversing & active cell highlight */}
            <style>{`
                .desktop-cell-input:focus {
                    outline: 2px solid #2563eb !important;
                    background-color: #eff6ff !important;
                    font-weight: 600;
                    box-shadow: 0 0 4px rgba(37,99,235,0.4);
                }
                .desktop-cell-input {
                    transition: outline 0.1s ease-in-out;
                }
            `}</style>

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
                                Desktop Grid Data Entry | Selected Shipments: <strong style={{ color: '#e2e8f0' }}>{stats.shipmentsCount}</strong> ({stats.total} total items)
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
                                        title="Save Plan (Ctrl + S)"
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

                        {/* Desktop ERP Unified Data Grid (Show & Edit in Same Table with Arrow Traversal) */}
                        <div 
                            style={{ 
                                background: '#fff', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '4px', 
                                maxHeight: 'calc(100vh - 200px)', 
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
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '105px' }}>Insp Date</th>
                                        
                                        {/* Department Days Group (ColSpan 11) */}
                                        <th colSpan="11" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>
                                            Department Lead Times (Days)
                                        </th>
                                        
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '50px', backgroundColor: '#f1f5f9' }}>Total</th>

                                        {/* 10 Department Stage Dates (IN & OUT) */}
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Wood Issue</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Pre Cutting</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Machining</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Assembly</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Sanding</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Polish</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Fitting</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>QC</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Final QC</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Packing</th>

                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '55px', backgroundColor: '#f1f5f9' }}>Buffer</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '75px', backgroundColor: '#f1f5f9' }}>Status</th>
                                    </tr>

                                    {/* Level 2 Subheaders */}
                                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px' }}>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Wood</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>PreCut</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '45px' }} title="Outsource Days (Included in Total Days, dates unaffected)">OutSrc</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Mach</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Assem</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Sand</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Polish</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Fit</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>QC</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '45px' }}>FinalQC</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '42px' }}>Pack</th>

                                        {/* 10 Stages IN / OUT Headers */}
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', minWidth: '95px' }}>OUT</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="41" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                No items match your filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item, idx) => {
                                            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

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

                                                    {/* Inspection Date Cell (Col Index 0) */}
                                                    <td style={{ border: '1px solid #e2e8f0', padding: '1px 2px' }}>
                                                        <input 
                                                            id={`cell-${idx}-0`}
                                                            type="date"
                                                            value={item.InspectionDate ? String(item.InspectionDate).split('T')[0] : ''}
                                                            onChange={e => handleDateCellChange(item.ContainerMasterLId, 'InspectionDate', e.target.value)}
                                                            onFocus={e => e.target.select()}
                                                            onKeyDown={e => handleCellKeyDown(e, idx, 0, filteredItems.length)}
                                                            className="desktop-cell-input"
                                                            style={{ 
                                                                width: '100%', 
                                                                minWidth: '95px',
                                                                height: '22px', 
                                                                fontSize: '11px', 
                                                                border: '1px solid #cbd5e1', 
                                                                borderRadius: '2px',
                                                                padding: '1px 2px',
                                                                backgroundColor: '#fff',
                                                                textAlign: 'center'
                                                            }}
                                                            title="Target Inspection Date"
                                                        />
                                                    </td>

                                                    {/* Department Inputs: Wood to Pack (Col Indices 1 to 11) */}
                                                    {EDITABLE_COLS.slice(1, 12).map((dept, deptIdx) => {
                                                        const colIdx = deptIdx + 1; // 1 to 11
                                                        return (
                                                            <td key={dept.key} style={{ border: '1px solid #e2e8f0', padding: '1px 2px' }}>
                                                                <input 
                                                                    id={`cell-${idx}-${colIdx}`}
                                                                    type="number"
                                                                    min="0"
                                                                    value={item[dept.key] === 0 ? 0 : item[dept.key]}
                                                                    onChange={e => handleDayChange(item.ContainerMasterLId, dept.key, e.target.value)}
                                                                    onFocus={e => e.target.select()}
                                                                    onKeyDown={e => handleCellKeyDown(e, idx, colIdx, filteredItems.length)}
                                                                    className="desktop-cell-input"
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        height: '22px', 
                                                                        textAlign: 'center', 
                                                                        fontSize: '11px', 
                                                                        border: '1px solid #cbd5e1', 
                                                                        borderRadius: '2px',
                                                                        backgroundColor: '#fff',
                                                                        color: '#0f172a'
                                                                    }}
                                                                    title={dept.key === 'OutSourceDays' ? 'Outsource Days (Included in Total Days - dates unaffected)' : dept.label}
                                                                />
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Computed Output Total Days */}
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                                                        {item.TotalLeadDays}d
                                                    </td>

                                                    {/* Department Date Inputs (Col Indices 12 to 31) */}
                                                    {EDITABLE_COLS.slice(12).map((dateCol, dateIdx) => {
                                                        const colIdx = dateIdx + 12; // 12 to 31
                                                        const rawVal = item[dateCol.key];
                                                        const dateVal = rawVal ? String(rawVal).split('T')[0] : '';
                                                        return (
                                                            <td key={dateCol.key} style={{ border: '1px solid #e2e8f0', padding: '1px 2px' }}>
                                                                <input 
                                                                    id={`cell-${idx}-${colIdx}`}
                                                                    type="date"
                                                                    value={dateVal}
                                                                    onChange={e => handleDateCellChange(item.ContainerMasterLId, dateCol.key, e.target.value)}
                                                                    onFocus={e => e.target.select()}
                                                                    onKeyDown={e => handleCellKeyDown(e, idx, colIdx, filteredItems.length)}
                                                                    className="desktop-cell-input"
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        minWidth: '95px',
                                                                        height: '22px', 
                                                                        fontSize: '11px', 
                                                                        border: '1px solid #cbd5e1', 
                                                                        borderRadius: '2px',
                                                                        padding: '1px 2px',
                                                                        backgroundColor: '#fff',
                                                                        textAlign: 'center'
                                                                    }}
                                                                    title={`${dateCol.label} - Click to change date`}
                                                                />
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Days With Buffer */}
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                                                        {item.DaysWithBuffer ? `${item.DaysWithBuffer}d` : '-'}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td style={{ textAlign: 'center', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                                        {item.TotalLeadDays > 0 ? (
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

            <Modal.Footer style={{ background: '#f8fafc', padding: '6px 16px', borderTop: '1px solid #e2e8f0' }}>
                <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                        ⌨️ <strong>Navigation:</strong> <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Move cells | <kbd>Enter</kbd> Down | <kbd>Tab</kbd> Right | <kbd>Ctrl+D</kbd> Fill Down | <kbd>Ctrl+S</kbd> Save Plan | <em>*Dates &amp; Days match automatically. Outsource days are added in Total Days, dates remain unaffected.</em>
                    </span>
                    <div className="d-flex gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={onHide}
                            style={{ fontSize: '12px', padding: '4px 14px' }}
                        >
                            Close
                        </Button>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={handleSavePlan}
                            disabled={saving || planItems.length === 0}
                            style={{ fontSize: '12px', padding: '4px 18px', fontWeight: 600 }}
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
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default ProductionPlanningModal;
