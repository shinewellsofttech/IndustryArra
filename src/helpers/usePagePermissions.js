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

        // If no permissions array exists (super admin / dev), allow everything
        if (!permissions || permissions.length === 0) {
            return { canView: true, canAdd: true, canEdit: true, canDelete: true };
        }

        const perm = permissions.find(
            (p) => (p.ModulePath || p.Path)?.toLowerCase() === modulePath?.toLowerCase()
        );

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
