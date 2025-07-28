#!/usr/bin/env python3
"""
CORS and Archive Endpoints Test Script
This script tests the CORS configuration and verifies archive endpoints are working.
"""

import requests
import json

def test_cors_and_archive():
    """Test CORS configuration and archive endpoints."""
    
    # Production backend URL
    base_url = "https://yourdai-backend.onrender.com/api"
    
    print("🔍 Testing CORS and Archive Endpoints")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/archive/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print(f"CORS Headers: {dict(response.headers)}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    
    # Test 2: OPTIONS preflight request
    print("\n2. Testing OPTIONS preflight request...")
    try:
        headers = {
            'Origin': 'https://yourdai.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
        response = requests.options(f"{base_url}/archive/task", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"CORS Headers: {dict(response.headers)}")
        
        # Check required CORS headers
        required_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
        ]
        
        for header in required_headers:
            if header in response.headers:
                print(f"✅ {header}: {response.headers[header]}")
            else:
                print(f"❌ Missing {header}")
                
    except Exception as e:
        print(f"❌ OPTIONS request failed: {e}")
    
    # Test 3: Basic connectivity
    print("\n3. Testing basic connectivity...")
    try:
        response = requests.get(f"{base_url}/../")  # Root endpoint
        print(f"Root endpoint status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"❌ Basic connectivity failed: {e}")
    
    print("\n" + "=" * 50)
    print("🔧 If CORS is still failing:")
    print("1. Ensure backend server has been restarted after adding archive routes")
    print("2. Check CORS_ALLOWED_ORIGINS environment variable in production")
    print("3. Verify all archive routes are properly registered")
    print("4. Test with browser dev tools Network tab for detailed error info")

if __name__ == "__main__":
    test_cors_and_archive() 