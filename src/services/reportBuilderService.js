import axios from "axios";
import { API_WEB_URLS } from "../constants/constAPI";

const LOCAL_FALLBACK = "http://localhost:56810/api/V1/";

// Resilient API requester with automatic local development fallback
const requestApi = async (method, path, data = null, extraConfig = {}) => {
  const primaryBase = API_WEB_URLS.BASE || LOCAL_FALLBACK;
  try {
    const url = `${primaryBase}${path}`;
    const res = await axios({ method, url, data, ...extraConfig });
    return res;
  } catch (err) {
    // If remote fails or is unreachable and primary is not local, fallback to local IIS Express
    if (primaryBase !== LOCAL_FALLBACK) {
      try {
        const fallbackUrl = `${LOCAL_FALLBACK}${path}`;
        const res = await axios({ method, url: fallbackUrl, data, ...extraConfig });
        return res;
      } catch (fallbackErr) {
        throw err;
      }
    }
    throw err;
  }
};

export const reportBuilderService = {
  // 1. Get all active entities
  getEntities: async () => {
    const res = await requestApi("get", API_WEB_URLS.REPORT_BUILDER_ENTITIES);
    return res.data;
  },

  // 2. Get active fields for an entity
  getFields: async (entityId) => {
    const res = await requestApi("get", `${API_WEB_URLS.REPORT_BUILDER_FIELDS}/${entityId}`);
    return res.data;
  },

  // 3. Get related entities classified by distance
  getRelatedEntities: async (sourceEntityId) => {
    const res = await requestApi("get", `${API_WEB_URLS.REPORT_BUILDER_RELATED}/${sourceEntityId}`);
    return res.data;
  },

  // 4. Compute BFS join path
  getJoinPath: async (targetEntityIds) => {
    const res = await requestApi("post", API_WEB_URLS.REPORT_BUILDER_JOIN_PATH, { entityIds: targetEntityIds }, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  // 5. Estimate row count
  estimateRowCount: async (config, runtimeParams = null) => {
    const res = await requestApi("post", API_WEB_URLS.REPORT_BUILDER_ESTIMATE, {
      config,
      runtimeParamValues: runtimeParams
    });
    return res.data;
  },

  // 6. Execute ad-hoc query
  executeQuery: async (config, pageNumber = 1, pageSize = 100, runtimeParams = null) => {
    const res = await requestApi("post", API_WEB_URLS.REPORT_BUILDER_EXECUTE, {
      config,
      pageNumber,
      pageSize,
      runtimeParamValues: runtimeParams
    });
    return res.data;
  },

  // 7. Save report
  saveReport: async (configJsonDto) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("post", `${API_WEB_URLS.REPORT_BUILDER_SAVE}/${userId}/token`, configJsonDto, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  // 8. Update report
  updateReport: async (reportId, configJsonDto) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("put", `${API_WEB_URLS.REPORT_BUILDER_UPDATE}/${reportId}/${userId}/token`, configJsonDto, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  // 9. Clone report
  cloneReport: async (reportId) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("post", `${API_WEB_URLS.REPORT_BUILDER_CLONE}/${reportId}/${userId}/token`);
    return res.data;
  },

  // 10. Delete report
  deleteReport: async (reportId) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("delete", `${API_WEB_URLS.REPORT_BUILDER_DELETE}/${reportId}/${userId}/token`);
    return res.data;
  },

  // 11. Get all saved reports accessible to current user
  getSavedReports: async () => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("get", `${API_WEB_URLS.REPORT_BUILDER_SAVED_REPORTS}/${userId}/token`);
    return res.data;
  },

  // 12. Get single report configuration
  getReportConfig: async (reportId) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("get", `${API_WEB_URLS.REPORT_BUILDER_GET_CONFIG}/${reportId}/${userId}/token`);
    return res.data;
  },

  // 13. Get menu reports for sidebar (filtered by current user)
  getMenuReports: async () => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("get", `${API_WEB_URLS.REPORT_BUILDER_MENU_REPORTS}/${userId}/token`);
    return res.data;
  },

  // 14. Get version history
  getVersionHistory: async (reportId) => {
    const res = await requestApi("get", `${API_WEB_URLS.REPORT_BUILDER_VERSIONS}/${reportId}`);
    return res.data;
  },

  // 15. Restore version
  restoreVersion: async (versionId) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await requestApi("post", `${API_WEB_URLS.REPORT_BUILDER_RESTORE}/${versionId}/${userId}/token`);
    return res.data;
  },

  // 16. Export CSV
  exportCSV: async (config, runtimeParams = null) => {
    const res = await requestApi(
      "post",
      API_WEB_URLS.REPORT_BUILDER_EXPORT_CSV,
      { config, runtimeParamValues: runtimeParams },
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${config.reportTitle || "Report"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // 17. Export PDF / Printable HTML
  exportPDF: async (config, runtimeParams = null) => {
    const res = await requestApi(
      "post",
      API_WEB_URLS.REPORT_BUILDER_EXPORT_PDF,
      { config, runtimeParamValues: runtimeParams },
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/html" }));
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
};
