import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Fn_FillListData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { HubConnectionBuilder } from "@microsoft/signalr";

const PageList_UserMasterCrud = () => {
  const [state, setState] = useState({ FillArray: [], isProgress: true });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const connectionRef = useRef(null);

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/UserMaster`;

  const fetchData = useCallback(async () => {
    await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
    setState(prev => ({ ...prev, isProgress: false }));
  }, [dispatch, API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let connection = null;

    const startHub = async () => {
      try {
        const hubUrl = API_WEB_URLS.BASE.replace("/api/V1/", "/userStatusHub").replace("/api/v1/", "/userStatusHub");
        connection = new HubConnectionBuilder()
          .withUrl(hubUrl)
          .withAutomaticReconnect()
          .build();

        connectionRef.current = connection;

        connection.on("UserStatusChanged", (userId, isOnline) => {
          console.log(`⚡ Live status change received for User ID: ${userId}, Online: ${isOnline}. Refreshing list...`);
          fetchData();
        });

        await connection.start();
        console.log("✅ User List SignalR listener connected.");
      } catch (err) {
        console.warn("❌ User List SignalR listener connection failed:", err);
      }
    };

    startHub();

    return () => {
      if (connection) {
        connection.stop().catch(err => console.warn("Error stopping list SignalR connection:", err));
      }
    };
  }, [fetchData]);

  const handleForceLogout = async (connectionId) => {
    if (connectionRef.current && connectionId) {
      if (window.confirm("Are you sure you want to force logout this session?")) {
        try {
          await connectionRef.current.invoke("ForceLogoutSession", connectionId);
          console.log("⚡ Sent force logout request for connection:", connectionId);
        } catch (err) {
          console.error("❌ Failed to send force logout command:", err);
        }
      }
    } else {
      console.warn("⚠️ SignalR connection not ready or invalid Connection ID");
    }
  };

  const handleAdd = () => {
    navigate("/AddUserMasterCrud", { state: { Id: 0 } });
  };

  const handleEdit = (Id) => {
    navigate("/AddUserMasterCrud", { state: { Id } });
  };

  return (
    <div className="row">
      <div className="col-lg-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title">User Master</h4>
            <button className="btn btn-primary" onClick={handleAdd}>Add User</button>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>User Name</th>
                    <th>Mobile No</th>
                    <th>Email</th>
                    <th>Role ID</th>
                    <th>Is Active</th>
                    <th>Status</th>
                    <th>Login Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.FillArray && state.FillArray.length > 0 ? (
                    state.FillArray.map((row, idx) => (
                      <tr key={row.Id || row.UserId || idx}>
                        <td>{idx + 1}</td>
                        <td>{row.Name}</td>
                        <td>{row.UserName}</td>
                        <td>{row.MobileNo}</td>
                        <td>{row.Email}</td>
                        <td>{row.F_UserRole}</td>
                        <td>{row.IsActive ? "Yes" : "No"}</td>
                        <td>
                          {(row.IsOnline || row.isOnline) ? (
                            <span className="badge badge-success light">Online</span>
                          ) : (
                            <span className="badge badge-danger light">Offline</span>
                          )}
                        </td>
                        <td>
                          {(row.ActiveSessions || row.activeSessions) && (row.ActiveSessions || row.activeSessions).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {(row.ActiveSessions || row.activeSessions).map((session, sIdx) => (
                                <div key={sIdx} className="p-1 border rounded bg-light d-flex justify-content-between align-items-center" style={{ fontSize: '11px', lineHeight: '1.2' }}>
                                  <div>
                                    <strong>Device:</strong> {session.DeviceName || session.deviceName || "Unknown"}<br />
                                    <strong>IP:</strong> {session.IpAddress || session.ipAddress || "Unknown"}<br />
                                    <strong>MAC:</strong> {session.MacId || session.macId || "Unknown"}
                                  </div>
                                  {(session.ConnectionId || session.connectionId) && (
                                    <button 
                                      className="btn btn-xs btn-danger p-1 ms-2" 
                                      style={{ fontSize: '9px', padding: '2px 5px', minWidth: '50px' }}
                                      onClick={() => handleForceLogout(session.ConnectionId || session.connectionId)}
                                      title="Force Logout Device"
                                    >
                                      Logout
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '11px' }}>No active sessions</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-secondary me-2" onClick={() => handleEdit(row.Id || row.UserId)}>Edit</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center">No records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageList_UserMasterCrud;
