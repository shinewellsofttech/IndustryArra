import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import swal from "sweetalert";
import PageTitle from "../layouts/PageTitle";
import { Fn_FillListData, Fn_AddEditData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";

const PermissionMetrixs = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Refs for focus management
    const roleSelectRef = useRef(null);
    const moduleSelectRefs = useRef({});
    const addButtonRefs = useRef({});

    const [selectedRole, setSelectedRole] = useState("");
    const [permissions, setPermissions] = useState([]);
    const [isEditingOpen, setIsEditingOpen] = useState(true);

    // State for Copy from another Role modal
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [sourceRole, setSourceRole] = useState("");
    const [isCopying, setIsCopying] = useState(false);

    const [dropdowns, setDropdowns] = useState({
        roles: [],
        modules: [],
    });

    const ROLE_API_URL = `${API_WEB_URLS.MASTER}/0/token/UserRole/Id/0`; // Updated URL
    const MODULE_API_URL = `${API_WEB_URLS.MASTER}/0/token/ModuleMaster/Id/0`;

    // Auto-focus on page load
    useEffect(() => {
        if (roleSelectRef.current) {
            roleSelectRef.current.focus();
        }
    }, []);

    useEffect(() => {
        Fn_FillListData(dispatch, setDropdowns, "roles", ROLE_API_URL)
            .catch(err => console.error("Failed to fetch roles:", err));

        Fn_FillListData(dispatch, setDropdowns, "modules", MODULE_API_URL)
            .catch(err => console.error("Failed to fetch modules:", err));
    }, [dispatch, ROLE_API_URL, MODULE_API_URL]);

    // Initialize permissions based on fetched modules or API response
    useEffect(() => {
        // Start with one empty row
        const emptyRow = {
            Id: Date.now().toString(),
            ModuleId: 0,
            ModuleName: "",
            CanView: false,
            CanAdd: false,
            CanEdit: false,
            CanDelete: false,
        };

        if (!selectedRole) {
            setPermissions([emptyRow]);
            return;
        }

        const FETCH_URL = `${API_WEB_URLS.MASTER}/0/token/RoleWisePermission/Id/${selectedRole}`;

        Fn_FillListData(dispatch, () => { }, "tempData", FETCH_URL)
            .then((data) => {
                const list = Array.isArray(data) ? data : (data?.Data || []);

                if (list.length === 0) {
                    setPermissions([emptyRow]);
                    return;
                }

                // Map fetched permissions to table rows
                const mappedPermissions = list.map((fetchedPerm) => {
                    const module = dropdowns.modules.find(m => m.Id === fetchedPerm.F_ModuleMaster);
                    return {
                        Id: `${fetchedPerm.F_ModuleMaster}-${Date.now()}-${Math.random()}`,
                        ModuleId: fetchedPerm.F_ModuleMaster || 0,
                        ModuleName: module?.Name || "",
                        CanView: !!fetchedPerm.IsView,
                        CanAdd: !!fetchedPerm.IsAdd,
                        CanEdit: !!fetchedPerm.IsEdit,
                        CanDelete: !!fetchedPerm.IsDelete,
                    };
                });

                setPermissions(mappedPermissions.length > 0 ? mappedPermissions : [emptyRow]);
            })
            .catch(err => {
                console.error("Failed to fetch role permissions:", err);
                setPermissions([emptyRow]);
            });

    }, [dispatch, selectedRole, dropdowns.modules]);

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
    };

    const handleModuleKeyDown = (rowId, rowIndex, e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const checkboxes = document.querySelectorAll(`[data-row-id="${rowId}"][data-checkbox]`);
            if (checkboxes.length > 0) {
                checkboxes[0].focus();
            }
        }
    };

    const handleCheckboxKeyDown = (rowId, currentField, e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const checkboxOrder = ["CanView", "CanAdd", "CanEdit", "CanDelete"];
            const currentIndex = checkboxOrder.indexOf(currentField);
            
            if (currentIndex < checkboxOrder.length - 1) {
                const nextField = checkboxOrder[currentIndex + 1];
                const nextCheckbox = document.querySelector(`[data-row-id="${rowId}"][data-checkbox="${nextField}"]`);
                if (nextCheckbox) {
                    nextCheckbox.focus();
                }
            } else {
                const addButton = addButtonRefs.current[rowId];
                if (addButton) {
                    addButton.focus();
                }
            }
        }
    };

    const handleAddButtonKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddRow();
        }
    };

    const handleModuleChange = (rowId, selectedModuleId) => {
        const moduleId = parseInt(selectedModuleId);
        const module = dropdowns.modules.find(m => m.Id === moduleId);
        
        setPermissions(prev => prev.map(p => {
            if (p.Id === rowId) {
                return {
                    ...p,
                    ModuleId: moduleId,
                    ModuleName: module?.Name || ""
                };
            }
            return p;
        }));
    };

    const handleCheckboxToggle = (rowId, field) => {
        setPermissions(prev => prev.map(p => {
            if (p.Id === rowId) {
                return { ...p, [field]: !p[field] };
            }
            return p;
        }));
    };

    const handleSelectAllToggle = (rowId) => {
        setPermissions(prev => prev.map(p => {
            if (p.Id === rowId) {
                const allSelected = p.CanView && p.CanAdd && p.CanEdit && p.CanDelete;
                const newValue = !allSelected;
                return {
                    ...p,
                    CanView: newValue,
                    CanAdd: newValue,
                    CanEdit: newValue,
                    CanDelete: newValue,
                };
            }
            return p;
        }));
    };

    const isRowEmpty = (row) => {
        return row.ModuleId === 0 || !row.ModuleId;
    };

    const handleAddRow = () => {
        const lastRow = permissions[permissions.length - 1];
        if (lastRow && isRowEmpty(lastRow)) {
            alert("Please fill the current row before adding a new one.");
            return;
        }

        const newRow = {
            Id: Date.now().toString(),
            ModuleId: 0,
            ModuleName: "",
            CanView: false,
            CanAdd: false,
            CanEdit: false,
            CanDelete: false,
        };
        setPermissions(prev => [...prev, newRow]);
        
        setTimeout(() => {
            const newModuleRef = moduleSelectRefs.current[newRow.Id];
            if (newModuleRef) {
                newModuleRef.focus();
            }
        }, 100);
    };

    const handleRemoveRow = (rowId) => {
        setPermissions(prev => {
            const filtered = prev.filter(p => p.Id !== rowId);
            return filtered.length > 0 ? filtered : [{
                Id: Date.now().toString(),
                ModuleId: 0,
                ModuleName: "",
                CanView: false,
                CanAdd: false,
                CanEdit: false,
                CanDelete: false,
            }];
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) {
            alert("Please select a role first.");
            return;
        }

        const selectedPermissions = permissions.filter(p => p.ModuleId > 0);

        if (selectedPermissions.length === 0) {
            alert("Please add at least one module permission.");
            return;
        }

        const dataJsonArray = selectedPermissions.map(p => ({
            F_ModuleMaster: p.ModuleId,
            IsView: p.CanView,
            IsAdd: p.CanAdd,
            IsEdit: p.CanEdit,
            IsDelete: p.CanDelete
        }));

        const formData = new FormData();
        formData.append("F_RoleMaster", selectedRole);
        formData.append("F_BranchMaster", "0");
        formData.append("DataJSON", JSON.stringify(dataJsonArray));

        const storedUser = localStorage.getItem("user");
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const userId = currentUser?.uid ?? currentUser?.id ?? "0";
        formData.append("UserId", userId);
        formData.append("F_BranchOffice", localStorage.getItem("F_BranchOffice") || "");

        const apiSaveUrl = `RoleWisePermission/${userId}/token`;

        try {
            await Fn_AddEditData(
                dispatch,
                () => { },
                { arguList: { id: 0, formData } },
                apiSaveUrl,
                true,
                "memberid",
                navigate,
                null
            );
            
            swal("Success", "Permissions saved successfully!", "success");
        } catch (error) {
            console.error("Failed to save permissions", error);
            swal("Error", "Failed to save permissions. Please try again.", "error");
        }
    };

    const handleCopyPermissions = async () => {
        if (!sourceRole) {
            alert("Please select a source role.");
            return;
        }

        if (!selectedRole) {
            alert("Please select a destination role first.");
            return;
        }

        if (sourceRole === selectedRole) {
            alert("Source and destination roles must be different.");
            return;
        }

        setIsCopying(true);

        try {
            const FETCH_URL = `${API_WEB_URLS.MASTER}/0/token/RoleWisePermission/Id/${sourceRole}`;

            const data = await Fn_FillListData(dispatch, () => { }, "tempData", FETCH_URL);
            const list = Array.isArray(data) ? data : (data?.Data || []);

            if (list.length === 0) {
                alert("Source role has no permissions to copy.");
                setIsCopying(false);
                return;
            }

            const mappedPermissions = list.map((fetchedPerm) => {
                const module = dropdowns.modules.find(m => m.Id === fetchedPerm.F_ModuleMaster);
                return {
                    Id: `${fetchedPerm.F_ModuleMaster}-${Date.now()}-${Math.random()}`,
                    ModuleId: fetchedPerm.F_ModuleMaster || 0,
                    ModuleName: module?.Name || "",
                    CanView: !!fetchedPerm.IsView,
                    CanAdd: !!fetchedPerm.IsAdd,
                    CanEdit: !!fetchedPerm.IsEdit,
                    CanDelete: !!fetchedPerm.IsDelete,
                };
            });

            setPermissions(mappedPermissions);
            setShowCopyModal(false);
            setSourceRole("");
            alert(`Permissions copied from source role! Found ${mappedPermissions.length} modules.`);
        } catch (error) {
            console.error("Failed to copy permissions:", error);
            alert("Failed to copy permissions. Please try again.");
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <React.Fragment>
            <PageTitle
                activeMenu={"Permission Matrix"}
                motherMenu={"Setup & Admin"}
                pageContent={"Permission Matrix"}
            />
            <div className="row">
                <div className="col-lg-12">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <div className="row mb-4">
                                <div className="col-md-4">
                                    <div className="form-group mb-3">
                                        <label className="text-label fw-bold">
                                            Select Role <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            value={selectedRole}
                                            onChange={handleRoleChange}
                                            className="form-control"
                                            ref={roleSelectRef}
                                        >
                                            <option value="">-- Select Role --</option>
                                            {dropdowns.roles.map(role => (
                                                <option key={role.Id} value={role.Id}>{role.Name || `Role ${role.Id}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <fieldset disabled={!isEditingOpen}>
                                <div className="table-responsive border rounded" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                                    <table className="table table-bordered table-striped mb-0 table-hover align-middle">
                                        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr style={{ backgroundColor: "#1e3d73", color: "white" }}>
                                                <th className="py-3 px-3 shadow-none border-0" style={{ backgroundColor: "#1e3d73", color: "white", minWidth: "250px" }}>
                                                    Module Name
                                                </th>
                                                <th className="text-center py-3 border-0" style={{ backgroundColor: "#1e3d73", color: "white", width: "100px" }}>
                                                    <i className="fa fa-check-square-o me-1"></i> Select All
                                                </th>
                                                <th className="text-center py-3 border-0" style={{ backgroundColor: "#1e3d73", color: "white", width: "80px" }}>
                                                    <i className="fa fa-eye text-white-50 me-1"></i> View
                                                </th>
                                                <th className="text-center py-3 border-0" style={{ backgroundColor: "#1e3d73", color: "white", width: "80px" }}>
                                                    <i className="fa fa-plus text-primary-light me-1" style={{ color: "#8bb6ff" }}></i> Add
                                                </th>
                                                <th className="text-center py-3 border-0" style={{ backgroundColor: "#1e3d73", color: "white", width: "80px" }}>
                                                    <i className="fa fa-pencil text-warning me-1"></i> Edit
                                                </th>
                                                <th className="text-center py-3 border-0" style={{ backgroundColor: "#1e3d73", color: "white", width: "80px" }}>
                                                    <i className="fa fa-trash text-white-50 me-1"></i> Delete
                                                </th>
                                                <th className="text-center py-3 border-0" style={{ backgroundColor: "#1e3d73", color: "white", width: "120px" }}>
                                                    <i className="fa fa-cogs me-1"></i> Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permissions.map((perm, index) => (
                                                <tr key={perm.Id}>
                                                    <td className="px-2 bg-white">
                                                        <select
                                                            value={perm.ModuleId}
                                                            onChange={(e) => handleModuleChange(perm.Id, e.target.value)}
                                                            onKeyDown={(e) => handleModuleKeyDown(perm.Id, index, e)}
                                                            className="form-control form-control-sm"
                                                            ref={(el) => {
                                                                if (el) {
                                                                    moduleSelectRefs.current[perm.Id] = el;
                                                                }
                                                            }}
                                                        >
                                                            <option value="0">-- Select Module --</option>
                                                            {dropdowns.modules.map(module => (
                                                                <option key={module.Id} value={module.Id}>
                                                                    {module.Name || `Module ${module.Id}`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="text-center bg-white">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={perm.CanView && perm.CanAdd && perm.CanEdit && perm.CanDelete}
                                                            onChange={() => handleSelectAllToggle(perm.Id)}
                                                            title="Select/Deselect All Permissions"
                                                        />
                                                    </td>
                                                    <td className="text-center bg-white">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={perm.CanView}
                                                            onChange={() => handleCheckboxToggle(perm.Id, "CanView")}
                                                            onKeyDown={(e) => handleCheckboxKeyDown(perm.Id, "CanView", e)}
                                                            data-row-id={perm.Id}
                                                            data-checkbox="CanView"
                                                        />
                                                    </td>
                                                    <td className="text-center bg-white">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={perm.CanAdd}
                                                            onChange={() => handleCheckboxToggle(perm.Id, "CanAdd")}
                                                            onKeyDown={(e) => handleCheckboxKeyDown(perm.Id, "CanAdd", e)}
                                                            data-row-id={perm.Id}
                                                            data-checkbox="CanAdd"
                                                        />
                                                    </td>
                                                    <td className="text-center bg-white">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={perm.CanEdit}
                                                            onChange={() => handleCheckboxToggle(perm.Id, "CanEdit")}
                                                            onKeyDown={(e) => handleCheckboxKeyDown(perm.Id, "CanEdit", e)}
                                                            data-row-id={perm.Id}
                                                            data-checkbox="CanEdit"
                                                        />
                                                    </td>
                                                    <td className="text-center bg-white">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={perm.CanDelete}
                                                            onChange={() => handleCheckboxToggle(perm.Id, "CanDelete")}
                                                            onKeyDown={(e) => handleCheckboxKeyDown(perm.Id, "CanDelete", e)}
                                                            data-row-id={perm.Id}
                                                            data-checkbox="CanDelete"
                                                        />
                                                    </td>
                                                    <td className="text-center bg-white">
                                                        <div className="d-flex justify-content-center gap-2">
                                                            <button
                                                                className="btn btn-success btn-sm px-2"
                                                                onClick={handleAddRow}
                                                                onKeyDown={handleAddButtonKeyDown}
                                                                title="Add Row"
                                                                ref={(el) => {
                                                                    addButtonRefs.current[perm.Id] = el;
                                                                }}
                                                            >
                                                                <i className="fa fa-plus"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm px-2"
                                                                onClick={() => handleRemoveRow(perm.Id)}
                                                                title="Remove Row"
                                                                disabled={permissions.length === 1}
                                                            >
                                                                <i className="fa fa-minus"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {permissions.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="text-center text-muted py-4 bg-white">
                                                        No permissions added yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </fieldset>

                            <div className="d-flex align-items-center gap-3 mt-4 pt-3 border-top">
                                <button className="btn btn-primary" onClick={handleSavePermissions} disabled={!isEditingOpen}>
                                    <i className="fa fa-save me-2"></i> Save Permissions
                                </button>
                                <button className="btn btn-info" onClick={() => setShowCopyModal(true)} disabled={!isEditingOpen || !selectedRole}>
                                    <i className="fa fa-copy me-2"></i> Copy from another Role
                                </button>
                                <button
                                    className="btn btn-light text-dark border"
                                    onClick={() => setIsEditingOpen(!isEditingOpen)}
                                >
                                    <i className={`fa ${isEditingOpen ? "fa-lock" : "fa-pencil"} me-2`}></i>
                                    {isEditingOpen ? "Lock" : "Edit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copy from another Role Modal */}
            {showCopyModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fa fa-copy me-2"></i> Copy Permissions from Another Role
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowCopyModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group mb-3">
                                    <label className="text-label fw-bold">
                                        Source Role <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        value={sourceRole}
                                        onChange={(e) => setSourceRole(e.target.value)}
                                        className="form-control"
                                    >
                                        <option value="">-- Select Source Role --</option>
                                        {dropdowns.roles.map(role => (
                                            <option key={role.Id} value={role.Id}>{role.Name || `Role ${role.Id}`}</option>
                                        ))}
                                    </select>
                                    <small className="text-muted d-block mt-1">Select the role from which you want to copy permissions</small>
                                </div>

                                <div className="alert alert-info" role="alert">
                                    <i className="fa fa-info-circle me-2"></i>
                                    <strong>Target Role:</strong> {dropdowns.roles.find(r => r.Id == parseInt(selectedRole))?.Name || `Role ${selectedRole}`}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCopyModal(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleCopyPermissions} disabled={isCopying || !sourceRole}>
                                    {isCopying ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-2"></i> Copying...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-copy me-2"></i> Copy Permissions
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default PermissionMetrixs;
