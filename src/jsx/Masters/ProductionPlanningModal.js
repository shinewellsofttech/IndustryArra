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

// Local Date parser & formatter to avoid UTC offset issues & robustly handle all date formats
const parseLocalDate = (dateInput) => {
    if (!dateInput && dateInput !== 0) return null;
    if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return null;
        return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
    }

    if (typeof dateInput === 'number' && dateInput > 30000 && dateInput < 70000) {
        const utcDate = new Date((dateInput - 25569) * 86400 * 1000);
        return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
    }

    const str = String(dateInput).trim();
    if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;

    if (/^\d{5}$/.test(str)) {
        const num = parseInt(str, 10);
        const utcDate = new Date((num - 25569) * 86400 * 1000);
        return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
    }

    // Remove any time part (e.g., ' 00:00:00' or 'T00:00:00...')
    const datePart = str.split(/[ T]/)[0].trim();

    // Check for YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10);
        const d = parseInt(isoMatch[3], 10);
        if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return new Date(y, m - 1, d);
        }
    }

    // Check for DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (slashMatch) {
        let p1 = parseInt(slashMatch[1], 10);
        let p2 = parseInt(slashMatch[2], 10);
        const y = parseInt(slashMatch[3], 10);

        let m, d;
        // In Indian ERP standard: DD-MM-YYYY / DD/MM/YYYY (Day first, Month second)
        // Only if second part > 12 can it be MM-DD-YYYY (e.g. 05-25-2026)
        if (p2 > 12) {
            m = p1;
            d = p2;
        } else {
            d = p1;
            m = p2;
        }

        if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return new Date(y, m - 1, d);
        }
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    return null;
};

const formatLocalDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const toStandardDateStr = (dateInput) => {
    const d = parseLocalDate(dateInput);
    return d ? formatLocalDate(d) : null;
};

// Check if a date falls on a Sunday (day 0)
const isSunday = (dateInput) => {
    const d = parseLocalDate(dateInput);
    return d ? d.getDay() === 0 : false;
};

// Next working day skipping Sunday (e.g., Sunday -> Monday)
const getNextWorkDay = (dateInput) => {
    let d = parseLocalDate(dateInput);
    if (!d) return null;
    while (d.getDay() === 0) {
        d.setDate(d.getDate() + 1);
    }
    return formatLocalDate(d);
};

// Add or subtract work days, strictly skipping Sundays
const addWorkDays = (dateInput, days) => {
    if (!dateInput) return null;
    const intDays = parseInt(days || 0, 10);
    let d = parseLocalDate(dateInput);
    if (!d) return null;

    if (intDays === 0) {
        return getNextWorkDay(d);
    }

    const step = intDays > 0 ? 1 : -1;
    let added = 0;
    const target = Math.abs(intDays);

    while (added < target) {
        d.setDate(d.getDate() + step);
        if (d.getDay() !== 0) { // Skip Sunday
            added++;
        }
    }
    return formatLocalDate(d);
};

// Inclusive working days count between dateIn and dateOut (strictly excluding Sundays)
// e.g. Mon to Mon = 1 day; Mon to Tue = 2 days; Fri to Mon = 3 days (skipping Sun)
const getWorkDaysCount = (dateOut, dateIn) => {
    if (!dateOut || !dateIn) return 0;
    let d1 = parseLocalDate(dateOut);
    let d2 = parseLocalDate(dateIn);
    if (!d1 || !d2 || d1 < d2) return 0;

    let count = 0;
    const curr = new Date(d2.getTime());
    while (curr <= d1) {
        if (curr.getDay() !== 0) { // Skip Sunday
            count++;
        }
        curr.setDate(curr.getDate() + 1);
    }
    return count;
};

// Forward stage date calculator (Inclusive: Day 1 is stageIn, Day N is stageIn + (days-1) work days)
const getStageOut = (stageIn, days) => {
    if (!stageIn) return null;
    const d = parseInt(days || 0, 10);
    const validIn = getNextWorkDay(stageIn);
    if (d <= 0) return validIn;
    return addWorkDays(validIn, d - 1);
};

// 13 Active Production Stages (including new Component Store, Metal & Upholstery)
const STAGE_ORDER = [
    { key: 'WoodIssue', inKey: 'WoodIssueIn', outKey: 'WoodIssueOut', daysKey: 'WoodIssueDays', label: 'Wood Issue', isSerial: true },
    { key: 'PreCutting', inKey: 'PreCuttingIn', outKey: 'PreCuttingOut', daysKey: 'PreCuttingDays', label: 'Pre Cutting', isSerial: true },
    { key: 'Machining', inKey: 'MachiningIn', outKey: 'MachiningOut', daysKey: 'MachiningDays', label: 'Machining', isSerial: true },
    { key: 'ComponentStore', inKey: 'ComponentStoreIn', outKey: 'ComponentStoreOut', daysKey: 'ComponentStoreDays', label: 'Component Store', isSerial: true },
    { key: 'Assembly', inKey: 'AssemblyIn', outKey: 'AssemblyOut', daysKey: 'AssemblyDays', label: 'Assembly', isSerial: true },
    { key: 'Metal', inKey: 'MetalIn', outKey: 'MetalOut', daysKey: 'MetalDays', label: 'Metal', isSerial: false },
    { key: 'Upholstery', inKey: 'UpholsteryIn', outKey: 'UpholsteryOut', daysKey: 'UpholsteryDays', label: 'Upholstery', isSerial: false },
    { key: 'Sanding', inKey: 'SandingIn', outKey: 'SandingOut', daysKey: 'SandingDays', label: 'Sanding', isSerial: true },
    { key: 'Polish', inKey: 'PolishIn', outKey: 'PolishOut', daysKey: 'PolishDays', label: 'Polish', isSerial: true },
    { key: 'Fitting', inKey: 'FittingIn', outKey: 'FittingOut', daysKey: 'FittingDays', label: 'Fitting', isSerial: true },
    { key: 'Qc', inKey: 'QcIn', outKey: 'QcOut', daysKey: 'QcDays', label: 'QC', isSerial: true },
    { key: 'FinalQc', inKey: 'FinalQcIn', outKey: 'FinalQcOut', daysKey: 'FinalQcDays', label: 'Final QC', isSerial: true },
    { key: 'Packing', inKey: 'PackingIn', outKey: 'PackingOut', daysKey: 'PackingDays', label: 'Packing', isSerial: true },
];

// 41 Editable columns specification for desktop keyboard navigation (Arrow keys, Tab, Enter, Ctrl+D)
const EDITABLE_COLS = [
    // Col 0: Target Date
    { key: 'InspectionDate', label: 'Insp Date', isDate: true, width: '115px' },

    // Cols 1 to 14: Department Days (14 columns)
    { key: 'WoodIssueDays', label: 'Wood Days', isDay: true, width: '54px' },
    { key: 'PreCuttingDays', label: 'PreCut Days', isDay: true, width: '54px' },
    { key: 'OutSourceDays', label: 'OutSrc Days', isDay: true, isInfo: true, width: '54px' },
    { key: 'MachiningDays', label: 'Mach Days', isDay: true, width: '54px' },
    { key: 'ComponentStoreDays', label: 'CompStore Days', isDay: true, width: '72px' },
    { key: 'AssemblyDays', label: 'Assem Days', isDay: true, width: '54px' },
    { key: 'MetalDays', label: 'Metal Days', isDay: true, width: '54px' },
    { key: 'UpholsteryDays', label: 'Upholstery Days', isDay: true, width: '74px' },
    { key: 'SandingDays', label: 'Sand Days', isDay: true, width: '54px' },
    { key: 'PolishDays', label: 'Polish Days', isDay: true, width: '54px' },
    { key: 'FittingDays', label: 'Fit Days', isDay: true, width: '54px' },
    { key: 'QcDays', label: 'QC Days', isDay: true, width: '54px' },
    { key: 'FinalQcDays', label: 'FinalQC Days', isDay: true, width: '64px' },
    { key: 'PackingDays', label: 'Pack Days', isDay: true, width: '54px' },

    // Cols 15 to 40: Department Dates (13 stages IN & OUT = 26 columns)
    { key: 'WoodIssueIn', label: 'Wood IN', isDate: true, width: '115px' },
    { key: 'WoodIssueOut', label: 'Wood OUT', isDate: true, width: '115px' },
    { key: 'PreCuttingIn', label: 'PreCut IN', isDate: true, width: '115px' },
    { key: 'PreCuttingOut', label: 'PreCut OUT', isDate: true, width: '115px' },
    { key: 'MachiningIn', label: 'Mach IN', isDate: true, width: '115px' },
    { key: 'MachiningOut', label: 'Mach OUT', isDate: true, width: '115px' },
    { key: 'ComponentStoreIn', label: 'CompStore IN', isDate: true, width: '115px' },
    { key: 'ComponentStoreOut', label: 'CompStore OUT', isDate: true, width: '115px' },
    { key: 'AssemblyIn', label: 'Assem IN', isDate: true, width: '115px' },
    { key: 'AssemblyOut', label: 'Assem OUT', isDate: true, width: '115px' },
    { key: 'MetalIn', label: 'Metal IN', isDate: true, width: '115px' },
    { key: 'MetalOut', label: 'Metal OUT', isDate: true, width: '115px' },
    { key: 'UpholsteryIn', label: 'Upholstery IN', isDate: true, width: '115px' },
    { key: 'UpholsteryOut', label: 'Upholstery OUT', isDate: true, width: '115px' },
    { key: 'SandingIn', label: 'Sand IN', isDate: true, width: '115px' },
    { key: 'SandingOut', label: 'Sand OUT', isDate: true, width: '115px' },
    { key: 'PolishIn', label: 'Polish IN', isDate: true, width: '115px' },
    { key: 'PolishOut', label: 'Polish OUT', isDate: true, width: '115px' },
    { key: 'FittingIn', label: 'Fit IN', isDate: true, width: '115px' },
    { key: 'FittingOut', label: 'Fit OUT', isDate: true, width: '115px' },
    { key: 'QcIn', label: 'QC IN', isDate: true, width: '115px' },
    { key: 'QcOut', label: 'QC OUT', isDate: true, width: '115px' },
    { key: 'FinalQcIn', label: 'FinalQC IN', isDate: true, width: '115px' },
    { key: 'FinalQcOut', label: 'FinalQC OUT', isDate: true, width: '115px' },
    { key: 'PackingIn', label: 'Pack IN', isDate: true, width: '115px' },
    { key: 'PackingOut', label: 'Pack OUT', isDate: true, width: '115px' },
];

// Helper to reliably retrieve JWT auth token and User ID from authUser/userDetails/localStorage
const getAuthDetails = () => {
    try {
        const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        const userDetails = JSON.parse(localStorage.getItem('userDetails') || '{}');
        
        const token = authUser?.jwtToken || authUser?.token || authUser?.accessToken || authUser?.UserToken || authUser?.UserTokenNew ||
                      userDetails?.idToken || userDetails?.token ||
                      localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('userToken') || localStorage.getItem('jwtToken') || '';

        const userId = authUser?.id || authUser?.Id || authUser?.ID || authUser?.UserId || authUser?.userId ||
                       userDetails?.id || userDetails?.userId ||
                       localStorage.getItem('userId') || '0';

        return {
            token: String(token || '').trim(),
            userId: String(userId || '0').trim()
        };
    } catch (e) {
        return {
            token: String(localStorage.getItem('token') || '').trim(),
            userId: String(localStorage.getItem('userId') || '0').trim()
        };
    }
};

const getAuthHeaders = () => {
    const { token } = getAuthDetails();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {})
    };
};

// Helper to calculate problem status, overdue workdays, and friendly warning descriptions
const enrichProblemStatus = (item) => {
    if (!item) return item;
    const insp = toStandardDateStr(item.InspectionDate);
    const finalQc = toStandardDateStr(item.FinalQcOut);
    const isDelayed = (insp && finalQc) ? (finalQc > insp) : false;
    let overdueDays = 0;
    let errorReason = '';
    if (isDelayed && insp && finalQc) {
        overdueDays = Math.max(1, getWorkDaysCount(finalQc, insp) - 1);
        errorReason = `Final QC (${finalQc}) exceeds Insp Date (${insp}) by ${overdueDays} work day(s)`;
    } else if (!insp) {
        errorReason = 'Missing Inspection Date';
    }
    const hasProblem = isDelayed || !insp;

    return {
        ...item,
        IsFinalQcDelayed: isDelayed,
        IsDeadlineExceeded: isDelayed,
        OverdueDays: overdueDays,
        ErrorReason: errorReason,
        HasProblem: hasProblem,
    };
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
    const [showOnlyProblems, setShowOnlyProblems] = useState(false);

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
            const { userId } = getAuthDetails();

            // Collect unique container IDs
            const containerIds = Array.from(new Set(
                selectedItems.map(i => i.F_ContainerMaster || i.ContainerId).filter(Boolean)
            )).join(',');

            let existingSavedMap = new Map();

            if (containerIds) {
                try {
                    const url = `${API_WEB_URLS.BASE}ShipmentPlanning/GetPlan/0/${userId}/token?containerIds=${containerIds}`;
                    const res = await axios.get(url, {
                        headers: getAuthHeaders()
                    });

                    const isSuccess = Boolean(res.data && (res.data.Success || res.data.success));
                    const planList = res.data?.Data || res.data?.data;

                    if (isSuccess && Array.isArray(planList)) {
                        planList.forEach(savedItem => {
                            const lId = savedItem.ContainerMasterLId || savedItem.containerMasterLId || savedItem.F_ContainerMasterL || savedItem.f_ContainerMasterL;
                            if (lId) {
                                existingSavedMap.set(String(lId), savedItem);
                            }
                        });
                    }
                } catch (fetchErr) {
                    console.warn('Could not fetch existing saved plans from DB, will initialize from selection:', fetchErr);
                }
            }

            // Helper to get property value in either PascalCase or camelCase
            const getVal = (obj, key, fallback = 0) => {
                if (!obj) return fallback;
                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                const camel = key.charAt(0).toLowerCase() + key.slice(1);
                if (obj[camel] !== undefined && obj[camel] !== null) return obj[camel];
                return fallback;
            };

            // Merge selected items with existing saved plans
            const merged = selectedItems.map((item, idx) => {
                const lineId = String(item.F_ContainerMasterL || item.ContainerMasterLId || item.Id || '');
                const rowKey = String(item.F_ContainerMasterL || item.ContainerMasterLId || item.Id || `item-${idx}`);
                const saved = (lineId && existingSavedMap.get(lineId)) || {};

                const initialObj = {
                    _rowKey: rowKey,
                    ContainerMasterLId: parseInt(lineId, 10) || 0,
                    ContainerId: item.F_ContainerMaster || item.ContainerId || getVal(saved, 'ContainerId', 0),
                    ContainerNumber: item.ContainerNumber || getVal(saved, 'ContainerNumber', 'N/A'),
                    ContractNo: item.ContractNo || getVal(saved, 'ContractNo', ''),
                    ItemCode: item.ItemCode || getVal(saved, 'ItemCode', ''),
                    ItemName: item.ItemName || getVal(saved, 'ItemName', ''),
                    Quantity: item.Quantity || getVal(saved, 'Quantity', 0),
                    InspectionDate: toStandardDateStr(item.InspectionDate || getVal(saved, 'InspectionDate', null)),
                    WoodIssueDays: getVal(saved, 'WoodIssueDays', 0),
                    PreCuttingDays: getVal(saved, 'PreCuttingDays', 0),
                    OutSourceDays: getVal(saved, 'OutSourceDays', 0),
                    MachiningDays: getVal(saved, 'MachiningDays', 0),
                    ComponentStoreDays: getVal(saved, 'ComponentStoreDays', 0),
                    AssemblyDays: getVal(saved, 'AssemblyDays', 0),
                    MetalDays: getVal(saved, 'MetalDays', 0),
                    UpholsteryDays: getVal(saved, 'UpholsteryDays', 0),
                    SandingDays: getVal(saved, 'SandingDays', 0),
                    PolishDays: getVal(saved, 'PolishDays', 0),
                    FittingDays: getVal(saved, 'FittingDays', 0),
                    QcDays: getVal(saved, 'QcDays', 0),
                    FinalQcDays: getVal(saved, 'FinalQcDays', 0),
                    PackingDays: getVal(saved, 'PackingDays', 0),
                    WoodIssueIn: toStandardDateStr(getVal(saved, 'WoodIssueIn', null)),
                    WoodIssueOut: toStandardDateStr(getVal(saved, 'WoodIssueOut', null)),
                    PreCuttingIn: toStandardDateStr(getVal(saved, 'PreCuttingIn', null)),
                    PreCuttingOut: toStandardDateStr(getVal(saved, 'PreCuttingOut', null)),
                    MachiningIn: toStandardDateStr(getVal(saved, 'MachiningIn', null)),
                    MachiningOut: toStandardDateStr(getVal(saved, 'MachiningOut', null)),
                    ComponentStoreIn: toStandardDateStr(getVal(saved, 'ComponentStoreIn', null)),
                    ComponentStoreOut: toStandardDateStr(getVal(saved, 'ComponentStoreOut', null)),
                    AssemblyIn: toStandardDateStr(getVal(saved, 'AssemblyIn', null)),
                    AssemblyOut: toStandardDateStr(getVal(saved, 'AssemblyOut', null)),
                    MetalIn: toStandardDateStr(getVal(saved, 'MetalIn', null)),
                    MetalOut: toStandardDateStr(getVal(saved, 'MetalOut', null)),
                    UpholsteryIn: toStandardDateStr(getVal(saved, 'UpholsteryIn', null)),
                    UpholsteryOut: toStandardDateStr(getVal(saved, 'UpholsteryOut', null)),
                    SandingIn: toStandardDateStr(getVal(saved, 'SandingIn', null)),
                    SandingOut: toStandardDateStr(getVal(saved, 'SandingOut', null)),
                    PolishIn: toStandardDateStr(getVal(saved, 'PolishIn', null)),
                    PolishOut: toStandardDateStr(getVal(saved, 'PolishOut', null)),
                    FittingIn: toStandardDateStr(getVal(saved, 'FittingIn', null)),
                    FittingOut: toStandardDateStr(getVal(saved, 'FittingOut', null)),
                    QcIn: toStandardDateStr(getVal(saved, 'QcIn', null)),
                    QcOut: toStandardDateStr(getVal(saved, 'QcOut', null)),
                    FinalQcIn: toStandardDateStr(getVal(saved, 'FinalQcIn', null)),
                    FinalQcOut: toStandardDateStr(getVal(saved, 'FinalQcOut', null)),
                    PackingIn: toStandardDateStr(getVal(saved, 'PackingIn', null)),
                    PackingOut: toStandardDateStr(getVal(saved, 'PackingOut', null)),
                    IsManualWoodIssueIn: false,
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
     * - Strictly skips Sundays when scheduling all stage dates.
     * - Enforces rule: FinalQcOut <= InspectionDate!
     * - Reverse schedules all 10 stages up to Final QC from InspectionDate (or previous workday if Sunday).
     * - Forward schedules Packing after Final QC.
     * - Schedules parallel stages (Metal & Upholstery) in parallel, merging at Fitting.
     * - OUT SOURCE JOB days are added to TotalLeadDays as requested,
     *   but strictly excluded from stage date cascades (dates remain unaffected).
     */
    const calculateScheduleFromDays = (item) => {
        const parseDays = (v) => (v === '' || v === null || v === undefined) ? 0 : (parseInt(v, 10) || 0);

        const woodDays = parseDays(item.WoodIssueDays);
        const preCutDays = parseDays(item.PreCuttingDays);
        const outSourceDays = parseDays(item.OutSourceDays);
        const machDays = parseDays(item.MachiningDays);
        const compStoreDays = parseDays(item.ComponentStoreDays);
        const assemDays = parseDays(item.AssemblyDays);
        const metalDays = parseDays(item.MetalDays);
        const upholsteryDays = parseDays(item.UpholsteryDays);
        const sandDays = parseDays(item.SandingDays);
        const polishDays = parseDays(item.PolishDays);
        const fitDays = parseDays(item.FittingDays);
        const qcDays = parseDays(item.QcDays);
        const finalQcDays = parseDays(item.FinalQcDays);
        const packDays = parseDays(item.PackingDays);

        // Serial production lead days (strictly excludes OutSourceDays and parallel Metal/Upholstery):
        const serialProductionDays = woodDays + preCutDays + machDays + compStoreDays + assemDays + sandDays + 
                                     polishDays + fitDays + qcDays + finalQcDays + packDays;

        // Total Lead Days displayed in the Total column before dates (includes OutSourceDays as requested):
        const totalLeadDays = serialProductionDays + outSourceDays;

        const inspectionDate = toStandardDateStr(item.InspectionDate);
        const woodIssueInAnchor = toStandardDateStr(item.WoodIssueIn);

        let woodIssueIn = null, woodIssueOut = null;
        let preCutIn = null, preCutOut = null;
        let machIn = null, machOut = null;
        let compStoreIn = null, compStoreOut = null;
        let assemIn = null, assemOut = null;
        let sandIn = null, sandOut = null;
        let polishIn = null, polishOut = null;
        let fitIn = null, fitOut = null;
        let qcIn = null, qcOut = null;
        let finalQcIn = null, finalQcOut = null;
        let packIn = null, packOut = null;
        let metalIn = null, metalOut = null;
        let upholsteryIn = null, upholsteryOut = null;

        // Core Formula: WoodIssue In Date = Inspection Date - Total Days (skipping Sundays)
        if (item.IsManualWoodIssueIn && woodIssueInAnchor) {
            woodIssueIn = getNextWorkDay(woodIssueInAnchor);
        } else if (inspectionDate) {
            woodIssueIn = addWorkDays(inspectionDate, -totalLeadDays);
        } else if (woodIssueInAnchor) {
            woodIssueIn = getNextWorkDay(woodIssueInAnchor);
        }

        if (woodIssueIn) {
            woodIssueOut = getStageOut(woodIssueIn, woodDays);

            preCutIn = preCutDays > 0 ? addWorkDays(woodIssueOut, 1) : woodIssueOut;
            preCutOut = getStageOut(preCutIn, preCutDays);

            // Machine IN Date = Precutting OUT Date + No of Outsource days (skipping Sunday)
            const outSourceGap = outSourceDays > 0 ? outSourceDays : 1;
            machIn = machDays > 0 ? addWorkDays(preCutOut, outSourceGap) : preCutOut;
            machOut = getStageOut(machIn, machDays);

            compStoreIn = compStoreDays > 0 ? addWorkDays(machOut, 1) : machOut;
            compStoreOut = getStageOut(compStoreIn, compStoreDays);

            assemIn = assemDays > 0 ? addWorkDays(compStoreOut, 1) : compStoreOut;
            assemOut = getStageOut(assemIn, assemDays);

            // Parallel branches:
            // 1. Metal start date = Machine start date
            metalIn = machIn;
            metalOut = getStageOut(metalIn, metalDays);

            // 2. Upholstery start date = Assembly start date
            upholsteryIn = assemIn;
            upholsteryOut = getStageOut(upholsteryIn, upholsteryDays);

            sandIn = sandDays > 0 ? addWorkDays(assemOut, 1) : assemOut;
            sandOut = getStageOut(sandIn, sandDays);

            polishIn = polishDays > 0 ? addWorkDays(sandOut, 1) : sandOut;
            polishOut = getStageOut(polishIn, polishDays);

            fitIn = fitDays > 0 ? addWorkDays(polishOut, 1) : polishOut;
            fitOut = getStageOut(fitIn, fitDays);

            qcIn = qcDays > 0 ? addWorkDays(fitOut, 1) : fitOut;
            qcOut = getStageOut(qcIn, qcDays);

            finalQcIn = finalQcDays > 0 ? addWorkDays(qcOut, 1) : qcOut;
            finalQcOut = getStageOut(finalQcIn, finalQcDays);

            packIn = packDays > 0 ? addWorkDays(finalQcOut, 1) : finalQcOut;
            packOut = getStageOut(packIn, packDays);
        }

        let daysWithBuffer = 0;
        if (packOut && woodIssueIn) {
            daysWithBuffer = getWorkDaysCount(packOut, woodIssueIn);
        }

        const isFinalQcDelayed = (inspectionDate && finalQcOut) ? (finalQcOut > inspectionDate) : false;
        let overdueDays = 0;
        let errorReason = '';
        if (isFinalQcDelayed && inspectionDate && finalQcOut) {
            overdueDays = Math.max(1, getWorkDaysCount(finalQcOut, inspectionDate) - 1);
            errorReason = `Final QC (${finalQcOut}) exceeds Insp Date (${inspectionDate}) by ${overdueDays} work day(s)`;
        } else if (!inspectionDate) {
            errorReason = 'Missing Inspection Date';
        }
        const hasProblem = isFinalQcDelayed || !inspectionDate;

        return {
            ...item,
            WoodIssueDays: item.WoodIssueDays === '' ? '' : woodDays,
            PreCuttingDays: item.PreCuttingDays === '' ? '' : preCutDays,
            OutSourceDays: item.OutSourceDays === '' ? '' : outSourceDays,
            MachiningDays: item.MachiningDays === '' ? '' : machDays,
            ComponentStoreDays: item.ComponentStoreDays === '' ? '' : compStoreDays,
            AssemblyDays: item.AssemblyDays === '' ? '' : assemDays,
            MetalDays: item.MetalDays === '' ? '' : metalDays,
            UpholsteryDays: item.UpholsteryDays === '' ? '' : upholsteryDays,
            SandingDays: item.SandingDays === '' ? '' : sandDays,
            PolishDays: item.PolishDays === '' ? '' : polishDays,
            FittingDays: item.FittingDays === '' ? '' : fitDays,
            QcDays: item.QcDays === '' ? '' : qcDays,
            FinalQcDays: item.FinalQcDays === '' ? '' : finalQcDays,
            PackingDays: item.PackingDays === '' ? '' : packDays,
            TotalLeadDays: totalLeadDays,
            DaysWithBuffer: daysWithBuffer,
            IsFinalQcDelayed: isFinalQcDelayed,
            IsDeadlineExceeded: isFinalQcDelayed,
            OverdueDays: overdueDays,
            ErrorReason: errorReason,
            HasProblem: hasProblem,
            IsManualWoodIssueIn: !!item.IsManualWoodIssueIn,
            InspectionDate: inspectionDate,
            WoodIssueIn: woodIssueIn,
            WoodIssueOut: woodIssueOut,
            PreCuttingIn: preCutIn,
            PreCuttingOut: preCutOut,
            MachiningIn: machIn,
            MachiningOut: machOut,
            ComponentStoreIn: compStoreIn,
            ComponentStoreOut: compStoreOut,
            AssemblyIn: assemIn,
            AssemblyOut: assemOut,
            MetalIn: metalIn,
            MetalOut: metalOut,
            UpholsteryIn: upholsteryIn,
            UpholsteryOut: upholsteryOut,
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
            const isMatch = String(p._rowKey) === String(itemKey) || 
                            String(p.ContainerMasterLId) === String(itemKey) || 
                            String(p.Id) === String(itemKey);
            if (isMatch) {
                return calculateScheduleFromDays({ ...p, [field]: val });
            }
            return p;
        }));
    };

    /**
     * Smart Bi-Directional Date Cell Change Handler:
     * - Allows user to change dates freely!
     * - Automatically skips Sundays and matches Days = (Date OUT - Date IN in workdays).
     * - Cascades forward with +1 workday buffer.
     * - Tracks IsFinalQcDelayed (FinalQcOut <= InspectionDate).
     */
    const handleDateCellChange = (itemKey, fieldKey, newDateValue) => {
        setPlanItems(prev => prev.map(p => {
            const isMatch = String(p._rowKey) === String(itemKey) || 
                            String(p.ContainerMasterLId) === String(itemKey) || 
                            String(p.Id) === String(itemKey);
            if (!isMatch) return p;

            let val = toStandardDateStr(newDateValue);
            if (val && isSunday(val)) {
                val = getNextWorkDay(val);
            }

            let updated = { ...p, [fieldKey]: val };

            // 1. If user changes Target Inspection Date:
            if (fieldKey === 'InspectionDate') {
                return calculateScheduleFromDays({ ...updated, IsManualWoodIssueIn: false });
            }

            // 2. If user changes WoodIssueIn directly:
            if (fieldKey === 'WoodIssueIn') {
                return calculateScheduleFromDays({ ...updated, IsManualWoodIssueIn: true });
            }

            // 3. Parallel stage dates: Metal & Upholstery
            // Rule 1: Metal start date = Machine start date, and vice versa
            if (fieldKey === 'MetalIn') {
                if (val) {
                    updated.MetalIn = val;
                    updated.MetalOut = getStageOut(val, updated.MetalDays);
                    // Vice versa: Machine start date = Metal start date
                    updated.MachiningIn = val;
                    updated.MachiningOut = getStageOut(val, updated.MachiningDays);

                    // Cascade forward from MachiningOut to all downstream serial stages
                    const serialStages = STAGE_ORDER.filter(s => s.isSerial);
                    const machIdx = serialStages.findIndex(s => s.key === 'Machining');
                    let prevOut = updated.MachiningOut;
                    for (let i = machIdx + 1; i < serialStages.length; i++) {
                        const stage = serialStages[i];
                        if (prevOut) {
                            const stageDays = parseInt(updated[stage.daysKey], 10) || 0;
                            updated[stage.inKey] = stageDays > 0 ? addWorkDays(prevOut, 1) : prevOut;
                            updated[stage.outKey] = getStageOut(updated[stage.inKey], stageDays);
                            prevOut = updated[stage.outKey];
                        }
                    }
                    // Keep Upholstery aligned to Assembly start date
                    if (updated.AssemblyIn) {
                        updated.UpholsteryIn = updated.AssemblyIn;
                        updated.UpholsteryOut = getStageOut(updated.UpholsteryIn, updated.UpholsteryDays);
                    }
                }
                if (updated.PackingOut && updated.WoodIssueIn) {
                    updated.DaysWithBuffer = getWorkDaysCount(updated.PackingOut, updated.WoodIssueIn);
                }
                return enrichProblemStatus(updated);
            }

            if (fieldKey === 'MetalOut') {
                if (val && updated.MetalIn) {
                    updated.MetalOut = val;
                    updated.MetalDays = Math.max(1, getWorkDaysCount(val, updated.MetalIn));
                }
                return updated;
            }

            // Rule 2: Upholstery start date = Assembly start date, and vice versa
            if (fieldKey === 'UpholsteryIn') {
                if (val) {
                    updated.UpholsteryIn = val;
                    updated.UpholsteryOut = getStageOut(val, updated.UpholsteryDays);
                    // Vice versa: Assembly start date = Upholstery start date
                    updated.AssemblyIn = val;
                    updated.AssemblyOut = getStageOut(val, updated.AssemblyDays);

                    // Cascade forward from AssemblyOut to all downstream serial stages
                    const serialStages = STAGE_ORDER.filter(s => s.isSerial);
                    const assemIdx = serialStages.findIndex(s => s.key === 'Assembly');
                    let prevOut = updated.AssemblyOut;
                    for (let i = assemIdx + 1; i < serialStages.length; i++) {
                        const stage = serialStages[i];
                        if (prevOut) {
                            const stageDays = parseInt(updated[stage.daysKey], 10) || 0;
                            updated[stage.inKey] = stageDays > 0 ? addWorkDays(prevOut, 1) : prevOut;
                            updated[stage.outKey] = getStageOut(updated[stage.inKey], stageDays);
                            prevOut = updated[stage.outKey];
                        }
                    }
                }
                if (updated.PackingOut && updated.WoodIssueIn) {
                    updated.DaysWithBuffer = getWorkDaysCount(updated.PackingOut, updated.WoodIssueIn);
                }
                return enrichProblemStatus(updated);
            }

            if (fieldKey === 'UpholsteryOut') {
                if (val && updated.UpholsteryIn) {
                    updated.UpholsteryOut = val;
                    updated.UpholsteryDays = Math.max(1, getWorkDaysCount(val, updated.UpholsteryIn));
                }
                return updated;
            }

            // 4. Serial Stages (WoodIssue, PreCutting, Machining, ComponentStore, Assembly, Sanding, Polish, Fitting, QC, FinalQC, Packing)
            const serialStages = STAGE_ORDER.filter(s => s.isSerial);
            const changedStageIdx = serialStages.findIndex(
                s => s.inKey === fieldKey || s.outKey === fieldKey
            );

            if (changedStageIdx >= 0) {
                const currentStage = serialStages[changedStageIdx];
                const isOutField = currentStage.outKey === fieldKey;

                if (isOutField) {
                    // User edited OUT date: Match days = OUT - IN in inclusive work days
                    if (val && updated[currentStage.inKey]) {
                        updated[currentStage.outKey] = val;
                        const daysDiff = getWorkDaysCount(val, updated[currentStage.inKey]);
                        updated[currentStage.daysKey] = Math.max(1, daysDiff);
                    }
                } else {
                    // User edited IN date:
                    // Always calculate OUT = getStageOut(IN, days) and cascade forward!
                    if (val) {
                        updated[currentStage.inKey] = val;
                        updated[currentStage.outKey] = getStageOut(val, updated[currentStage.daysKey]);
                    }
                }

                // If Machining was edited directly, sync Metal start date = Machining start date
                if (currentStage.key === 'Machining') {
                    updated.MetalIn = updated.MachiningIn;
                    updated.MetalOut = getStageOut(updated.MetalIn, updated.MetalDays);
                }
                // If Assembly was edited directly, sync Upholstery start date = Assembly start date
                if (currentStage.key === 'Assembly') {
                    updated.UpholsteryIn = updated.AssemblyIn;
                    updated.UpholsteryOut = getStageOut(updated.UpholsteryIn, updated.UpholsteryDays);
                }

                // Cascade forward to all subsequent serial stages (+1 work day buffer only if stageDays > 0)
                let prevOut = updated[currentStage.outKey];
                for (let i = changedStageIdx + 1; i < serialStages.length; i++) {
                    const stage = serialStages[i];
                    if (prevOut) {
                        const stageDays = parseInt(updated[stage.daysKey], 10) || 0;
                        if (stageDays > 0) {
                            const gap = (stage.key === 'Machining')
                                ? ((parseInt(updated.OutSourceDays, 10) || 0) > 0 ? parseInt(updated.OutSourceDays, 10) : 1)
                                : 1;
                            updated[stage.inKey] = addWorkDays(prevOut, gap);
                        } else {
                            updated[stage.inKey] = prevOut;
                        }
                        updated[stage.outKey] = getStageOut(updated[stage.inKey], stageDays);
                        prevOut = updated[stage.outKey];

                        // Keep Metal aligned to Machine start date
                        if (stage.key === 'Machining') {
                            updated.MetalIn = updated.MachiningIn;
                            updated.MetalOut = getStageOut(updated.MetalIn, updated.MetalDays);
                        }
                        // Keep Upholstery aligned to Assembly start date
                        if (stage.key === 'Assembly') {
                            updated.UpholsteryIn = updated.AssemblyIn;
                            updated.UpholsteryOut = getStageOut(updated.UpholsteryIn, updated.UpholsteryDays);
                        }
                    }
                }

                // Re-calculate total days (INCLUDES OutSourceDays in total lead days, dates unaffected)
                const prodTotal = 
                    (parseInt(updated.WoodIssueDays, 10) || 0) +
                    (parseInt(updated.PreCuttingDays, 10) || 0) +
                    (parseInt(updated.MachiningDays, 10) || 0) +
                    (parseInt(updated.ComponentStoreDays, 10) || 0) +
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
                    updated.DaysWithBuffer = getWorkDaysCount(updated.PackingOut, updated.WoodIssueIn);
                }

                return enrichProblemStatus(updated);
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
                    const targetRowKey = filteredItems[rowIdx]._rowKey || filteredItems[rowIdx].ContainerMasterLId;
                    if (colDef.isDate) {
                        handleDateCellChange(targetRowKey, colDef.key, prevVal);
                    } else {
                        handleDayChange(targetRowKey, colDef.key, prevVal);
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
            ComponentStoreDays: row1.ComponentStoreDays,
            AssemblyDays: row1.AssemblyDays,
            MetalDays: row1.MetalDays,
            UpholsteryDays: row1.UpholsteryDays,
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

    // Helper to convert date string to Excel serial date number
    const toExcelSerialDate = (dateStr) => {
        const std = toStandardDateStr(dateStr);
        if (!std) return null;
        const parts = std.split('-').map(Number);
        if (parts.length < 3 || isNaN(parts[0])) return null;
        const utc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
        const excelEpoch = Date.UTC(1899, 11, 30);
        return Math.round((utc - excelEpoch) / 86400000);
    };

    // Download Pre-filled Template (.xlsx) matching the 47-column standard with live dynamic micro-programming formulas
    const handleDownloadTemplate = () => {
        if (!planItems || planItems.length === 0) {
            toast.warn('No items to export.');
            return;
        }

        const row1 = [
            'CONT \nNO.', 'ITEM NO.', 'CONTRACT NO.', 'ITEM DESCRIPTION', 'ITEM \n QTY', 'INSPECTION DATE',
            'WOOD ISSUE', 'PRE CUTTING', 'OUT SOURCE JOB', 'MACHINING', 'COMPONENT\nSTORE', 'ASSEMBLY',
            'METAL', 'UPHOLSTERY', 'SANDING', 'POLISH', 'FITTING', 'QC', 'FINAL QC', 'PACKING',
            'TOTAL DAYS',
            'WOOD ISSUE DATE', 'WOOD ISSUE',
            'PRE CUTTING', 'PRE CUTTING',
            'MACHINING', 'MACHINING',
            'COMPONENT STORE', 'COMPONENT STORE',
            'ASSEMBLY', 'ASSEMBLY',
            'METAL', 'METAL',
            'UPHOLSTERY', 'UPHOLSTERY',
            'SANDING', 'SANDING',
            'POLISH', 'POLISH',
            'FITTING', 'FITTING',
            'QC', 'QC',
            'FINAL QC', 'FINAL QC',
            'PACKING', 'PACKING'
        ];

        const row2 = [
            '', '', '', '', '', '',
            '', '', '', '', '', '',
            '', '', '', '', '', '', '', '',
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
            'IN', 'OUT',
            'IN', 'OUT',
            'IN', 'OUT'
        ];

        const ws = XLSX.utils.aoa_to_sheet([row1, row2]);

        planItems.forEach((item, idx) => {
            const r = idx + 3; // 1-based row index in Excel (data begins at row 3)

            // Cols A to E: Core identification
            ws['A' + r] = { t: 's', v: item.ContainerNumber || '' };
            ws['B' + r] = { t: 's', v: item.ItemCode || '' };
            ws['C' + r] = { t: 's', v: item.ContractNo || '' };
            ws['D' + r] = { t: 's', v: item.ItemName || '' };
            ws['E' + r] = { t: 'n', v: item.Quantity || 0 };

            // Col F: Inspection Date
            const inspSerial = toExcelSerialDate(item.InspectionDate);
            if (inspSerial) {
                ws['F' + r] = { t: 'n', v: inspSerial, z: 'yyyy-mm-dd' };
            } else {
                ws['F' + r] = { t: 's', v: '' };
            }

            // Cols G to T: Department Days inputs
            ws['G' + r] = { t: 'n', v: parseInt(item.WoodIssueDays, 10) || 0 };
            ws['H' + r] = { t: 'n', v: parseInt(item.PreCuttingDays, 10) || 0 };
            ws['I' + r] = { t: 'n', v: parseInt(item.OutSourceDays, 10) || 0 };
            ws['J' + r] = { t: 'n', v: parseInt(item.MachiningDays, 10) || 0 };
            ws['K' + r] = { t: 'n', v: parseInt(item.ComponentStoreDays, 10) || 0 };
            ws['L' + r] = { t: 'n', v: parseInt(item.AssemblyDays, 10) || 0 };
            ws['M' + r] = { t: 'n', v: parseInt(item.MetalDays, 10) || 0 };
            ws['N' + r] = { t: 'n', v: parseInt(item.UpholsteryDays, 10) || 0 };
            ws['O' + r] = { t: 'n', v: parseInt(item.SandingDays, 10) || 0 };
            ws['P' + r] = { t: 'n', v: parseInt(item.PolishDays, 10) || 0 };
            ws['Q' + r] = { t: 'n', v: parseInt(item.FittingDays, 10) || 0 };
            ws['R' + r] = { t: 'n', v: parseInt(item.QcDays, 10) || 0 };
            ws['S' + r] = { t: 'n', v: parseInt(item.FinalQcDays, 10) || 0 };
            ws['T' + r] = { t: 'n', v: parseInt(item.PackingDays, 10) || 0 };

            // Col U: Total Lead Days Formula (serial production + OutSourceDays; Metal & Upholstery parallel excluded)
            ws['U' + r] = { 
                t: 'n', 
                f: `G${r}+H${r}+I${r}+J${r}+K${r}+L${r}+O${r}+P${r}+Q${r}+R${r}+S${r}+T${r}`, 
                v: item.TotalLeadDays || 0 
            };

            // Helper to populate dynamic date cells with formula, evaluated value and yyyy-mm-dd date formatting
            const addDateCell = (colLetter, formula, fallbackDateStr) => {
                const serial = toExcelSerialDate(fallbackDateStr);
                ws[colLetter + r] = {
                    t: 'n',
                    f: formula,
                    v: serial || 0,
                    z: 'yyyy-mm-dd'
                };
            };

            // Col V: Wood Issue IN = WORKDAY.INTL(F{r}, -U{r}, 11) (skips Sunday backwards from target inspection date)
            addDateCell('V', `WORKDAY.INTL(F${r}, -U${r}, 11)`, item.WoodIssueIn);

            // Col W: Wood Issue OUT = IF(G{r}<=1, V{r}, WORKDAY.INTL(V{r}, G${r}-1, 11))
            addDateCell('W', `IF(G${r}<=1, V${r}, WORKDAY.INTL(V${r}, G${r}-1, 11))`, item.WoodIssueOut);

            // Col X: Pre Cutting IN = IF(H{r}>0, WORKDAY.INTL(W{r}, 1, 11), W{r})
            addDateCell('X', `IF(H${r}>0, WORKDAY.INTL(W${r}, 1, 11), W${r})`, item.PreCuttingIn);

            // Col Y: Pre Cutting OUT = IF(H{r}<=1, X{r}, WORKDAY.INTL(X${r}, H${r}-1, 11))
            addDateCell('Y', `IF(H${r}<=1, X${r}, WORKDAY.INTL(X${r}, H${r}-1, 11))`, item.PreCuttingOut);

            // Col Z: Machining IN = IF(J{r}>0, WORKDAY.INTL(Y{r}, IF(I{r}>0, I{r}, 1), 11), Y{r})
            addDateCell('Z', `IF(J${r}>0, WORKDAY.INTL(Y${r}, IF(I${r}>0, I${r}, 1), 11), Y${r})`, item.MachiningIn);

            // Col AA: Machining OUT = IF(J{r}<=1, Z{r}, WORKDAY.INTL(Z${r}, J${r}-1, 11))
            addDateCell('AA', `IF(J${r}<=1, Z${r}, WORKDAY.INTL(Z${r}, J${r}-1, 11))`, item.MachiningOut);

            // Col AB: Component Store IN = IF(K{r}>0, WORKDAY.INTL(AA{r}, 1, 11), AA{r})
            addDateCell('AB', `IF(K${r}>0, WORKDAY.INTL(AA${r}, 1, 11), AA${r})`, item.ComponentStoreIn);

            // Col AC: Component Store OUT = IF(K{r}<=1, AB${r}, WORKDAY.INTL(AB${r}, K${r}-1, 11))
            addDateCell('AC', `IF(K${r}<=1, AB${r}, WORKDAY.INTL(AB${r}, K${r}-1, 11))`, item.ComponentStoreOut);

            // Col AD: Assembly IN = IF(L{r}>0, WORKDAY.INTL(AC{r}, 1, 11), AC{r})
            addDateCell('AD', `IF(L${r}>0, WORKDAY.INTL(AC${r}, 1, 11), AC${r})`, item.AssemblyIn);

            // Col AE: Assembly OUT = IF(L{r}<=1, AD${r}, WORKDAY.INTL(AD${r}, L${r}-1, 11))
            addDateCell('AE', `IF(L${r}<=1, AD${r}, WORKDAY.INTL(AD${r}, L${r}-1, 11))`, item.AssemblyOut);

            // Parallel Stage 1: Metal start date = Machine start date
            // Col AF: Metal IN = Z{r} (Machining IN)
            addDateCell('AF', `Z${r}`, item.MetalIn);

            // Col AG: Metal OUT = IF(M{r}<=1, AF${r}, WORKDAY.INTL(AF${r}, M${r}-1, 11))
            addDateCell('AG', `IF(M${r}<=1, AF${r}, WORKDAY.INTL(AF${r}, M${r}-1, 11))`, item.MetalOut);

            // Parallel Stage 2: Upholstery start date = Assembly start date
            // Col AH: Upholstery IN = AD{r} (Assembly IN)
            addDateCell('AH', `AD${r}`, item.UpholsteryIn);

            // Col AI: Upholstery OUT = IF(N{r}<=1, AH${r}, WORKDAY.INTL(AH${r}, N${r}-1, 11))
            addDateCell('AI', `IF(N${r}<=1, AH${r}, WORKDAY.INTL(AH${r}, N${r}-1, 11))`, item.UpholsteryOut);

            // Col AJ: Sanding IN = IF(O{r}>0, WORKDAY.INTL(AE{r}, 1, 11), AE{r})
            addDateCell('AJ', `IF(O${r}>0, WORKDAY.INTL(AE${r}, 1, 11), AE${r})`, item.SandingIn);

            // Col AK: Sanding OUT = IF(O{r}<=1, AJ${r}, WORKDAY.INTL(AJ${r}, O${r}-1, 11))
            addDateCell('AK', `IF(O${r}<=1, AJ${r}, WORKDAY.INTL(AJ${r}, O${r}-1, 11))`, item.SandingOut);

            // Col AL: Polish IN = IF(P{r}>0, WORKDAY.INTL(AK{r}, 1, 11), AK${r})
            addDateCell('AL', `IF(P${r}>0, WORKDAY.INTL(AK${r}, 1, 11), AK${r})`, item.PolishIn);

            // Col AM: Polish OUT = IF(P{r}<=1, AL${r}, WORKDAY.INTL(AL${r}, P${r}-1, 11))
            addDateCell('AM', `IF(P${r}<=1, AL${r}, WORKDAY.INTL(AL${r}, P${r}-1, 11))`, item.PolishOut);

            // Col AN: Fitting IN = IF(Q{r}>0, WORKDAY.INTL(AM{r}, 1, 11), AM{r})
            addDateCell('AN', `IF(Q${r}>0, WORKDAY.INTL(AM${r}, 1, 11), AM${r})`, item.FittingIn);

            // Col AO: Fitting OUT = IF(Q{r}<=1, AN${r}, WORKDAY.INTL(AN${r}, Q${r}-1, 11))
            addDateCell('AO', `IF(Q${r}<=1, AN${r}, WORKDAY.INTL(AN${r}, Q${r}-1, 11))`, item.FittingOut);

            // Col AP: QC IN = IF(R{r}>0, WORKDAY.INTL(AO{r}, 1, 11), AO{r})
            addDateCell('AP', `IF(R${r}>0, WORKDAY.INTL(AO${r}, 1, 11), AO${r})`, item.QcIn);

            // Col AQ: QC OUT = IF(R{r}<=1, AP{r}, WORKDAY.INTL(AP${r}, R{r}-1, 11))
            addDateCell('AQ', `IF(R${r}<=1, AP${r}, WORKDAY.INTL(AP${r}, R${r}-1, 11))`, item.QcOut);

            // Col AR: Final QC IN = IF(S{r}>0, WORKDAY.INTL(AQ{r}, 1, 11), AQ{r})
            addDateCell('AR', `IF(S${r}>0, WORKDAY.INTL(AQ${r}, 1, 11), AQ${r})`, item.FinalQcIn);

            // Col AS: Final QC OUT = IF(S{r}<=1, AR{r}, WORKDAY.INTL(AR${r}, S{r}-1, 11))
            addDateCell('AS', `IF(S${r}<=1, AR${r}, WORKDAY.INTL(AR${r}, S${r}-1, 11))`, item.FinalQcOut);

            // Col AT: Packing IN = IF(T{r}>0, WORKDAY.INTL(AS{r}, 1, 11), AS{r})
            addDateCell('AT', `IF(T${r}>0, WORKDAY.INTL(AS${r}, 1, 11), AS${r})`, item.PackingIn);

            // Col AU: Packing OUT = IF(T{r}<=1, AT${r}, WORKDAY.INTL(AT${r}, T${r}-1, 11))
            addDateCell('AU', `IF(T${r}<=1, AT${r}, WORKDAY.INTL(AT${r}, T${r}-1, 11))`, item.PackingOut);
        });

        ws['!ref'] = `A1:AU${planItems.length + 2}`;
        ws['!cols'] = [
            { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 14 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
            { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
            { wch: 11 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }
        ];

        const wbOut = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbOut, ws, 'PRODUCTION TARGET');
        XLSX.writeFile(wbOut, `AARA_Multi_Shipment_Target_Template.xlsx`);
        toast.success(`📥 Template downloaded with ${planItems.length} items with dynamic formulas!`);
    };

    // Smart Dynamic Excel Upload Handler: Auto-detects columns, maps data into table, and calculates dates
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
                if (!aoa || aoa.length < 2) {
                    toast.error('Invalid Excel file format: Must have headers and data rows.');
                    return;
                }

                // Detect header row index (usually row 0, but check first 5 rows)
                let hRowIdx = 0;
                for (let i = 0; i < Math.min(5, aoa.length); i++) {
                    const rowStr = (aoa[i] || []).join(' ').toLowerCase();
                    if (rowStr.includes('item') || rowStr.includes('insp') || rowStr.includes('cont') || rowStr.includes('wood')) {
                        hRowIdx = i;
                        break;
                    }
                }

                const r0 = aoa[hRowIdx] || [];
                const r1 = aoa[hRowIdx + 1] || [];
                const cleanH = (val) => String(val || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const hasSubheaders = r1.some(c => {
                    const s = String(c || '').trim().toUpperCase();
                    return s === 'IN' || s === 'OUT';
                });
                const dataStartRow = hasSubheaders ? hRowIdx + 2 : hRowIdx + 1;

                // Smart Dynamic Column Detectors
                const findCol = (pattern) => {
                    for (let c = 0; c < r0.length; c++) {
                        const h0 = cleanH(r0[c]);
                        if (pattern.test(h0)) return c;
                    }
                    return -1;
                };

                const usedDayCols = new Set();
                const findDayColSequential = (pattern, fallbackIdx) => {
                    for (let c = 0; c < r0.length; c++) {
                        if (usedDayCols.has(c)) continue;
                        const h0 = cleanH(r0[c]);
                        const h1 = hasSubheaders ? cleanH(r1[c]) : '';
                        if (pattern.test(h0) && !h1.includes('in') && !h1.includes('out')) {
                            usedDayCols.add(c);
                            return c;
                        }
                    }
                    usedDayCols.add(fallbackIdx);
                    return fallbackIdx;
                };

                const findDateCol = (pattern, isOut, fallbackIdx) => {
                    if (!hasSubheaders) return fallbackIdx;
                    for (let c = 0; c < r0.length; c++) {
                        const h0 = cleanH(r0[c]);
                        const h1 = cleanH(r1[c]);
                        if (pattern.test(h0)) {
                            if (isOut && (h1 === 'out' || h1.includes('out'))) return c;
                            if (!isOut && (h1 === 'in' || h1.includes('in'))) return c;
                        }
                    }
                    return fallbackIdx;
                };

                // Column index mappings
                const colShipment = findCol(/cont|shipment/i);
                const colItemCode = findCol(/item\s*(no|code)/i);
                const colContract = findCol(/contract/i);
                const colInspDate = findCol(/insp/i);

                const colWoodDays = findDayColSequential(/wood/i, 6);
                const colPreCutDays = findDayColSequential(/pre\s*cut/i, 7);
                const colOutSourceDays = findDayColSequential(/out\s*source/i, 8);
                const colMachDays = findDayColSequential(/mach/i, 9);
                const colCompStoreDays = findDayColSequential(/comp/i, 10);
                const colAssemDays = findDayColSequential(/assem/i, 11);
                const colMetalDays = findDayColSequential(/metal/i, 12);
                const colUphDays = findDayColSequential(/uphol/i, 13);
                const colSandDays = findDayColSequential(/sand/i, 14);
                const colPolishDays = findDayColSequential(/polish/i, 15);
                const colFitDays = findDayColSequential(/fit/i, 16);
                const colQcDays = findDayColSequential(/^qc/i, 17);
                const colFinalQcDays = findDayColSequential(/final\s*qc/i, 18);
                const colPackDays = findDayColSequential(/pack/i, 19);

                const colWoodIn = findDateCol(/wood/i, false, 21);
                const colMetalIn = findDateCol(/metal/i, false, 31);
                const colMetalOut = findDateCol(/metal/i, true, 32);
                const colUphIn = findDateCol(/uphol/i, false, 33);
                const colUphOut = findDateCol(/uphol/i, true, 34);

                const cleanVal = (v) => String(v || '').replace(/[\r\n\t]+/g, ' ').trim();
                const parseExcelDay = (val, currentVal) => {
                    if (val === undefined || val === null || val === '') return currentVal;
                    const num = parseInt(val, 10);
                    return isNaN(num) ? currentVal : Math.max(0, num);
                };
                const parseExcelDate = (val, currentVal) => {
                    if (val === undefined || val === null || val === '') return currentVal;
                    const parsed = toStandardDateStr(val);
                    return parsed || currentVal;
                };

                // Map uploaded data directly into existing items
                let matchedCount = 0;
                const updated = planItems.map(item => {
                    let matchedRow = null;
                    const itemCode = cleanVal(item.ItemCode).toLowerCase();
                    const contractNo = cleanVal(item.ContractNo).toLowerCase();
                    const shipNo = cleanVal(item.ContainerNumber).toLowerCase();

                    for (let r = dataStartRow; r < aoa.length; r++) {
                        const row = aoa[r];
                        if (!row || row.length === 0) continue;

                        const rowShip = cleanVal(colShipment >= 0 ? row[colShipment] : '').toLowerCase();
                        const rowItemCode = cleanVal(colItemCode >= 0 ? row[colItemCode] : '').toLowerCase();
                        const rowContract = cleanVal(colContract >= 0 ? row[colContract] : '').toLowerCase();

                        // Priority 1: Match on ItemCode and Shipment
                        if (rowItemCode && itemCode && rowItemCode === itemCode) {
                            if (!rowShip || !shipNo || rowShip === shipNo) {
                                matchedRow = row;
                                break;
                            }
                        }
                        // Priority 2: Match on ItemCode and Contract
                        if (rowItemCode && itemCode && rowItemCode === itemCode) {
                            if (rowContract && contractNo && rowContract === contractNo) {
                                matchedRow = row;
                                break;
                            }
                        }
                        // Priority 3: Fallback match on ItemCode alone
                        if (rowItemCode && itemCode && rowItemCode === itemCode && !matchedRow) {
                            matchedRow = row;
                        }
                    }

                    if (matchedRow) {
                        matchedCount++;
                        const inspDate = parseExcelDate(colInspDate >= 0 ? matchedRow[colInspDate] : null, item.InspectionDate);
                        const woodDays = parseExcelDay(colWoodDays >= 0 ? matchedRow[colWoodDays] : null, item.WoodIssueDays);
                        const preCutDays = parseExcelDay(colPreCutDays >= 0 ? matchedRow[colPreCutDays] : null, item.PreCuttingDays);
                        const outSourceDays = parseExcelDay(colOutSourceDays >= 0 ? matchedRow[colOutSourceDays] : null, item.OutSourceDays);
                        const machDays = parseExcelDay(colMachDays >= 0 ? matchedRow[colMachDays] : null, item.MachiningDays);
                        const compStoreDays = parseExcelDay(colCompStoreDays >= 0 ? matchedRow[colCompStoreDays] : null, item.ComponentStoreDays);
                        const assemDays = parseExcelDay(colAssemDays >= 0 ? matchedRow[colAssemDays] : null, item.AssemblyDays);
                        const metalDays = parseExcelDay(colMetalDays >= 0 ? matchedRow[colMetalDays] : null, item.MetalDays);
                        const upholsteryDays = parseExcelDay(colUphDays >= 0 ? matchedRow[colUphDays] : null, item.UpholsteryDays);
                        const sandDays = parseExcelDay(colSandDays >= 0 ? matchedRow[colSandDays] : null, item.SandingDays);
                        const polishDays = parseExcelDay(colPolishDays >= 0 ? matchedRow[colPolishDays] : null, item.PolishDays);
                        const fitDays = parseExcelDay(colFitDays >= 0 ? matchedRow[colFitDays] : null, item.FittingDays);
                        const qcDays = parseExcelDay(colQcDays >= 0 ? matchedRow[colQcDays] : null, item.QcDays);
                        const finalQcDays = parseExcelDay(colFinalQcDays >= 0 ? matchedRow[colFinalQcDays] : null, item.FinalQcDays);
                        const packDays = parseExcelDay(colPackDays >= 0 ? matchedRow[colPackDays] : null, item.PackingDays);

                        const woodIn = parseExcelDate(colWoodIn >= 0 ? matchedRow[colWoodIn] : null, item.WoodIssueIn);
                        const metalIn = parseExcelDate(colMetalIn >= 0 ? matchedRow[colMetalIn] : null, item.MetalIn);
                        const metalOut = parseExcelDate(colMetalOut >= 0 ? matchedRow[colMetalOut] : null, item.MetalOut);
                        const upholsteryIn = parseExcelDate(colUphIn >= 0 ? matchedRow[colUphIn] : null, item.UpholsteryIn);
                        const upholsteryOut = parseExcelDate(colUphOut >= 0 ? matchedRow[colUphOut] : null, item.UpholsteryOut);

                        return calculateScheduleFromDays({
                            ...item,
                            InspectionDate: inspDate,
                            WoodIssueDays: woodDays,
                            PreCuttingDays: preCutDays,
                            OutSourceDays: outSourceDays,
                            MachiningDays: machDays,
                            ComponentStoreDays: compStoreDays,
                            AssemblyDays: assemDays,
                            MetalDays: metalDays,
                            UpholsteryDays: upholsteryDays,
                            SandingDays: sandDays,
                            PolishDays: polishDays,
                            FittingDays: fitDays,
                            QcDays: qcDays,
                            FinalQcDays: finalQcDays,
                            PackingDays: packDays,
                            WoodIssueIn: woodIn,
                            IsManualWoodIssueIn: false,
                            MetalIn: metalIn,
                            MetalOut: metalOut,
                            UpholsteryIn: upholsteryIn,
                            UpholsteryOut: upholsteryOut,
                        });
                    }

                    return item;
                });

                const problemCount = updated.filter(p => {
                    const insp = toStandardDateStr(p.InspectionDate);
                    const qc = toStandardDateStr(p.FinalQcOut);
                    return (insp && qc && qc > insp) || p.IsFinalQcDelayed || !insp;
                }).length;

                setPlanItems(updated);

                if (problemCount > 0) {
                    toast.warn(
                        `⚠️ Excel Uploaded: Updated ${matchedCount} items. ${problemCount} item(s) have deadline issues and are highlighted in red below.`,
                        { autoClose: 7000 }
                    );
                } else {
                    toast.success(`✅ Excel Uploaded: Updated ${matchedCount} items directly in the table! Review and save.`);
                }
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

        // Check if any item has Final QC exceeding Inspection Date
        const lateQcItems = planItems.filter(item => {
            const insp = toStandardDateStr(item.InspectionDate);
            const qc = toStandardDateStr(item.FinalQcOut);
            return insp && qc && qc > insp;
        });

        if (lateQcItems.length > 0) {
            const proceed = window.confirm(
                `⚠️ Note: In ${lateQcItems.length} item(s), Final QC Date is after the Inspection Date (Target Deadline Exceeded).\n\nDo you want to save anyway?`
            );
            if (!proceed) {
                return;
            }
        }

        setSaving(true);
        try {
            const { userId } = getAuthDetails();
            const url = `${API_WEB_URLS.BASE}ShipmentPlanning/SavePlan/${userId}/token`;

            const getEffectiveDays = (inDate, outDate, currentDays) => {
                const raw = parseInt(currentDays, 10) || 0;
                if (raw === 0) return 0;
                if (inDate && outDate) {
                    return Math.max(1, getWorkDaysCount(outDate, inDate));
                }
                return raw;
            };

            const payloadData = [];
            for (const item of planItems) {
                const lineId = parseInt(item.ContainerMasterLId || item.F_ContainerMasterL || item.Id, 10);
                if (!lineId || lineId <= 0) {
                    console.warn('Skipping item without valid ContainerMasterLId:', item);
                    continue;
                }

                // Ensure days match dates if both IN and OUT are set (inclusive working days, excluding Sundays)
                const wood = getEffectiveDays(item.WoodIssueIn, item.WoodIssueOut, item.WoodIssueDays);
                const preCut = getEffectiveDays(item.PreCuttingIn, item.PreCuttingOut, item.PreCuttingDays);
                const outSource = parseInt(item.OutSourceDays, 10) || 0; // Strictly informational
                const mach = getEffectiveDays(item.MachiningIn, item.MachiningOut, item.MachiningDays);
                const compStore = getEffectiveDays(item.ComponentStoreIn, item.ComponentStoreOut, item.ComponentStoreDays);
                const assem = getEffectiveDays(item.AssemblyIn, item.AssemblyOut, item.AssemblyDays);
                const metal = getEffectiveDays(item.MetalIn, item.MetalOut, item.MetalDays);
                const upholstery = getEffectiveDays(item.UpholsteryIn, item.UpholsteryOut, item.UpholsteryDays);
                const sand = getEffectiveDays(item.SandingIn, item.SandingOut, item.SandingDays);
                const polish = getEffectiveDays(item.PolishIn, item.PolishOut, item.PolishDays);
                const fit = getEffectiveDays(item.FittingIn, item.FittingOut, item.FittingDays);
                const qc = getEffectiveDays(item.QcIn, item.QcOut, item.QcDays);
                const finalQc = getEffectiveDays(item.FinalQcIn, item.FinalQcOut, item.FinalQcDays);
                const pack = getEffectiveDays(item.PackingIn, item.PackingOut, item.PackingDays);

                // TOTAL LEAD DAYS INCLUDES OutSourceDays as requested, dates unaffected
                const totalLead = wood + preCut + outSource + mach + compStore + assem + sand + polish + fit + qc + finalQc + pack;

                let daysWithBuffer = 0;
                if (item.PackingOut && item.WoodIssueIn) {
                    daysWithBuffer = getWorkDaysCount(item.PackingOut, item.WoodIssueIn);
                }

                const isExceeded = (item.InspectionDate && item.FinalQcOut) ? (item.FinalQcOut > item.InspectionDate) : false;

                payloadData.push({
                    ContainerMasterLId: lineId,
                    ContainerId: parseInt(item.ContainerId || item.F_ContainerMaster, 10) || 0,
                    WoodIssueDays: wood,
                    PreCuttingDays: preCut,
                    OutSourceDays: outSource,
                    MachiningDays: mach,
                    ComponentStoreDays: compStore,
                    AssemblyDays: assem,
                    MetalDays: metal,
                    UpholsteryDays: upholstery,
                    SandingDays: sand,
                    PolishDays: polish,
                    FittingDays: fit,
                    QcDays: qc,
                    FinalQcDays: finalQc,
                    PackingDays: pack,
                    TotalLeadDays: totalLead,
                    DaysWithBuffer: daysWithBuffer,
                    IsDeadlineExceeded: isExceeded,
                    WoodIssueIn: item.WoodIssueIn,
                    WoodIssueOut: item.WoodIssueOut,
                    PreCuttingIn: item.PreCuttingIn,
                    PreCuttingOut: item.PreCuttingOut,
                    MachiningIn: item.MachiningIn,
                    MachiningOut: item.MachiningOut,
                    ComponentStoreIn: item.ComponentStoreIn,
                    ComponentStoreOut: item.ComponentStoreOut,
                    AssemblyIn: item.AssemblyIn,
                    AssemblyOut: item.AssemblyOut,
                    MetalIn: item.MetalIn,
                    MetalOut: item.MetalOut,
                    UpholsteryIn: item.UpholsteryIn,
                    UpholsteryOut: item.UpholsteryOut,
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
                });
            }

            if (payloadData.length === 0) {
                toast.error('❌ Cannot save: No valid shipment lines found with ContainerMasterL ID.');
                return;
            }

            const res = await axios.post(
                url,
                { Data: JSON.stringify(payloadData) },
                { headers: getAuthHeaders() }
            );

            const isSuccess = Boolean(
                res.data && (
                    res.data.Success === true || 
                    res.data.success === true || 
                    res.data.status === 200 || 
                    res.data.Status === 200 ||
                    res.data.data?.Status === 1 || 
                    res.data.Data?.Status === 1
                )
            );
            const msg = res.data?.Message || res.data?.message || res.data?.data?.Message || res.data?.Data?.Message || `Saved ${payloadData.length} items across all shipments successfully!`;

            if (isSuccess) {
                toast.success(`✅ ${msg}`);
                setOriginalItems(JSON.parse(JSON.stringify(planItems)));
                if (onSuccess) onSuccess();
            } else {
                toast.error(msg || 'Failed to save production plan.');
            }
        } catch (err) {
            console.error('Error saving multi-shipment plan:', err);
            const errMsg = err.response?.data?.Message || err.message;
            toast.error('❌ Error saving plan: ' + errMsg);
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

    // Filter items based on search term, shipment dropdown, & problem rows toggle
    const filteredItems = useMemo(() => {
        let items = planItems;
        if (showOnlyProblems) {
            items = items.filter(p => {
                const insp = toStandardDateStr(p.InspectionDate);
                const finalQc = toStandardDateStr(p.FinalQcOut);
                return (insp && finalQc && finalQc > insp) || p.IsFinalQcDelayed || p.HasProblem || !insp;
            });
        }
        if (selectedShipmentFilter !== 'ALL') {
            items = items.filter(p => p.ContainerNumber === selectedShipmentFilter);
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(item => 
                (item.ContainerNumber && item.ContainerNumber.toLowerCase().includes(lower)) ||
                (item.ContractNo && item.ContractNo.toLowerCase().includes(lower)) ||
                (item.ItemCode && item.ItemCode.toLowerCase().includes(lower)) ||
                (item.ItemName && item.ItemName.toLowerCase().includes(lower)) ||
                (item.ErrorReason && item.ErrorReason.toLowerCase().includes(lower))
            );
        }
        return items;
    }, [planItems, showOnlyProblems, selectedShipmentFilter, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const total = planItems.length;
        const planned = planItems.filter(p => p.TotalLeadDays > 0).length;
        const problemCount = planItems.filter(p => {
            const insp = toStandardDateStr(p.InspectionDate);
            const finalQc = toStandardDateStr(p.FinalQcOut);
            return (insp && finalQc && finalQc > insp) || p.IsFinalQcDelayed || p.HasProblem || !insp;
        }).length;
        const shipmentsCount = uniqueShipments.length;
        return { total, planned, problemCount, shipmentsCount };
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
                    box-sizing: border-box;
                }
                /* Hide number input spinners for clean ERP grid data entry */
                .desktop-cell-input[type=number]::-webkit-inner-spin-button, 
                .desktop-cell-input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                .desktop-cell-input[type=number] { 
                    -moz-appearance: textfield; 
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
                        {stats.problemCount > 0 ? (
                            <span 
                                onClick={() => setShowOnlyProblems(prev => !prev)}
                                style={{ 
                                    padding: '3px 8px', 
                                    background: '#7f1d1d', 
                                    color: '#fca5a5', 
                                    borderRadius: '3px', 
                                    border: '1px solid #dc2626',
                                    cursor: 'pointer'
                                }}
                                title="Click to filter and view problem rows"
                            >
                                ⚠️ Issues: <strong>{stats.problemCount}</strong>
                            </span>
                        ) : (
                            <span style={{ padding: '3px 8px', background: '#064e3b', color: '#6ee7b7', borderRadius: '3px', border: '1px solid #047857' }}>
                                ✓ 0 Issues
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
                                    {stats.problemCount > 0 && (
                                        <button 
                                            type="button"
                                            className={`btn btn-sm ${showOnlyProblems ? 'btn-danger' : 'btn-outline-danger'}`}
                                            onClick={() => setShowOnlyProblems(prev => !prev)}
                                            style={{ fontSize: '11px', padding: '3px 10px', height: '28px', fontWeight: 600 }}
                                            title={showOnlyProblems ? "Click to show all rows" : "Click to view ONLY rows with deadline issues"}
                                        >
                                            ⚠️ {showOnlyProblems ? `Showing Issues (${stats.problemCount})` : `Problem Rows (${stats.problemCount})`}
                                        </button>
                                    )}

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
                                    width: 'max-content', 
                                    minWidth: '100%',
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
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '35px', minWidth: '35px' }}>#</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', width: '130px', minWidth: '130px' }}>Shipment</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', width: '100px', minWidth: '100px' }}>Contract</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', width: '90px', minWidth: '90px' }}>Item Code</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', minWidth: '220px' }}>Description</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '50px', minWidth: '50px' }}>Qty</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>Insp Date</th>
                                        
                                        {/* Department Days Group (ColSpan 14) */}
                                        <th colSpan="14" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0', whiteSpace: 'nowrap' }}>
                                            Department Lead Times (Days)
                                        </th>
                                        
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '55px', minWidth: '55px', backgroundColor: '#f1f5f9' }}>Total</th>

                                        {/* 13 Department Stage Dates (IN & OUT - ColSpan 26) */}
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Wood Issue</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Pre Cutting</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Machining</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Comp Store</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Assembly</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Metal</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Upholstery</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Sanding</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Polish</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Fitting</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>QC</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Final QC</th>
                                        <th colSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', backgroundColor: '#e2e8f0' }}>Packing</th>

                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '60px', minWidth: '60px', backgroundColor: '#f1f5f9' }}>Buffer</th>
                                        <th rowSpan="2" style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '85px', minWidth: '85px', backgroundColor: '#f1f5f9' }}>Status</th>
                                    </tr>

                                    {/* Level 2 Subheaders */}
                                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px' }}>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Wood</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>PreCut</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }} title="Outsource Days (Included in Total Days, dates unaffected)">OutSrc</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Mach</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '72px', minWidth: '72px' }}>CompStore</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Assem</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Metal</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '74px', minWidth: '74px' }}>Upholstery</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Sand</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Polish</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Fit</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>QC</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '64px', minWidth: '64px' }}>FinalQC</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '54px', minWidth: '54px' }}>Pack</th>

                                        {/* 13 Stages IN / OUT Headers (26 cols) */}
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>IN</th>
                                        <th style={{ padding: '3px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '115px', minWidth: '115px' }}>OUT</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="50" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                                {showOnlyProblems ? '🎉 No problem rows found! All items have valid dates.' : 'No items match your filter.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item, idx) => {
                                            const targetInsp = toStandardDateStr(item.InspectionDate);
                                            const finalQc = toStandardDateStr(item.FinalQcOut);
                                            const isOverdue = (targetInsp && finalQc && finalQc > targetInsp) || item.IsFinalQcDelayed;
                                            const isMissingInsp = !targetInsp;
                                            const isRowProblem = isOverdue || isMissingInsp || item.HasProblem;

                                            const rowErrorReason = item.ErrorReason || (
                                                isOverdue 
                                                    ? `Final QC (${finalQc}) exceeds Insp Date (${targetInsp}) by ${item.OverdueDays || 1} day(s)` 
                                                    : (isMissingInsp ? 'Missing Inspection Date' : '')
                                            );

                                            const rowBg = isRowProblem 
                                                ? '#fef2f2' 
                                                : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');

                                            const cellBorder = isRowProblem ? '1px solid #fecaca' : '1px solid #e2e8f0';

                                            return (
                                                <tr 
                                                    key={item._rowKey || item.ContainerMasterLId || idx}
                                                    style={{ 
                                                        backgroundColor: rowBg, 
                                                        height: '30px',
                                                        borderLeft: isRowProblem ? '5px solid #ef4444' : '1px solid #cbd5e1',
                                                        boxShadow: isRowProblem ? 'inset 0 0 0 1px #fca5a5' : 'none',
                                                        transition: 'background-color 0.15s ease'
                                                    }}
                                                >
                                                    <td style={{ textAlign: 'center', border: cellBorder, color: isRowProblem ? '#dc2626' : '#64748b', fontSize: '10px', width: '38px', minWidth: '38px', fontWeight: isRowProblem ? 700 : 'normal' }}>
                                                        {isRowProblem ? (
                                                            <span title={rowErrorReason} style={{ cursor: 'help' }}>⚠️ {idx + 1}</span>
                                                        ) : (
                                                            idx + 1
                                                        )}
                                                    </td>
                                                    <td style={{ border: cellBorder, fontWeight: 600, color: '#334155', width: '130px', minWidth: '130px', padding: '3px 6px', wordBreak: 'break-word' }} title={item.ContainerNumber}>
                                                        {item.ContainerNumber || '-'}
                                                    </td>
                                                    <td style={{ border: cellBorder, color: '#1e293b', width: '100px', minWidth: '100px', padding: '3px 6px', whiteSpace: 'nowrap' }} title={item.ContractNo}>
                                                        {item.ContractNo || '-'}
                                                    </td>
                                                    <td style={{ border: cellBorder, fontFamily: 'monospace', color: '#0f172a', width: '90px', minWidth: '90px', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                                                        {item.ItemCode || '-'}
                                                    </td>
                                                    <td style={{ border: cellBorder, minWidth: '220px', maxWidth: '300px', padding: '3px 6px' }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isRowProblem ? 600 : 'normal', color: isRowProblem ? '#991b1b' : '#0f172a' }} title={item.ItemName}>
                                                            {item.ItemName || '-'}
                                                        </div>
                                                        {isRowProblem && rowErrorReason && (
                                                            <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                                                <span>⚠️</span>
                                                                <span style={{ background: '#fee2e2', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fca5a5' }}>
                                                                    {rowErrorReason}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center', border: cellBorder, fontWeight: 600, width: '50px', minWidth: '50px', padding: '3px 4px' }}>
                                                        {item.Quantity || 0}
                                                    </td>

                                                    {/* Inspection Date Cell (Col Index 0) */}
                                                    <td style={{ border: cellBorder, padding: '1px 2px', width: '115px', minWidth: '115px' }}>
                                                        <input 
                                                            id={`cell-${idx}-0`}
                                                            type="date"
                                                            value={toStandardDateStr(item.InspectionDate) || ''}
                                                            onChange={e => handleDateCellChange(item._rowKey || item.ContainerMasterLId, 'InspectionDate', e.target.value)}
                                                            onFocus={e => e.target.select()}
                                                            onKeyDown={e => handleCellKeyDown(e, idx, 0, filteredItems.length)}
                                                            className="desktop-cell-input"
                                                            style={{ 
                                                                width: '100%', 
                                                                minWidth: '110px',
                                                                height: '24px', 
                                                                fontSize: '11px', 
                                                                border: isRowProblem ? '1.5px solid #ef4444' : '1px solid #cbd5e1', 
                                                                borderRadius: '2px',
                                                                padding: '1px 2px',
                                                                backgroundColor: isRowProblem ? '#fee2e2' : '#fff',
                                                                color: isRowProblem ? '#991b1b' : '#0f172a',
                                                                fontWeight: isRowProblem ? 600 : 'normal',
                                                                textAlign: 'center'
                                                            }}
                                                            title={isRowProblem ? `⚠️ Target Inspection Date (${targetInsp || 'Not Set'})` : "Target Inspection Date"}
                                                        />
                                                    </td>

                                                    {/* Department Inputs: Wood to Pack (Col Indices 1 to 14) */}
                                                    {EDITABLE_COLS.slice(1, 15).map((dept, deptIdx) => {
                                                        const colIdx = deptIdx + 1; // 1 to 14
                                                        const colWidth = dept.width || '54px';
                                                        return (
                                                            <td 
                                                                key={dept.key} 
                                                                style={{ 
                                                                    border: cellBorder, 
                                                                    padding: '1px 2px',
                                                                    width: colWidth,
                                                                    minWidth: colWidth
                                                                }}
                                                            >
                                                                <input 
                                                                    id={`cell-${idx}-${colIdx}`}
                                                                    type="number"
                                                                    min="0"
                                                                    value={item[dept.key] !== undefined && item[dept.key] !== null ? item[dept.key] : ''}
                                                                    onChange={e => handleDayChange(item._rowKey || item.ContainerMasterLId, dept.key, e.target.value)}
                                                                    onFocus={e => e.target.select()}
                                                                    onKeyDown={e => handleCellKeyDown(e, idx, colIdx, filteredItems.length)}
                                                                    className="desktop-cell-input"
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        minWidth: '40px',
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
                                                    <td style={{ textAlign: 'center', border: cellBorder, fontWeight: 600, backgroundColor: isRowProblem ? '#fef2f2' : '#f8fafc', width: '55px', minWidth: '55px', whiteSpace: 'nowrap' }}>
                                                        {item.TotalLeadDays}d
                                                    </td>

                                                    {/* Department Date Inputs (Col Indices 15 to 40) */}
                                                    {EDITABLE_COLS.slice(15).map((dateCol, dateIdx) => {
                                                        const colIdx = dateIdx + 15; // 15 to 40
                                                        const dateVal = toStandardDateStr(item[dateCol.key]) || '';
                                                        const isLateFinalQc = dateCol.key === 'FinalQcOut' && targetInsp && dateVal && dateVal > targetInsp;

                                                        return (
                                                            <td 
                                                                key={dateCol.key} 
                                                                style={{ 
                                                                    border: cellBorder, 
                                                                    padding: '1px 2px',
                                                                    width: '115px',
                                                                    minWidth: '115px'
                                                                }}
                                                            >
                                                                <input 
                                                                    id={`cell-${idx}-${colIdx}`}
                                                                    type="date"
                                                                    value={dateVal}
                                                                    onChange={e => handleDateCellChange(item._rowKey || item.ContainerMasterLId, dateCol.key, e.target.value)}
                                                                    onFocus={e => e.target.select()}
                                                                    onKeyDown={e => handleCellKeyDown(e, idx, colIdx, filteredItems.length)}
                                                                    className="desktop-cell-input"
                                                                    style={{ 
                                                                        width: '100%', 
                                                                        minWidth: '110px',
                                                                        height: '22px', 
                                                                        fontSize: '11px', 
                                                                        border: isLateFinalQc ? '2px solid #ef4444' : '1px solid #cbd5e1', 
                                                                        borderRadius: '2px',
                                                                        padding: '1px 2px',
                                                                        backgroundColor: isLateFinalQc ? '#fee2e2' : '#fff',
                                                                        color: isLateFinalQc ? '#b91c1c' : '#0f172a',
                                                                        fontWeight: isLateFinalQc ? 700 : 'normal',
                                                                        textAlign: 'center'
                                                                    }}
                                                                    title={isLateFinalQc ? `⚠️ Final QC Date (${dateVal}) must be <= Inspection Date (${targetInsp})! Exceeds by ${item.OverdueDays || 1} day(s)` : `${dateCol.label} - Click to change date`}
                                                                />
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Days With Buffer */}
                                                    <td style={{ textAlign: 'center', border: cellBorder, backgroundColor: isRowProblem ? '#fef2f2' : '#f8fafc', color: '#475569', width: '60px', minWidth: '60px', whiteSpace: 'nowrap' }}>
                                                        {item.DaysWithBuffer ? `${item.DaysWithBuffer}d` : '-'}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td style={{ textAlign: 'center', border: cellBorder, backgroundColor: isRowProblem ? '#fee2e2' : '#f8fafc', width: '85px', minWidth: '85px', whiteSpace: 'nowrap' }}>
                                                        {isRowProblem ? (
                                                            <span 
                                                                className="badge" 
                                                                style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '3px 6px', cursor: 'help' }} 
                                                                title={rowErrorReason}
                                                            >
                                                                ⚠️ {isOverdue ? `Late (+${item.OverdueDays || 1}d)` : 'Issue'}
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

            <Modal.Footer style={{ background: '#f8fafc', padding: '6px 16px', borderTop: '1px solid #e2e8f0' }}>
                <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                        ⌨️ <strong>Navigation:</strong> <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Move cells | <kbd>Enter</kbd> Down | <kbd>Tab</kbd> Right | <kbd>Ctrl+D</kbd> Fill Down | <kbd>Ctrl+S</kbd> Save Plan | <em>*Sundays are automatically skipped. Final QC Date is scheduled on or before Target Inspection Date (Final QC ≤ Inspection).</em>
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
