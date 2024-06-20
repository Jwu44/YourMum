import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PersonalDetails from './pages/PersonalDetails';
import WorkTimes from './pages/WorkTimes';
import Tasks from './pages/Tasks';
import EnergyLevels from './pages/EnergyLevels';
import ExerciseRoutine from './pages/ExerciseRoutine';
import Relationships from './pages/Relationships';
import FunActivities from './pages/FunActivities';
import Ambitions from './pages/Ambitions';
import ScoreValues from './pages/ScoreValues';
import LayoutPreference from './pages/LayoutPreference';
import LandingPage from './pages/LandingPage';

function App() {
  const [response, setResponse] = useState(null); // State for storing the response
  const [loading, setLoading] = useState(false); // State for loading
  const [error, setError] = useState(null); // State for error
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    work_start_time: "",
    work_end_time: "",
    tasks: "",
    energy_levels: [],
    exercise_routine: "",
    relationships: "",
    fun_activities: [],
    ambitions: { short_term: "", long_term: "" },
    priorities: { health: "", relationships: "", fun_activities: "", ambitions: "" },
    layout_preference: { type: "", subcategory: "" }
  });

  const submitForm = () => {
    setLoading(true);
    setError(null);
    console.log("Form Data Before Submission:", formData); // Log form data before submission

    fetch('http://localhost:8000/api/submit_data', {  // Replace with your actual backend URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      setLoading(false);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log("Response from server:", data);
      setResponse(data.schedule); // Store the schedule in the state
    })
    .catch(error => {
      setLoading(false);
      console.error("Error submitting form:", error);
      setError("There was an error submitting the form. Please try again.");
      setResponse(null); // Clear any previous response
    });
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} /> 
        <Route path="/personal-details" element={<PersonalDetails formData={formData} setFormData={setFormData} />} />
        <Route path="/work-times" element={<WorkTimes formData={formData} setFormData={setFormData} />} />
        <Route path="/tasks" element={<Tasks formData={formData} setFormData={setFormData} />} />
        <Route path="/energy-levels" element={<EnergyLevels formData={formData} setFormData={setFormData} />} />
        <Route path="/exercise-routine" element={<ExerciseRoutine formData={formData} setFormData={setFormData} />} />
        <Route path="/relationships" element={<Relationships formData={formData} setFormData={setFormData} />} />
        <Route path="/fun-activities" element={<FunActivities formData={formData} setFormData={setFormData} />} />
        <Route path="/ambitions" element={<Ambitions formData={formData} setFormData={setFormData} />} />
        <Route path="/score-values" element={<ScoreValues formData={formData} setFormData={setFormData} />} />
        <Route path="/layout-preference" element={<LayoutPreference formData={formData} setFormData={setFormData} submitForm={submitForm} />} />
        <Route path="/dashboard" element={<Dashboard response={response} />} />
      </Routes>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
    </Router>
  );
}

export default App;
