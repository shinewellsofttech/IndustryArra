/**
 * usePagePermissions — Shared permission hook
 * 
 * Reads the logged-in user's role-wise permissions from localStorage
 * and returns button-level flags for the given module path.
 *
 * Usage:
 *   const { canAdd, canEdit, canDelete } = usePagePermissions('UserMasterCrud');
 *
 * @param {string} modulePath - Must match the ModulePath stored in authUser.permissions
 *                              (same as the 'to' field in Menu.js)
 * @returns {{ canView: boolean, canAdd: boolean, canEdit: boolean, canDelete: boolean }}
 */
const usePagePermissions = (modulePath) => {
    try {
        const authUser = JSON.parse(localStorage.getItem('authUser'));
        const permissions = authUser?.permissions;

        const isAdmin = authUser?.role === 1 || authUser?.roleId === 1 || authUser?.Role === 1 || 
                        authUser?.userType === 1 || authUser?.UserType === 1 || 
                        authUser?.userName?.toLowerCase() === 'admin' || 
                        authUser?.username?.toLowerCase() === 'admin' || 
                        authUser?.Name?.toLowerCase() === 'admin' ||
                        authUser?.roleNames?.toLowerCase().includes('admin');

        // If admin or no permissions array exists, allow everything
        if (isAdmin || !permissions || permissions.length === 0) {
            return { canView: true, canAdd: true, canEdit: true, canDelete: true };
        }

        const normModulePath = (modulePath || '').toLowerCase().replace(/^\//, '');

        const perm = permissions.find(
            (p) => (p.ModulePath || p.Path)?.toLowerCase().replace(/^\//, '') === normModulePath
        );

        // For DepartmentMaster & ActiveJobCards: if not explicitly configured in permissions, default to allowing full access
        if ((normModulePath === 'departmentmaster' || normModulePath === 'department-master' || normModulePath === 'activejobcards') && !perm) {
            return { canView: true, canAdd: true, canEdit: true, canDelete: true };
        }

        // Module not found in permission list — deny all restricted actions
        if (!perm) {
            return { canView: false, canAdd: false, canEdit: false, canDelete: false };
        }

        return {
            canView:   !!perm.IsView,
            canAdd:    !!perm.IsAdd,
            canEdit:   !!perm.IsEdit,
            canDelete: !!perm.IsDelete,
        };
    } catch (e) {
        // Fallback: allow everything if localStorage read fails
        return { canView: true, canAdd: true, canEdit: true, canDelete: true };
    }
};

export default usePagePermissions;
