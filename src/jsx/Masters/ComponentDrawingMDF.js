import React, { useState, useEffect } from "react";
import { Fn_FillListData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { Container } from "reactstrap";

const ComponentDrawingMDF = ({ componentMasterId, ItemId }) => {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL1 = `${API_WEB_URLS.MASTER}/0/token/ComponentPhoto`;
  const dispatch = useDispatch();
  const [state, setState] = useState({ FillArray5: [] });

  useEffect(() => {
    const fetchDrawings = async () => {
      setLoading(true);
      const result = await Fn_FillListData(dispatch, setState, "FillArray5", `${API_URL1}/Id/${componentMasterId}`);

      if (Array.isArray(result) && result.length > 0) {
        setDrawings(result);
      } else {
        setDrawings([]);
      }
      setLoading(false);
    };

    if (componentMasterId) {
      fetchDrawings();
    } else {
      setDrawings([]);
      setLoading(false);
    }
  }, [componentMasterId, dispatch]);

  return (
    <Container style={{ padding: "0.5rem", border: "1px solid #cbd5e0", borderRadius: "4px", overflowX: "auto" }}>
      {loading ? (
        "Loading..."
      ) : drawings.length === 0 ? (
        "No drawings available."
      ) : (
        <div style={{ display: "flex", flexWrap: "nowrap", gap: "10px", justifyContent: "flex-start" }}>
          {drawings.map((drawing, index) => (
            <div
              key={drawing.Id}
              style={{
                textAlign: "center",
                border: "1px solid #ccc",
                padding: "0.5rem",
                borderRadius: "4px",
                flex: index === 0 ? "2" : "1",
                minWidth: index === 0 ? "300px" : "150px",
              }}
            >
              <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <img
                  src={drawing.Base64String}
                  alt={drawing.Name}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
};

export default ComponentDrawingMDF;
