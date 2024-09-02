import React, { useEffect } from 'react';
import { SelectField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleNestedInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const LayoutPreference = ({ formData, setFormData, submitForm }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize subcategory if it's not set and type is 'to-do-list'
    if (formData.layout_preference.type === 'to-do-list' && !formData.layout_preference.subcategory) {
      setFormData(prevData => ({
        ...prevData,
        layout_preference: {
          ...prevData.layout_preference,
          subcategory: 'structured-timeboxed'
        }
      }));
    }
  }, [formData.layout_preference.type, formData.layout_preference.subcategory, setFormData]);

  const handlePrevious = () => {
    navigate('/energy-patterns');
  };

  const handleSubmit = () => {
    submitForm();
    navigate('/dashboard');
  };

  const handleLayoutTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prevData => ({
      ...prevData,
      layout_preference: {
        type: newType,
        subcategory: newType === 'to-do-list' ? 'structured-timeboxed' : ''
      }
    }));
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">Layout Preferences</Heading>
      <SelectField
        label="Planner Layout Preference"
        name="layout_preference.type"
        value={formData.layout_preference.type}
        onChange={handleLayoutTypeChange}
      >
        <option value="kanban">Kanban</option>
        <option value="to-do-list">To-do List</option>
      </SelectField>
      {formData.layout_preference.type === 'to-do-list' && (
        <SelectField
          label="To-do List Subcategory"
          name="layout_preference.subcategory"
          value={formData.layout_preference.subcategory}
          onChange={handleNestedInputChange(setFormData)}
        >
          <option value="structured-timeboxed">Structured and Time-Boxed</option>
          <option value="structured-untimeboxed">Structured and Un-Time-Boxed</option>
          <option value="unstructured-timeboxed">Unstructured and Time-Boxed</option>
          <option value="unstructured-untimeboxed">Unstructured and Un-Time-Boxed</option>
        </SelectField>
      )}
      
      <OnboardingNav onBack={handlePrevious} onNext={handleSubmit} />
    </CenteredPane>
  );
};

export default LayoutPreference;