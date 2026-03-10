import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Fn_FillListData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";

const PageList_CategoryMaster = () => {
  const [state, setState] = useState({ FillArray: [], isProgress: true });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const API_URL = `${API_WEB_URLS.MASTER}/0/token/Category`;

  useEffect(() => {
    const fetchData = async () => {
      await Fn_FillListData(dispatch, setState, "FillArray", `${API_URL}/Id/0`);
      setState(prev => ({ ...prev, isProgress: false }));
    };
    fetchData();
  }, [dispatch]);

  const handleAdd = () => {
    navigate("/AddCategory", { state: { Id: 0 } });
  };

  const handleEdit = (Id) => {
    navigate("/AddCategory", { state: { Id } });
  };

  return (
    <div className="row">
      <div className="col-lg-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title">Category Master</h4>
            <button className="btn btn-primary" onClick={handleAdd}>Add Category</button>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.FillArray && state.FillArray.length > 0 ? (
                    state.FillArray.map((row, idx) => (
                      <tr key={row.Id || idx}>
                        <td>{idx + 1}</td>
                        <td>{row.Name}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary me-2" onClick={() => handleEdit(row.Id)}>Edit</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center">No records found</td>
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

export default PageList_CategoryMaster;
