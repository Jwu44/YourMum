from flask import Blueprint, jsonify, request
from backend.services.oauth2_setup import get_gdrive_service
from backend.services.colab_integration import process_user_data

api_bp = Blueprint("api", __name__)

@api_bp.route("/submit_data", methods=["POST"])
def submit_data():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    else:
        return _corsify_actual_response(submit_data_post())

def submit_data_post():
    user_data = request.get_json()
    try:
        # Process the user data and return the response
        schedule = process_user_data(user_data)
        return jsonify({"schedule": schedule})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def _build_cors_preflight_response():
    response = jsonify({"message": "CORS preflight"})
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:8001")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response

def _corsify_actual_response(response):
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:8001")
    return response

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
