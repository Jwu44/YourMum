from pymongo.mongo_client import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("MONGODB_URI")
client = MongoClient(uri)

# Connect to your database
db = client["YourDaiSchedule"]

def get_database():
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        return db
    except Exception as e:
        print(f"An error occurred while connecting to MongoDB: {e}")
        return None

def get_collection(collection_name):
    db = get_database()
    if db is not None:
        return db[collection_name]
    else:
        raise Exception("Database connection not established")

def get_user_schedules_collection():
    user_schedules_collection = get_collection('UserSchedules')
    return user_schedules_collection

def initialize_db():
    try:
        # Attempt to connect to the database
        client.admin.command('ismaster')
        print("Successfully connected to MongoDB")
    except ConnectionFailure:
        print("Server not available")
        raise