import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Voter from './voters_table.jsx'
import AdminVotingUI from "./AdminVotingUI";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Voter />
    <AdminVotingUI />
  </StrictMode>,
)
