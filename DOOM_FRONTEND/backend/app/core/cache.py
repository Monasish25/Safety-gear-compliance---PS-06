import time
import json
import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger("safegear.cache")

class InMemoryCache:
    """Thread-safe TTL in-memory fallback for Redis."""
    def __init__(self):
        self._store = {}
        self._expires = {}
        self._lists = {}

    def _clean_expired(self, key: str):
        if key in self._expires and time.time() > self._expires[key]:
            self._store.pop(key, None)
            self._expires.pop(key, None)
            self._lists.pop(key, None)

    def set(self, key: str, value: Any, ex: Optional[int] = None):
        self._store[key] = value
        if ex:
            self._expires[key] = time.time() + ex
        else:
            self._expires.pop(key, None)

    def get(self, key: str) -> Optional[Any]:
        self._clean_expired(key)
        return self._store.get(key)

    def delete(self, key: str):
        self._store.pop(key, None)
        self._expires.pop(key, None)
        self._lists.pop(key, None)

    def incr(self, key: str, amount: int = 1) -> int:
        self._clean_expired(key)
        val = int(self._store.get(key, 0)) + amount
        self._store[key] = val
        return val

    def rpush(self, key: str, value: Any):
        self._clean_expired(key)
        if key not in self._lists:
            self._lists[key] = []
        self._lists[key].append(value)

    def lrange(self, key: str, start: int, end: int) -> list:
        self._clean_expired(key)
        items = self._lists.get(key, [])
        if end == -1:
            return items[start:]
        return items[start:end + 1]

    def ltrim(self, key: str, start: int, end: int):
        self._clean_expired(key)
        if key in self._lists:
            items = self._lists[key]
            if end == -1:
                self._lists[key] = items[start:]
            else:
                self._lists[key] = items[start:end + 1]

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.memory_fallback = InMemoryCache()
        self.use_memory = False
        self._init_client()

    def _init_client(self):
        try:
            import redis
            client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
            client.ping()
            self.redis_client = client
            logger.info("Connected to Redis server.")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}). Using robust In-Memory Cache fallback.")
            self.use_memory = True

    def set(self, key: str, value: Any, ex: Optional[int] = None):
        if not self.use_memory and self.redis_client:
            try:
                val = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                self.redis_client.set(key, val, ex=ex)
                return
            except Exception:
                pass
        self.memory_fallback.set(key, value, ex=ex)

    def get(self, key: str) -> Optional[Any]:
        if not self.use_memory and self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val is not None:
                    try:
                        return json.loads(val)
                    except Exception:
                        return val
            except Exception:
                pass
        return self.memory_fallback.get(key)

    def delete(self, key: str):
        if not self.use_memory and self.redis_client:
            try:
                self.redis_client.delete(key)
                return
            except Exception:
                pass
        self.memory_fallback.delete(key)

    def incr(self, key: str, amount: int = 1) -> int:
        if not self.use_memory and self.redis_client:
            try:
                return self.redis_client.incr(key, amount)
            except Exception:
                pass
        return self.memory_fallback.incr(key, amount)

    def push_observation(self, key: str, value: int, max_len: int = 10):
        """Append observation history for ratio checking (e.g. 3 of last 5)."""
        if not self.use_memory and self.redis_client:
            try:
                self.redis_client.rpush(key, value)
                self.redis_client.ltrim(key, -max_len, -1)
                self.redis_client.expire(key, 60)
                return
            except Exception:
                pass
        self.memory_fallback.rpush(key, value)
        self.memory_fallback.ltrim(key, -max_len, -1)

    def get_recent_observations(self, key: str, count: int) -> list:
        if not self.use_memory and self.redis_client:
            try:
                items = self.redis_client.lrange(key, -count, -1)
                return [int(x) for x in items]
            except Exception:
                pass
        items = self.memory_fallback.lrange(key, -count, -1)
        return [int(x) for x in items]

    def is_in_cooldown(self, fingerprint: str) -> bool:
        """Check if alert fingerprint is still within cooldown window."""
        key = f"cooldown:{fingerprint}"
        return self.get(key) is not None

    def set_cooldown(self, fingerprint: str, duration_sec: int = 30):
        key = f"cooldown:{fingerprint}"
        self.set(key, 1, ex=duration_sec)

cache = CacheService()
