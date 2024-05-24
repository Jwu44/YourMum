import React, { useState } from 'react';
import { TextInputField } from 'evergreen-ui';
import PlannerMenu from '../components/PlannerMenu';
import UserEnergyLevelLineChart from '../components/UserEnergyLevelLineChart';

const Dashboard = () => {
    const [formData, setFormData] = useState({
        occupation: "",
        freeTime: "",
        plannerGoal: ""
    });

    const handleInputChange = (event) => {
      // event.preventDefault();
        const { name, value } = event.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const plannerType = ["Calendar", "To do list", "Priority-based number list"]

    return (
      <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
        <form style={{width: "50%"}}>
          <TextInputField
            label="Occupation"
            name="occupation"
            value={formData.occupation}
            onChange={handleInputChange}
            placeholder="Enter your occupation"
          />

          <TextInputField
            label="How do you like to spend your free time?"
            name="freeTime"
            value={formData.freeTime}
            onChange={handleInputChange}
            placeholder="Describe how you like to spend your free time"
          />

          <TextInputField
            label="What are you using Myself for?"
            name="plannerGoal"
            value={formData.plannerGoal}
            onChange={handleInputChange}
            placeholder="Enter your goal?"
          />
        </form>
        <div>
          <PlannerMenu plannerType={plannerType}/>
        </div>
        <UserEnergyLevelLineChart />
      </div>
    );
};

export default Dashboard;
