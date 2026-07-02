import os
import hashlib
from typing import Dict, Any
from sqlalchemy import create_engine, Engine
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pymongo import MongoClient
from bson import ObjectId

class DatabaseConnectionManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(DatabaseConnectionManager, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._engines: Dict[str, Engine] = {}
        # Get MongoDB configuration from environment
        self.mongo_uri = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/yakkay-ai")
        # Extract database name from connection string if present
        self.db_name = "yakkay-ai"
        clean_uri = self.mongo_uri.replace("mongodb://", "").replace("mongodb+srv://", "")
        if "/" in clean_uri:
            parts = clean_uri.split("/")
            if len(parts) > 1 and parts[1]:
                self.db_name = parts[1].split("?")[0]
        
        self.mongo_client = MongoClient(self.mongo_uri)
        self._initialized = True

    def decrypt_password(self, encrypted_password: str, iv: str) -> str:
        encryption_key = os.environ.get("ENCRYPTION_KEY")
        if not encryption_key:
            raise ValueError("ENCRYPTION_KEY environment variable is not set.")
        
        # Derive 32-byte key using SHA-256
        key = hashlib.sha256(encryption_key.encode("utf-8")).digest()
        
        # Decrypt using AES-256-GCM
        aesgcm = AESGCM(key)
        iv_bytes = bytes.fromhex(iv)
        ciphertext_bytes = bytes.fromhex(encrypted_password)
        
        decrypted_bytes = aesgcm.decrypt(iv_bytes, ciphertext_bytes, None)
        return decrypted_bytes.decode("utf-8")

    def get_engine(self, db_connection_id: str) -> Engine:
        """
        Retrieves or creates a cached SQLAlchemy engine for a database connection ID.
        """
        if db_connection_id in self._engines:
            return self._engines[db_connection_id]

        db = self.mongo_client[self.db_name]
        conn_doc = db["databaseconnections"].find_one({"_id": ObjectId(db_connection_id)})
        
        if not conn_doc:
            raise ValueError(f"Database connection with ID {db_connection_id} not found.")

        # Decrypt password
        try:
            password = self.decrypt_password(conn_doc["encryptedPassword"], conn_doc["iv"])
        except Exception as e:
            raise ValueError(f"Failed to decrypt database password: {str(e)}")

        engine_type = conn_doc["engine"]
        username = conn_doc["username"]
        host = conn_doc["host"]
        port = conn_doc["port"]
        database_name = conn_doc["databaseName"]
        ssl_mode = conn_doc.get("sslMode", False)

        # URL encode password and username to ensure special characters don't break the connection string
        import urllib.parse
        encoded_username = urllib.parse.quote_plus(username)
        encoded_password = urllib.parse.quote_plus(password)

        connect_args = {}
        if engine_type == "postgresql":
            driver_url = f"postgresql+psycopg2://{encoded_username}:{encoded_password}@{host}:{port}/{database_name}"
            if ssl_mode:
                connect_args["sslmode"] = "require"
        elif engine_type == "mysql":
            driver_url = f"mysql+pymysql://{encoded_username}:{encoded_password}@{host}:{port}/{database_name}"
            if ssl_mode:
                connect_args["ssl"] = {"ssl_mode": "REQUIRED"}
        else:
            raise ValueError(f"Unsupported database engine: {engine_type}")

        try:
            engine = create_engine(
                driver_url,
                connect_args=connect_args,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True
            )
            # Verify we can connect
            with engine.connect() as conn:
                pass
            
            # Cache the engine
            self._engines[db_connection_id] = engine
            return engine
        except Exception as e:
            raise ValueError(f"Failed to connect to database {conn_doc['name']}: {str(e)}")

    def test_temp_connection(self, config: Dict[str, Any]) -> None:
        """
        Tests a database connection configuration temporarily without saving or caching.
        """
        engine_type = config.get("engine")
        username = config.get("username")
        password = config.get("password") or ""
        host = config.get("host")
        port = config.get("port")
        database_name = config.get("databaseName")
        ssl_mode = config.get("sslMode", False)

        if not all([engine_type, username, host, port, database_name]):
            raise ValueError("Missing connection details.")

        import urllib.parse
        encoded_username = urllib.parse.quote_plus(username)
        encoded_password = urllib.parse.quote_plus(password)

        connect_args = {"connect_timeout": 5}
        if engine_type == "postgresql":
            driver_url = f"postgresql+psycopg2://{encoded_username}:{encoded_password}@{host}:{port}/{database_name}"
            if ssl_mode:
                connect_args["sslmode"] = "require"
        elif engine_type == "mysql":
            driver_url = f"mysql+pymysql://{encoded_username}:{encoded_password}@{host}:{port}/{database_name}"
            if ssl_mode:
                connect_args["ssl"] = {"ssl_mode": "REQUIRED"}
        else:
            raise ValueError(f"Unsupported database engine: {engine_type}")

        temp_engine = create_engine(
            driver_url,
            connect_args=connect_args
        )
        try:
            with temp_engine.connect() as conn:
                pass
        finally:
            temp_engine.dispose()

# Global singleton exporter
db_manager = DatabaseConnectionManager()
