
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

MONGO_URL = "mongodb://localhost:27017/users"

client = MongoClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,
)

db = client["users"]

students_collection = db["students"]
predictions_collection = db["predictions"]
interventions_collection = db["interventions"]
students_collection.create_index("student_id", unique=True)
students_collection.create_index(
    [("email", 1)],
    unique=True,
    partialFilterExpression={"email": {"$type": "string"}}
)


def check_database_connection():
    try:
        client.admin.command("ping")
        return True
    except ConnectionFailure:
        return False
