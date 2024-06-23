import React from 'react';
import { SelectField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleNestedInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';

const LayoutPreference = ({ formData, setFormData, submitForm }) => {
  const navigate = useNavigate();

  const handleInputChange = handleNestedInputChange(setFormData); 

  const handlePrevious = () => {
    navigate('/score-values');
  };

  const handleSubmit = () => {
    submitForm();
    navigate('/dashboard');
  };

  return (
    <CenteredPane>
      <SelectField
        label="Planner Layout Preference"
        name="layout_preference.type"
        value={formData.layout_preference.type}
        onChange={handleInputChange}
      >
        <option value="kanban">Kanban</option>
        <option value="to-do-list">To-do List</option>
      </SelectField>
      {formData.layout_preference.type === 'to-do-list' && (
        <SelectField
          label="To-do List Subcategory"
          name="layout_preference.subcategory"
          value={formData.layout_preference.subcategory}
          onChange={handleInputChange}
        >
          <option value="structured and time-boxed">Structured and Time-Boxed</option>
          <option value="structured and un-time-boxed">Structured and Un-Time-Boxed</option>
          <option value="unstructured and time-boxed">Unstructured and Time-Boxed</option>
          <option value="unstructured and un-time-boxed">Unstructured and Un-Time-Boxed</option>
        </SelectField>
      )}
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </Pane>
    </CenteredPane>
  );
};

export default LayoutPreference;
