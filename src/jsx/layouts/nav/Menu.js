import React from 'react';
import { FaThLarge, FaFileAlt, FaChartBar } from 'react-icons/fa';

// Master list of all documentation / setup menu items
const allDocumentationItems = [
    {
        title: 'SHIPMENT MASTER',
        to: 'ContainerMaster',
    },
    {
        title: 'MODULE MASTER',
        to: 'ModuleMaster',
    },
    {
        title: 'USER MASTER',
        to: 'UserMasterCrud',
    },
    {
        title: 'USER ROLE',
        to: 'UserRole',
    },
    {
        title: 'PERMISSION MATRIX',
        to: 'PermissionMatrix',
    },
    {
        title: 'CATEGORYMASTER',
        to: 'CategoryMaster',
    },
    {
        title: 'ITEMMASTER',
        to: 'ItemMaster',
    },
    {
        title: 'COMPONENTMASTER',
        to: 'componentMaster',
    },
    {
        title: 'CARDMASTER',
        to: 'CardMaster',
    },
    {
        title: 'JOB CARD',
        to: 'JobCardForm',
    },
    {
        title: 'WOOD ISSUE',
        to: 'AddWoodIssue',
    },
    {
        title: 'MACHINE MASTER',
        to: 'MachineMaster',
    },
    {
        title: 'DEPARTMENT MASTER',
        to: 'DepartmentMaster',
    },
    {
        title: 'SHIFT MASTER',
        to: 'ShiftMaster',
    },
    {
        title: 'CREATE AL SLIP',
        to: 'AddALSlip',
    },
    {
        title: 'AL SLIP',
        to: 'ALSlip',
    },
    {
        title: 'ADD OTHER SLIP',
        to: 'AddOtherSlip',
    },
    {
        title: 'GLOBAL OPTIONS',
        to: 'GlobalOptions',
    }
];

// Master list of all reporting menu items
const allReportingItems = [
    {
        title: '⚡ REPORT BUILDER STUDIO',
        to: 'ReportBuilder',
    },
    {
        title: 'NEW REPORTING ENTRY',
        to: 'ReportingEntrySystem',
    },
    {
        title: 'SCANNER REPORTING',
        to: 'QRScanner',
    },
    {
        title: 'WOOD ISSUE SCANNER',
        to: 'WoodIssueScanner',
    },
    {
        title: 'MACHINE DELAY DASHBOARD',
        to: 'MachineDelayDashboard',
    },
    {
        title: 'MACHINE RUNNING STATUS',
        to: 'MachineRunningStatusReport',
    },
    {
        title: 'ACTIVE JOB CARDS',
        to: 'ActiveJobCards',
    },
    {
        title: 'ITEM MACHINING TIME',
        to: 'ItemMachiningTimeReport',
    },
    {
        title: 'CONTAINER TRACK REPORT',
        to: 'Report_ContainerWise',
    },
    {
        title: 'SHIPMENT REPORT',
        to: 'ContainerEntryReport',
    },
    {
        title: 'SHIPMENT ENTRY SYSTEM',
        to: 'ContainerEntrySystem',
    },
    {
        title: 'WOOD COMPONENT REPORT',
        to: 'WoodComponentReport',
    },
    {
        title: 'SHIPMENT MASTER REPORT',
        to: 'ContainerMasterReport',
    },
    {
        title: 'CLOSING REPORT',
        to: 'ClosingReport',
    },
    {
        title: 'MACHINE COMPONENT REPORT',
        to: 'MachineComponentMapReport',
    },
    {
        title: 'MANUAL REPORT ENTRY',
        to: 'ManualReportEntry',
    },
    {
        title: 'ITEM SUMMARY',
        to: 'TotalItemSummary',
    }
];

// Get all unique menu items for the module sync and general uses
export const getAllUniqueMenuItems = () => {
    const all = [
        { title: 'DASHBOARD', to: 'dashboard' },
        ...allDocumentationItems,
        ...allReportingItems
    ];
    const seen = new Set();
    return all.filter(item => {
        const path = item.to;
        if (!path || seen.has(path)) return false;
        seen.add(path);
        return true;
    });
};

// Helper to detect admin role / user
const isUserAdmin = (userData) => {
    if (!userData) return false;
    const role = userData.role || userData.roleId || userData.Role || userData.userType || userData.UserType;
    if (role === 1 || role === '1') return true;
    const name = (userData.userName || userData.username || userData.Name || '').toLowerCase();
    if (name === 'admin' || name === 'administrator') return true;
    const roleNames = (userData.roleNames || '').toLowerCase();
    if (roleNames.includes('admin')) return true;
    return false;
};

// Filter function based on role wise permission list
const filterByPermissions = (menuList, permissions, isAdmin = false) => {
    if (isAdmin) {
        return menuList;
    }
    if (!permissions || permissions.length === 0) {
        return menuList;
    }
    return menuList.filter(item => {
        if (
            item.to === 'dashboard' || 
            item.to === 'ReportBuilder' || 
            item.to === 'DepartmentMaster' || 
            item.to === 'department-master' ||
            item.to === 'ActiveJobCards'
        ) {
            return true;
        }
        const itemPath = (item.to || '').toLowerCase().replace(/^\//, '');
        const perm = permissions.find(p => {
            const pPath = (p.ModulePath || p.Path || '').toLowerCase().replace(/^\//, '');
            return pPath === itemPath;
        });
        return perm ? !!perm.IsView : false;
    });
};

// Generate final menu list based on the user's rolewise permissions
export const getMenuList = () => {
    const userData = JSON.parse(localStorage.getItem('authUser'));
    const permissions = userData?.permissions || [];
    const isAdmin = isUserAdmin(userData);

    const baseMenu = [
        {
            title: 'DASHBOARD',
            to: 'dashboard',
            iconStyle: <FaThLarge />,
        }
    ];

    const filteredDocumentation = filterByPermissions(allDocumentationItems, permissions, isAdmin);
    const filteredReporting = filterByPermissions(allReportingItems, permissions, isAdmin);

    // Dynamic Saved Reports from Local Cache or Server
    let customReportsItems = [];
    try {
        const cached = localStorage.getItem('cachedMenuReports');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                customReportsItems = parsed.map(r => ({
                    title: `⭐ ${(r.reportTitle || r.ReportTitle || 'Report')}`.toUpperCase(),
                    to: `CustomReport/${r.reportId || r.ReportId}`
                }));
            }
        }
    } catch {}

    return [
        ...baseMenu,
        ...(filteredDocumentation.length > 0 ? [{
            title: 'DOCUMENTATION',
            classsChange: 'mm-collapse',
            iconStyle: <FaFileAlt />,
            customClass: 'section-header-menu',
            content: filteredDocumentation
        }] : []),
        ...(filteredReporting.length > 0 ? [{
            title: 'REPORTING',
            classsChange: 'mm-collapse',
            iconStyle: <FaChartBar />,
            customClass: 'section-header-menu',
            content: filteredReporting
        }] : []),
        ...(customReportsItems.length > 0 ? [{
            title: '📂 CUSTOM & SAVED REPORTS',
            classsChange: 'mm-collapse',
            iconStyle: <FaFileAlt />,
            customClass: 'section-header-menu',
            content: customReportsItems
        }] : [])
    ];
};

export const MenuList = getMenuList;