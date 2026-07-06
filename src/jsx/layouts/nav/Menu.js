// Common menu items for all users
const commonMenuItems = [
    {
        title: 'JOB CARD',
        to: 'JobCardForm',
    },
    {
        title: 'CLOSING REPORT',
        to: 'ClosingReport',
    }
];

// Admin menu items (F_UserType = 1) - structured into sections
const adminMenuItems = [
    {
        title: 'SHIPMENT MASTER',
        to: 'ContainerMaster',
    },
    {
        title: 'MODULE MASTER',
        to: 'ModuleMaster',
    },
    {
        title: 'USER MASTER CRUD',
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
        title: 'ITEM SUMMARY',
        to: 'TotalItemSummary',
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
    // {
    //     title: 'MACHINE COMPONENT REPORT',
    //     to: 'MachineComponentMapReport',
    // },
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

    // {
    //     title: 'WOOD REJECTION JOB CARDS',
    //     to: 'ApproveJobCards',
    // },
];

// Admin reporting items
const adminReportingItems = [
    {
        title: 'NEW REPORTING ENTRY',
        to: 'ReportingEntrySystem',
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
    }

    // {
    //     title: 'SUPERVISOR ENTRY',
    //     to: 'SupervisorEntry',
    // },

    // {
    //     title: 'CONTAINER WISE REPORT',
    //     to: 'Report_ContainerWise',
    // },
    // {
    //     title: 'Report Entry',
    //     to: 'ManualReportEntry',
    // },
    // {
    //     title: 'CONTAINER REPORT',
    //     to: 'ContainerReport',
    // },
    // {
    //     title: 'TRANSFER',
    //     to: 'Transfer',
    // },
   
];

// Supervisor menu items (F_UserType = 2)
const supervisorMenuItems = [
    {
        title: 'MACHINE COMPONENT REPORT',
        to: 'MachineComponentMapReport',
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
        title: 'WOOD ISSUE',
        to: 'AddWoodIssue',
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
        title: 'MANUAL REPORT ENTRY',
        to: 'ManualReportEntry',
    }
];

// Operator menu items (F_UserType = 3)
const operatorMenuItems = [
    {
        title: 'MACHINE COMPONENT REPORT',
        to: 'MachineComponentMapReport',
    }
];

export const getAllUniqueMenuItems = () => {
    const all = [
        { title: 'DASHBOARD', to: 'dashboard' },
        ...commonMenuItems,
        ...adminMenuItems,
        ...adminReportingItems,
        ...supervisorMenuItems,
        ...operatorMenuItems
    ];
    const seen = new Set();
    return all.filter(item => {
        const path = item.to;
        if (!path || seen.has(path)) return false;
        seen.add(path);
        return true;
    });
};

const getMenuContent = () => {
    const userData = JSON.parse(localStorage.getItem('authUser'));
    const userType = userData?.userType;


    // Return menu items based on user type
    switch (userType) {
        case 1: // Admin
            return { adminMenuItems, adminReportingItems };
        case 2: // Supervisor
            return [...supervisorMenuItems, ...commonMenuItems];
        case 3: // Operator
            return [...operatorMenuItems, ...commonMenuItems];
        default:
            return commonMenuItems;
    }
};

const filterByPermissions = (menuList, permissions) => {
    if (!permissions || permissions.length === 0) {
        return menuList;
    }
    return menuList.filter(item => {
        if (item.to === 'dashboard') return true;
        const perm = permissions.find(p => (p.ModulePath || p.Path)?.toLowerCase() === item.to?.toLowerCase());
        return perm ? perm.IsView : false;
    });
};

export const getMenuList = () => {
    const userData = JSON.parse(localStorage.getItem('authUser'));
    const userType = userData?.userType;
    const permissions = userData?.permissions || [];
    const menuData = getMenuContent();

    const baseMenu = [
        {
            title: 'DASHBOARD',
            to: 'dashboard',
            iconStyle: <i className="flaticon-025-dashboard"></i>,
        }
    ];

    if (userType === 1) { // Admin
        const filteredAdminItems = filterByPermissions(menuData.adminMenuItems || [], permissions);
        const filteredReportingItems = filterByPermissions(menuData.adminReportingItems || [], permissions);

        return [
            ...baseMenu,
            ...(filteredAdminItems.length > 0 ? [{
                title: 'DOCUMENTATION',
                classsChange: 'mm-collapse',
                iconStyle: <i className="flaticon-381-file"></i>,
                customClass: 'section-header-menu',
                content: filteredAdminItems
            }] : []),
            ...(filteredReportingItems.length > 0 ? [{
                title: 'REPORTING',
                classsChange: 'mm-collapse',
                iconStyle: <i className="fas fa-chart-bar"></i>,
                customClass: 'section-header-menu',
                content: filteredReportingItems
            }] : [])
        ];
    } else {
        const filteredMenuData = filterByPermissions(menuData || [], permissions);
        return [
            ...baseMenu,
            ...(filteredMenuData.length > 0 ? [{
                title: 'MENU ITEMS',
                classsChange: 'mm-collapse',
                iconStyle: <i className="flaticon-381-list"></i>,
                content: filteredMenuData
            }] : [])
        ];
    }
};

export const MenuList = getMenuList;