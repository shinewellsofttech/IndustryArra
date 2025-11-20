import React, { useState, useEffect } from "react";
import { Fn_FillListData } from "../../store/Functions";
import { API_WEB_URLS } from "../../constants/constAPI";
import { useDispatch } from "react-redux";
import { Container, Row, Col } from "reactstrap";

const ComponentDrawing = ({ componentMasterId, ItemId }) => {
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
    <div style={{ 
      width: "100%", 
      height: "100%", // Use full height of parent
      padding: "0", 
      margin: "0",
      display: "flex",
      flexDirection: "column",
    }}>
      {loading ? (
        <div style={{ 
          textAlign: "center", 
          padding: "2rem",
          fontSize: "1.1rem",
          color: "#666",
          flex: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          Loading...
        </div>
      ) : drawings.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "2rem",
          fontSize: "1.1rem",
          color: "#666",
          flex: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          No drawings available.
        </div>
      ) : (
        <div style={{ 
          width: "100%", 
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* First Image - Takes most available space */}
          <div style={{ 
            width: "100%", 
            flex: "1", // Take available space but not unlimited
            marginBottom: "1rem",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <img
              src={drawings[0].Base64String}
              alt={drawings[0].Name}
              style={{
                width: "100%",
                maxWidth: "600px", // Reasonable max size
                maxHeight: "400px", // Limit height so other sections don't disappear
                height: "auto", // Maintains aspect ratio
                objectFit: "contain", // Fit within bounds while maintaining ratio
                borderRadius: "8px",
                border: "2px solid #e2e8f0",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
              }}
            />
          </div>

          {/* Remaining Images - Smaller grid */}
          {drawings.length > 1 && (
            <div style={{ 
              display: "grid",
              gridTemplateColumns: drawings.length === 2 ? "1fr 1fr" : drawings.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: "0.75rem",
              width: "100%"
            }}>
              {drawings.slice(1).map((drawing) => (
                <div 
                  key={drawing.Id} 
                  style={{ 
                    textAlign: "center",
                    border: "2px solid #e2e8f0", 
                    padding: "0.5rem", 
                    borderRadius: "8px",
                    backgroundColor: "#f8f9fa",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  <img
                    src={drawing.Base64String}
                    alt={drawing.Name}
                    style={{
                      width: "100%",
                      maxWidth: "200px", // Reasonable size for grid images
                      maxHeight: "150px", // Limit height
                      height: "auto",
                      objectFit: "contain",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComponentDrawing;
