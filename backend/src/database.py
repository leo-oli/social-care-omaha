import os
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text

DB_DIR = "./db"
DB_FILE = "omaha.sqlite3"
DATABASE_PATH = os.path.join(DB_DIR, DB_FILE)
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Get the absolute path to init.sql
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INIT_SQL_PATH = os.path.join(BASE_DIR, "db", "init", "init.sql")
engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables():
    """
    Initializes the database. If the database file doesn't exist,
    it creates the directory and runs the init.sql script.
    """
    print(f"Database path: {DATABASE_PATH}")
    print(f"Init SQL path: {INIT_SQL_PATH}")
    
    if not os.path.exists(DATABASE_PATH):
        print("Database not found, initializing from init.sql...")
        os.makedirs(DB_DIR, exist_ok=True)
        
        # First, create tables using SQLAlchemy metadata
        # Import models here at module level
        print("Creating tables...")
        SQLModel.metadata.create_all(engine)
        
        # Then seed data from init.sql
        if os.path.exists(INIT_SQL_PATH):
            print(f"Seeding data from {INIT_SQL_PATH}")
            with open(INIT_SQL_PATH, "r", encoding="utf-8") as f:
                sql_script = f.read()
            
            # Execute the SQL script
            with Session(engine) as session:
                # Remove DROP TABLE statements (tables already created)
                sql_script = sql_script.replace('DROP TABLE IF EXISTS', '-- DROP TABLE IF EXISTS')
                
                # Execute in chunks
                statements = []
                current_statement = ""
                
                for line in sql_script.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('--'):  # Skip comments
                        current_statement += " " + line
                        if line.endswith(';'):
                            statements.append(current_statement.strip())
                            current_statement = ""
                
                # Execute each statement
                for stmt in statements:
                    try:
                        session.execute(text(stmt))
                    except Exception as e:
                        print(f"Warning executing statement: {e}")
                        print(f"Statement: {stmt[:100]}...")
                
                session.commit()
                print("Database seeded successfully.")
        else:
            print(f"ERROR: Init SQL file not found at {INIT_SQL_PATH}")
    else:
        print("Database already exists.")
        
        # Verify data exists
        with Session(engine) as session:
            try:
                result = session.execute(text("SELECT COUNT(*) FROM omaha_domain"))
                count = result.scalar()
                print(f"Found {count} domains in database")
                
                if count == 0:
                    print("Database is empty! Need to seed data.")
            except Exception as e:
                print(f"Error checking database: {e}")


def get_session():
    with Session(engine) as session:
        yield session