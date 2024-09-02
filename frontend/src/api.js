const API_BASE_URL = 'http://localhost:8000/api'; 

export const categorizeTask = async (taskText) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categorize_task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: taskText })
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json();
      return {
        text: taskText,
        categories: [data.category]
      };
    } catch (error) {
      console.error("Error categorizing task:", error);
      return {
        text: taskText,
        categories: ['Uncategorized']
      };
    }
  };