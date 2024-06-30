import requests
import urllib3

# Disable InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

COLAB_BASE_URL = "https://d051-34-87-25-142.ngrok-free.app" 

def process_user_data(user_data):
    colab_url = f"{COLAB_BASE_URL}/process_user_data" # Replace with your actual Google Colab URL
    
    try:
        # Send the POST request with SSL verification
        response = requests.post(colab_url, json=user_data, verify=False)
        
        # Check if the response is successful
        if response.status_code == 200:
            return response.json()  # Return the full JSON response
        else:
            raise Exception(f"Colab processing failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

def categorize_task(task):
    url = f"{COLAB_BASE_URL}/categorize_task"
    
    try:
        response = requests.post(url, json={"task": task}, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('category', 'Uncategorized')
        else:
            raise Exception(f"Task categorization failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise