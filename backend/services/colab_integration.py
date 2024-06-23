import requests
import urllib3

# Disable InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def process_user_data(user_data):
    colab_url = "https://d8f8-34-125-178-146.ngrok-free.app/process_user_data"  # Replace with your actual Google Colab URL
    
    try:
        # Log the request details
        print("Sending request to:", colab_url)
        print("User data being sent:", user_data)
        
        # Send the POST request with SSL verification
        response = requests.post(colab_url, json=user_data, verify=False)
        
        # Log the response status and content
        print("Response status code:", response.status_code)
        print("Response content:", response.text)
        
        # Check if the response is successful
        if response.status_code == 200:
            return response.json()  # Return the full JSON response
        else:
            raise Exception(f"Colab processing failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise
