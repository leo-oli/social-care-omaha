import os
from sqlmodel import create_engine, Session

DB_DIR = "./db"
DB_FILE = "omaha.sqlite3"
DATABASE_PATH = os.path.join(DB_DIR, DB_FILE)
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

INIT_SQL_PATH = os.getenv("INIT_SQL_PATH", os.path.join(DB_DIR, "init", "init.sql"))
engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables():
    """
    Initializes the database. If the database file doesn't exist,
    it creates the directory and runs the init.sql script.
    """
    if not os.path.exists(DATABASE_PATH):
        print("Database not found, initializing from init.sql...")
        os.makedirs(DB_DIR, exist_ok=True)
        with open(INIT_SQL_PATH, "r") as f:
            sql_script = f.read()
        # Use the raw DBAPI connection to execute the entire script
        dbapi_connection = engine.raw_connection()
        dbapi_connection.executescript(sql_script)
        dbapi_connection.close()
        print("Database initialized successfully.")
    else:
        print("Database already exists.")


def get_session():
    with Session(engine) as session:
        yield session
