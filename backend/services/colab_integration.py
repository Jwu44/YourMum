import requests

def process_user_data(user_data):
    colab_url = "https://9416-34-142-176-15.ngrok-free.app/process_user_data"  # Replace with your actual Google Colab URL
    
    try:
        # Log the request details
        print("Sending request to:", colab_url)
        print("User data being sent:", user_data)
        
        # Send the POST request
        response = requests.post(colab_url, json=user_data)
        
        # Log the response status and content
        print("Response status code:", response.status_code)
        print("Response content:", response.text)
        
        # Check if the response is successful
        if response.status_code == 200:
            return response.json().get('schedule')
        else:
            raise Exception(f"Colab processing failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

# Example usage
if __name__ == "__main__":
    user_data = {
        "name": "John Doe",
        "age": 30,
        "work_schedule": {
            "employment_type": "full-time",
            "days": {
                "Monday": "9am-5pm",
                "Tuesday": "9am-5pm",
                "Wednesday": "9am-5pm",
                "Thursday": "9am-5pm",
                "Friday": "9am-5pm"
            }
        },
        "energy_levels": {
            "1am": "0%",
            "2am": "0%",
            "3am": "0%",
            "4am": "0%",
            "5am": "0%",
            "6am": "0%",
            "7am": "30%",
            "8am": "50%",
            "9am": "60%",
            "10am": "80%",
            "11am": "100%",
            "12pm": "90%",
            "1pm": "80%",
            "2pm": "80%",
            "3pm": "70%",
            "4pm": "60%",
            "5pm": "50%",
            "6pm": "60%",
            "7pm": "70%",
            "8pm": "60%",
            "9pm": "50%",
            "10pm": "40%",
            "11pm": "30%",
            "12am": "0%"
        },
        "tasks": [
            {"task": "Task 1", "importance": 50},
            {"task": "Task 2", "importance": 30},
            {"task": "Task 3", "importance": 20}
        ],
        "exercise_routine": "Jogging in the morning",
        "relationships": "Spending time with family and friends",
        "fun_activities": ["Reading", "Watching movies"],
        "ambitions": {
            "short_term": ["Learn Python", "Build a project"],
            "long_term": ["Become a data scientist"]
        },
        "priorities": {
            "health": 80,
            "relationships": 70,
            "fun_activities": 60,
            "ambitions": 90
        },
        "break_preferences": {
            "frequency": "every 1 hour",
            "duration": "5 minutes"
        },
        "sleep_schedule": "11pm-7am",
        "meal_times": {
            "breakfast": "8am",
            "lunch": "12pm",
            "dinner": "7pm"
        },
        "layout_preference": {
            "type": "to-do-list",
            "subcategory": "structured and time-boxed"
        }
    }
    
    schedule = process_user_data(user_data)
    print("Generated schedule:", schedule)
