import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import ThemeContext from "./context/ThemeContext";

// Import Icons Globally to prevent empty boxes/missing icons
import "./icons/font-awesome/css/all.min.css";
import "./icons/flaticon/flaticon.css";
import "./icons/flaticon_1/flaticon_1.css";
import "./icons/line-awesome/css/line-awesome.min.css";
import "./icons/simple-line-icons/css/simple-line-icons.css";
import "./icons/themify-icons/css/themify-icons.css";

// Inject global style
const fontStyle = document.createElement('style');
fontStyle.innerHTML = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

`;
document.head.appendChild(fontStyle);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeContext>
          <App />
        </ThemeContext>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
