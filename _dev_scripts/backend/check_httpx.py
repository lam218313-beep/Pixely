import sys
try:
    import httpx
    print("HTTPX Available")
except ImportError:
    print("HTTPX NOT Available")
