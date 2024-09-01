import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PersonalDetails from './pages/PersonalDetails';
import WorkTimes from './pages/WorkTimes';
import Tasks from './pages/Tasks';
import EnergyPattern from './pages/EnergyPattern';
import Priorties from './pages/Priorties';
import LayoutPreference from './pages/LayoutPreference';
import LandingPage from './pages/LandingPage';
import { submitFormData } from './helper';

function App() {
  const [response, setResponse] = useState(null); // State for storing the response
  const [loading, setLoading] = useState(false); // State for loading
  const [error, setError] = useState(null); // State for error
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    work_start_time: "",
    work_end_time: "",
    tasks: [],
    energy_levels: [],
    priorities: { health: "", relationships: "", fun_activities: "", ambitions: "" },
    layout_preference: { type: "", subcategory: "" }
  });

  const submitForm = () => {
    submitFormData(formData, setLoading, setError, setResponse);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} /> 
        <Route path="/personal-details" element={<PersonalDetails formData={formData} setFormData={setFormData} />} />
        <Route path="/work-times" element={<WorkTimes formData={formData} setFormData={setFormData} />} />
        <Route path="/tasks" element={<Tasks formData={formData} setFormData={setFormData} />} />
        <Route path="/energy-patterns" element={<EnergyPattern formData={formData} setFormData={setFormData} />} />
        <Route path="/priorties" element={<Priorties formData={formData} setFormData={setFormData} />} />
        <Route path="/layout-preference" element={<LayoutPreference formData={formData} setFormData={setFormData} submitForm={submitForm} />} />
        <Route path="/dashboard" element={<Dashboard formData={formData} setFormData={setFormData} response={response} setResponse={submitForm} />} />
      </Routes>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
    </Router>
  );
}

export default App;
