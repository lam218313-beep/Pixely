import sys
import os

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

try:
    import google.generativeai as genai
    print("SDK v1 (google.generativeai) Available")
    print(f"Version: {genai.__version__}")
except ImportError:
    print("SDK v1 NOT Available")
except Exception as e:
    print(f"Error checking SDK v1: {e}")
