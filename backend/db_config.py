from pymongo.mongo_client import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB URI from environment variables
uri = os.getenv("MONGODB_URI") + "&tlsInsecure=true"
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set")

# Create a single client instance to be reused
client = MongoClient(uri)

# Connect to your database
db_name = "YourDaiSchedule"
db = client[db_name]

def get_database():
    try:
        # Check connection by pinging the database
        client.admin.command('ping')
        print(f"Successfully connected to MongoDB database: {db_name}")
        return db
    except ConnectionFailure as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise

def get_collection(collection_name):
    database = get_database()
    return database[collection_name]

def get_user_schedules_collection():
    return get_collection('UserSchedules')

def initialize_db():
    try:
        get_database()
        print("Database initialized successfully")
    except ConnectionFailure:
        print("Failed to initialize database")
        raise

# Initialize the database connection when the module is imported
initialize_db()