const API_BASE_URL = 'http://localhost:8000/api'; 

export const categorizeTask = async (taskText:  string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categorize_task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: taskText })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }

      const data = await response.json();
      return { categories: data.categories || ['Uncategorized'] };
    } catch (error) {
      console.error('Error categorizing task:', error);
      return { categories: ['Uncategorized'] };
    }
  };