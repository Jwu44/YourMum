from flask import Blueprint, jsonify
from backend.services.oauth2_setup import get_gdrive_service

api_bp = Blueprint("api", __name__)

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
