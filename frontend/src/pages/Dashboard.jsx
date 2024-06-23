import React from 'react';
import { Pane, Heading, TextInputField, Button, Textarea } from 'evergreen-ui';
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
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleSimpleChange}
          placeholder="Enter your name"
        />
        <TextInputField
          label="Age"
          name="age"
          type="number"
          value={formData.age}
          onChange={handleSimpleChange}
          placeholder="Enter your age"
        />
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
        <Textarea
          label="Tasks"
          name="tasks"
          value={formData.tasks}
          onChange={handleSimpleChange}
          placeholder="Enter your tasks separated by commas"
          marginBottom={16}
        />
        <Textarea
          label="Exercise Routine"
          name="exercise_routine"
          value={formData.exercise_routine}
          onChange={handleSimpleChange}
          placeholder="Describe your exercise routine"
          marginBottom={16}
        />
        <Textarea
          label="Relationships"
          name="relationships"
          value={formData.relationships}
          onChange={handleSimpleChange}
          placeholder="Describe your relationships"
          marginBottom={16}
        />
        <Textarea
          label="Fun Activities"
          name="fun_activities"
          value={formData.fun_activities}
          onChange={handleSimpleChange}
          placeholder="Enter your fun activities separated by commas"
          marginBottom={16}
        />
        <TextInputField
          label="Short Term Ambitions"
          name="ambitions.short_term"
          value={formData.ambitions.short_term}
          onChange={handleNestedChange}
          placeholder="Short term ambitions"
        />
        <TextInputField
          label="Long Term Ambitions"
          name="ambitions.long_term"
          value={formData.ambitions.long_term}
          onChange={handleNestedChange}
          placeholder="Long term ambitions"
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
          <Heading size={500} marginTop={32}>No schedule generated. Please complete the form.</Heading>
        )}
      </Pane>
    </Pane>
  );
};

export default Dashboard;
