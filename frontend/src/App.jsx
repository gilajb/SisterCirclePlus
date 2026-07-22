import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SymptomCheck from "./pages/SymptomCheck.jsx";
import Results from "./pages/Results.jsx";
import CHW from "./pages/CHW.jsx";
import Pricing from "./pages/Pricing.jsx";
import DoctorPortal from "./pages/DoctorPortal.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Settings from "./pages/Settings.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import Contact from "./pages/Contact.jsx";
import GuardianConsent from "./pages/GuardianConsent.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/symptom-check" element={<SymptomCheck />} />
      <Route path="/results" element={<Results />} />
      <Route path="/chw" element={<CHW />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/doctor-portal" element={<DoctorPortal />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/guardian-consent" element={<GuardianConsent />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
