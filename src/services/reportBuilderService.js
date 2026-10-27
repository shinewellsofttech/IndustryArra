import axios from "axios";
import { API_WEB_URLS } from "../constants/constAPI";

const BASE_URL = API_WEB_URLS.BASE;

export const reportBuilderService = {
  // 1. Get all active entities
  getEntities: async () => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_ENTITIES}`);
    return res.data;
  },

  // 2. Get active fields for an entity
  getFields: async (entityId) => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_FIELDS}/${entityId}`);
    return res.data;
  },

  // 3. Get related entities classified by distance
  getRelatedEntities: async (sourceEntityId) => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_RELATED}/${sourceEntityId}`);
    return res.data;
  },

  // 4. Compute BFS join path
  getJoinPath: async (targetEntityIds) => {
    const res = await axios.post(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_JOIN_PATH}`, targetEntityIds, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  // 5. Estimate row count
  estimateRowCount: async (config, runtimeParams = null) => {
    const res = await axios.post(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_ESTIMATE}`, {
      config,
      runtimeParamValues: runtimeParams
    });
    return res.data;
  },

  // 6. Execute ad-hoc query
  executeQuery: async (config, pageNumber = 1, pageSize = 100, runtimeParams = null) => {
    const res = await axios.post(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_EXECUTE}`, {
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
    const res = await axios.post(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_SAVE}/${userId}/token`, configJsonDto, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  // 8. Update report
  updateReport: async (reportId, configJsonDto) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await axios.put(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_UPDATE}/${reportId}/${userId}/token`, configJsonDto, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  },

  // 9. Clone report
  cloneReport: async (reportId) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await axios.post(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_CLONE}/${reportId}/${userId}/token`);
    return res.data;
  },

  // 10. Delete report
  deleteReport: async (reportId) => {
    const res = await axios.delete(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_DELETE}/${reportId}`);
    return res.data;
  },

  // 11. Get all saved reports
  getSavedReports: async () => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_SAVED_REPORTS}`);
    return res.data;
  },

  // 12. Get single report configuration
  getReportConfig: async (reportId) => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_GET_CONFIG}/${reportId}`);
    return res.data;
  },

  // 13. Get menu reports for sidebar
  getMenuReports: async () => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_MENU_REPORTS}`);
    return res.data;
  },

  // 14. Get version history
  getVersionHistory: async (reportId) => {
    const res = await axios.get(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_VERSIONS}/${reportId}`);
    return res.data;
  },

  // 15. Restore version
  restoreVersion: async (versionId) => {
    const userData = JSON.parse(localStorage.getItem("authUser")) || {};
    const userId = userData.id || userData.UserId || 1;
    const res = await axios.post(`${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_RESTORE}/${versionId}/${userId}/token`);
    return res.data;
  },

  // 16. Export CSV
  exportCSV: async (config, runtimeParams = null) => {
    const response = await axios.post(
      `${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_EXPORT_CSV}`,
      { config, runtimeParamValues: runtimeParams },
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${config.reportTitle || "Report"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // 17. Export PDF / Printable HTML
  exportPDF: async (config, runtimeParams = null) => {
    const response = await axios.post(
      `${BASE_URL}${API_WEB_URLS.REPORT_BUILDER_EXPORT_PDF}`,
      { config, runtimeParamValues: runtimeParams },
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/html" }));
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
};
