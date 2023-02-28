import React from 'react';
//import ReactDOM from 'react-dom/client'; //REACT 18
import ReactDOM from 'react-dom'; //REACT 16
import './index.css';
import App from './App';

//REACT 18
/* const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); */

//REACT 16
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
