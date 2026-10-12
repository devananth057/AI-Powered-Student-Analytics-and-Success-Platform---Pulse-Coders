
from app.database import client, db, check_database_connection

try:
    if check_database_connection():
        print("MongoDB connected successfully!")
        print("Database:", db.name)
        print("Collections:", db.list_collection_names())
    else:
        print("MongoDB connection failed.")
except Exception as error:
    print("Error:", error)
finally:
    client.close()
