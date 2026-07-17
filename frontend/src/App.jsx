import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SymptomCheck from "./pages/SymptomCheck.jsx";
import Results from "./pages/Results.jsx";
import CHW from "./pages/CHW.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/symptom-check" element={<SymptomCheck />} />
      <Route path="/results" element={<Results />} />
      <Route path="/chw" element={<CHW />} />
    </Routes>
  );
}
