import React from 'react';
import { Pane, Heading, TextInputField, SelectField, Button } from 'evergreen-ui';
import { handleSimpleInputChange, handleNestedInputChange } from '../helper'; // Ensure you have these helpers

const Dashboard = ({ formData, setFormData, response, submitForm }) => {
  const handleSimpleChange = handleSimpleInputChange(setFormData);
  const handleNestedChange = handleNestedInputChange(setFormData);

  return (
    <Pane display="flex" height="100vh">
      {/* Left Column: Editable Input Forms */}
      <Pane width="30%" padding={16} background="tint1" overflowY="auto">
        <Heading size={700} marginBottom={16}>Edit Inputs</Heading>
        <TextInputField
          label="Work Start Time"
          name="work_start_time"
          value={formData.work_start_time}
          onChange={handleSimpleChange}
          placeholder="Enter your work start time"
        />
        <TextInputField
          label="Work End Time"
          name="work_end_time"
          value={formData.work_end_time}
          onChange={handleSimpleChange}
          placeholder="Enter your work end time"
        />
        <TextInputField
          label="Tasks"
          name="tasks"
          value={formData.tasks}
          onChange={handleSimpleChange}
          placeholder="Enter your tasks separated by commas"
          marginBottom={16}
        />
        <TextInputField
          label="Health Priority"
          name="priorities.health"
          type="number"
          value={formData.priorities.health}
          onChange={handleNestedChange}
          placeholder="Health priority percentage"
        />
        <TextInputField
          label="Relationships Priority"
          name="priorities.relationships"
          type="number"
          value={formData.priorities.relationships}
          onChange={handleNestedChange}
          placeholder="Relationships priority percentage"
        />
        <TextInputField
          label="Fun Activities Priority"
          name="priorities.fun_activities"
          type="number"
          value={formData.priorities.fun_activities}
          onChange={handleNestedChange}
          placeholder="Fun activities priority percentage"
        />
        <TextInputField
          label="Ambitions Priority"
          name="priorities.ambitions"
          type="number"
          value={formData.priorities.ambitions}
          onChange={handleNestedChange}
          placeholder="Ambitions priority percentage"
        />
        <SelectField
        label="Planner Layout Preference"
        name="layout_preference.type"
        value={formData.layout_preference.type}
        onChange={handleNestedChange}
        >
          <option value="kanban">Kanban</option>
          <option value="to-do-list">To-do List</option>
        </SelectField>
        {formData.layout_preference.type === 'to-do-list' && (
          <SelectField
            label="To-do List Subcategory"
            name="layout_preference.subcategory"
            value={formData.layout_preference.subcategory}
            onChange={handleNestedChange}
          >
            <option value="structured-timeboxed">Structured and Time-Boxed</option>
            <option value="structured-untimeboxed">Structured and Un-Time-Boxed</option>
            <option value="unstructured-timeboxed">Unstructured and Time-Boxed</option>
            <option value="unstructured-untimeboxed">Unstructured and Un-Time-Boxed</option>
          </SelectField>
        )}
        <Button appearance="primary" onClick={submitForm} marginTop={16}>Update Schedule</Button>
      </Pane>

      {/* Right Column: Display Generated Schedule */}
      <Pane width="70%" padding={16} background="tint2" overflowY="auto">
        <Heading size={700} marginBottom={16}>Generated Schedule</Heading>
        {response ? (
          <Pane padding={16} background="white" borderRadius={4} elevation={1}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{response}</pre>
          </Pane>
        ) : (
          <Heading size={500} marginTop={32}>Generating your schedule...</Heading>
        )}
      </Pane>
    </Pane>
  );
};

export default Dashboard;
