import requests

def process_user_data(user_data):
    colab_url = "https://colab.research.google.com/drive/1gG-ifaxVB8vkkf46EeKlvXkR0mKaTqk1?usp=drive_link:8000/process_user_data"  # Replace with your actual Google Colab URL
    
    response = requests.post(colab_url, json=user_data)
    if response.status_code == 200:
        return response.json().get('schedule')
    else:
        raise Exception(f"Colab processing failed: {response.text}")
