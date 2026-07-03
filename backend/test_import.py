import os
os.environ["DB_PATH"] = "/tmp/test_gym.db"
from app.main import app
print("OK")
