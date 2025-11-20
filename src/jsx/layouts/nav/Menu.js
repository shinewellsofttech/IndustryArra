const getMenuContent = () => {
    const userData = JSON.parse(localStorage.getItem('authUser'));
    const userType = userData?.userType;

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
            title: 'CONTAINERMASTER',
            to: 'ContainerMaster',
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
            title: 'CONTAINER REPORT',
            to: 'ContainerEntryReport',
        },
        {
            title: 'CONTAINER ENTRY SYSTEM',
            to: 'ContainerEntrySystem',
        },
        {
            title: 'WOOD COMPONENT REPORT',
            to: 'WoodComponentReport',
        },
        {
            title: 'CONTAINER MASTER REPORT',
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

export const getMenuList = () => {
    const userData = JSON.parse(localStorage.getItem('authUser'));
    const userType = userData?.userType;
    const menuData = getMenuContent();

    const baseMenu = [
        {
            title: 'DASHBOARD',
            to: 'dashboard',
            iconStyle: <i className="flaticon-025-dashboard"></i>,
        }
    ];

    if (userType === 1) { // Admin
        return [
            ...baseMenu,
            {
                title: 'DOCUMENTATION',
                classsChange: 'mm-collapse',
                iconStyle: <i className="flaticon-381-file"></i>,
                customClass: 'section-header-menu',
                content: menuData.adminMenuItems
            },
            {
                title: 'REPORTING',
                classsChange: 'mm-collapse',
                iconStyle: <i className="fas fa-chart-bar"></i>,
                customClass: 'section-header-menu',
                content: menuData.adminReportingItems
            }
        ];
    } else {
        return [
            ...baseMenu,
            {
                title: 'MENU ITEMS',
                classsChange: 'mm-collapse',
                iconStyle: <i className="flaticon-381-list"></i>,
                content: menuData
            }
        ];
    }
};

export const MenuList = getMenuList;