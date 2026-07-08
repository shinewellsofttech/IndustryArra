import React from 'react';

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
        title: 'SUPERVISOR ENTRY',
        to: 'SupervisorEntry',
    },
    {
        title: 'GLOBAL OPTIONS',
        to: 'GlobalOptions',
    }
];

// Master list of all reporting menu items
const allReportingItems = [
    {
        title: 'NEW REPORTING ENTRY',
        to: 'ReportingEntrySystem',
    },
    {
        title: 'SCANNER REPORTING',
        to: 'QRScanner',
    },
    {
        title: 'MACHINE DASHBOARD',
        to: 'MachineDelayDashboard',
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

// Filter function based on role wise permission list
const filterByPermissions = (menuList, permissions) => {
    if (!permissions || permissions.length === 0) {
        return menuList;
    }
    return menuList.filter(item => {
        if (item.to === 'dashboard' || item.to === 'MachineDelayDashboard' || item.to === 'GlobalOptions') return true;
        const perm = permissions.find(p => (p.ModulePath || p.Path)?.toLowerCase() === item.to?.toLowerCase());
        return perm ? perm.IsView : false;
    });
};

// Generate final menu list based on the user's rolewise permissions
export const getMenuList = () => {
    const userData = JSON.parse(localStorage.getItem('authUser'));
    const permissions = userData?.permissions || [];

    const baseMenu = [
        {
            title: 'DASHBOARD',
            to: 'dashboard',
            iconStyle: <i className="fas fa-th-large"></i>,
        }
    ];

    const filteredDocumentation = filterByPermissions(allDocumentationItems, permissions);
    const filteredReporting = filterByPermissions(allReportingItems, permissions);

    return [
        ...baseMenu,
        ...(filteredDocumentation.length > 0 ? [{
            title: 'DOCUMENTATION',
            classsChange: 'mm-collapse',
            iconStyle: <i className="fas fa-file-alt"></i>,
            customClass: 'section-header-menu',
            content: filteredDocumentation
        }] : []),
        ...(filteredReporting.length > 0 ? [{
            title: 'REPORTING',
            classsChange: 'mm-collapse',
            iconStyle: <i className="fas fa-chart-bar"></i>,
            customClass: 'section-header-menu',
            content: filteredReporting
        }] : [])
    ];
};

export const MenuList = getMenuList;