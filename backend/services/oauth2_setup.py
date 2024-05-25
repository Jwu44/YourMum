import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

def get_gdrive_service():
    """Gets an authorized Google Drive API service instance."""
    creds = None
    credentials_path = os.path.join(os.path.dirname(__file__), "credentials.json")
    token_path = os.path.join(os.path.dirname(__file__), "token.json")

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, SCOPES
            )
            creds = flow.run_local_server(port=8000)
        with open(token_path, "w") as token:
            token.write(creds.to_json())

    try:
        service = build("drive", "v3", credentials=creds)
        return service
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None

if __name__ == "__main__":
    service = get_gdrive_service()
    if service:
        results = service.files().list(pageSize=10, fields="nextPageToken, files(id, name)").execute()
        items = results.get("files", [])
        if not items:
            print("No files found.")
        else:
            print("Files:")
            for item in items:
                print(f"{item['name']} ({item['id']})")
