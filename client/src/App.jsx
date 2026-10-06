import { Routes, Route, Navigate } from "react-router-dom";
import Missao from "./pages/Missao.jsx";
import Premio from "./pages/Premio.jsx";
import Admin from "./pages/Admin.jsx";
import QrCode from "./pages/QrCode.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/missao" replace />} />
      <Route path="/missao" element={<Missao />} />
      <Route path="/premio" element={<Premio />} />
      <Route path="/qrcode" element={<QrCode />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/missao" replace />} />
    </Routes>
  );
}
