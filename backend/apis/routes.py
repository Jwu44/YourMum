from flask import Blueprint, jsonify, request
from backend.services.oauth2_setup import get_gdrive_service
from backend.services.colab_integration import process_user_data

api_bp = Blueprint("api", __name__)

@api_bp.route("/submit_data", methods=["POST"])
def submit_data():
    try:
        user_data = request.json
        if not user_data:
            return jsonify({"error": "No data provided"}), 400
        
        # Process the user data as needed
        # You can save it to a file, database, or process it further
        # Here, we'll simply print it to the console for demonstration purposes
        print("User data received:", user_data)

        # Call your function to process the user data and get the schedule
        schedule = process_user_data(user_data)

        return jsonify({"schedule": schedule})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedule", methods=["GET"])
def get_schedule():
    try:
        service = get_gdrive_service()

        # Search for the file named "schedule.txt"
        results = (
            service.files()
            .list(q="name='schedule.txt'", spaces="drive", fields="files(id, name)")
            .execute()
        )
        items = results.get("files", [])

        if not items:
            return jsonify({"error": "File not found: schedule.txt"}), 404

        file_id = items[0]["id"]
        request = service.files().get_media(fileId=file_id)
        file_content = request.execute().decode('utf-8')  # Decoding bytes to string

        # Debugging information
        print("Raw file content:", file_content)

        # Return the file content as plain text
        return jsonify({"schedule": file_content})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
