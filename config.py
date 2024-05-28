import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')

print(f"test: {GOOGLE_CLIENT_SECRET}")