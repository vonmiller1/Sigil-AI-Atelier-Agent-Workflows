import time
import asyncio
import logging
import threading
from typing import Dict, List

logger = logging.getLogger(__name__)

class APIGovernor:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        # Prevent re-initialization if __init__ is called multiple times
        if hasattr(self, "_initialized") and self._initialized:
            return
        self.timestamps: Dict[str, List[float]] = {}
        self._lock = threading.Lock()
        self._initialized = True

    @classmethod
    def get_instance(cls) -> "APIGovernor":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def acquire_permission(self, api_key: str = "default") -> None:
        """
        Synchronous gatekeeper for rate limiting. Prunes old timestamps and sleeps
        synchronously using time.sleep if the rate limit is exceeded.
        """
        key = api_key if api_key else "global_governor"
        with self._lock:
            if key not in self.timestamps:
                self.timestamps[key] = []
            
            # Prune timestamps older than 60 seconds
            current_time = time.time()
            self.timestamps[key] = [t for t in self.timestamps[key] if current_time - t <= 60.0]
            
            active = self.timestamps[key]
            if len(active) >= 9:
                sleep_time = 60.0 - (current_time - active[0]) + 0.5
                if sleep_time > 0:
                    msg = f"[API Governor] RPM threshold (9 req/min) reached. Throttling execution thread for {sleep_time:.2f} seconds..."
                    print(msg)
                    logger.warning(msg)
                    time.sleep(sleep_time)
                
                # Prune again after sleep
                current_time = time.time()
                self.timestamps[key] = [t for t in self.timestamps[key] if current_time - t <= 60.0]
            
            self.timestamps[key].append(time.time())

    async def acquire_permission_async(self, api_key: str = "default") -> None:
        """
        Asynchronous gatekeeper for rate limiting. Prunes old timestamps and sleeps
        asynchronously using asyncio.sleep if the rate limit is exceeded.
        """
        key = api_key if api_key else "global_governor"
        
        while True:
            sleep_time = 0.0
            with self._lock:
                if key not in self.timestamps:
                    self.timestamps[key] = []
                
                current_time = time.time()
                self.timestamps[key] = [t for t in self.timestamps[key] if current_time - t <= 60.0]
                
                active = self.timestamps[key]
                if len(active) >= 9:
                    sleep_time = 60.0 - (current_time - active[0]) + 0.5
            
            if sleep_time > 0:
                msg = f"[API Governor] RPM threshold (9 req/min) reached. Throttling execution thread for {sleep_time:.2f} seconds..."
                print(msg)
                logger.warning(msg)
                await asyncio.sleep(sleep_time)
                # Loop again to verify state after waking up (in case other tasks acquired during sleep)
                continue
            else:
                with self._lock:
                    # Recheck under lock before appending to prevent race conditions
                    current_time = time.time()
                    self.timestamps[key] = [t for t in self.timestamps[key] if current_time - t <= 60.0]
                    active = self.timestamps[key]
                    if len(active) >= 9:
                        continue
                    self.timestamps[key].append(current_time)
                break
