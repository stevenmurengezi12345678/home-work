#!/usr/bin/env python3
"""
Simple Backend Test for Money Tracker Application
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys

# Configuration
BASE_URL = "https://place-money-log.preview.emergentagent.com"
API_BASE_URL = f"{BASE_URL}/api"

def test_request(method, endpoint, data=None, auth_token=None, expected_status=200):
    """Make a test request and return result"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return {"success": False, "error": f"Unsupported method: {method}"}
        
        success = response.status_code == expected_status
        
        try:
            response_data = response.json()
        except:
            response_data = {"raw_response": response.text}
        
        return {
            "success": success,
            "status_code": response.status_code,
            "data": response_data,
            "expected_status": expected_status
        }
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Connection error"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    print("🚀 Simple Money Tracker Backend Test")
    print(f"Testing API at: {API_BASE_URL}")
    print("=" * 50)
    
    results = []
    auth_token = None
    test_user_email = f"testuser_{uuid.uuid4().hex[:6]}@example.com"
    test_user_password = "testpass123"
    
    # Test 1: API Health
    print("\n1. Testing API Health...")
    result = test_request("GET", "", expected_status=200)
    results.append(("API Health", result["success"]))
    if result["success"]:
        print("✅ API is running")
    else:
        print(f"❌ API health check failed: {result}")
        return
    
    # Test 2: Signup validation (missing email)
    print("\n2. Testing Signup Validation (missing email)...")
    result = test_request("POST", "/auth/signup", {"password": "testpass123"}, expected_status=400)
    results.append(("Signup Validation", result["success"]))
    if result["success"]:
        print("✅ Correctly rejected signup without email")
    else:
        print(f"❌ Signup validation failed: {result}")
    
    # Test 3: Successful signup
    print("\n3. Testing Successful Signup...")
    signup_data = {"email": test_user_email, "password": test_user_password}
    result = test_request("POST", "/auth/signup", signup_data, expected_status=200)
    results.append(("Successful Signup", result["success"]))
    if result["success"]:
        auth_token = result["data"].get("token")
        print("✅ User created successfully")
        print(f"   Email: {test_user_email}")
    else:
        print(f"❌ Signup failed: {result}")
        return
    
    # Test 4: Login
    print("\n4. Testing Login...")
    login_data = {"email": test_user_email, "password": test_user_password}
    result = test_request("POST", "/auth/login", login_data, expected_status=200)
    results.append(("Login", result["success"]))
    if result["success"]:
        print("✅ Login successful")
    else:
        print(f"❌ Login failed: {result}")
    
    # Test 5: Auth Check
    print("\n5. Testing Auth Check...")
    result = test_request("GET", "/auth/check", auth_token=auth_token, expected_status=200)
    results.append(("Auth Check", result["success"]))
    if result["success"]:
        print("✅ Auth check passed")
    else:
        print(f"❌ Auth check failed: {result}")
    
    # Test 6: Create Place
    print("\n6. Testing Place Creation...")
    place_data = {"name": "Test Coffee Shop"}
    result = test_request("POST", "/places", place_data, auth_token=auth_token, expected_status=200)
    results.append(("Create Place", result["success"]))
    place_id = None
    place_slug = None
    if result["success"]:
        place_info = result["data"].get("place", {})
        place_id = place_info.get("id")
        place_slug = place_info.get("slug")
        print(f"✅ Place created: {place_info.get('name')} (slug: {place_slug})")
    else:
        print(f"❌ Place creation failed: {result}")
    
    # Test 7: Get Places
    print("\n7. Testing Get All Places...")
    result = test_request("GET", "/places", auth_token=auth_token, expected_status=200)
    results.append(("Get Places", result["success"]))
    if result["success"]:
        places = result["data"].get("places", [])
        print(f"✅ Retrieved {len(places)} places")
        for place in places:
            print(f"   - {place.get('name')} (Records: {place.get('recordCount', 0)})")
    else:
        print(f"❌ Get places failed: {result}")
    
    # Test 8: Create Record
    if place_id:
        print("\n8. Testing Record Creation...")
        record_data = {
            "placeId": place_id,
            "date": datetime.now().isoformat(),
            "moneyGiven": 100.50,
            "moneyUsed": 75.25,
            "powerUnits": 15
        }
        result = test_request("POST", "/records", record_data, auth_token=auth_token, expected_status=200)
        results.append(("Create Record", result["success"]))
        if result["success"]:
            record_info = result["data"].get("record", {})
            print(f"✅ Record created for place: Money Given: ${record_info.get('moneyGiven')}")
        else:
            print(f"❌ Record creation failed: {result}")
    
    # Test 9: Get Single Place
    if place_slug:
        print("\n9. Testing Get Single Place...")
        result = test_request("GET", f"/places/{place_slug}", auth_token=auth_token, expected_status=200)
        results.append(("Get Single Place", result["success"]))
        if result["success"]:
            place_info = result["data"].get("place", {})
            records = result["data"].get("records", [])
            print(f"✅ Retrieved place '{place_info.get('name')}' with {len(records)} records")
        else:
            print(f"❌ Get single place failed: {result}")
    
    # Test 10: Password validation
    print("\n10. Testing Password Validation...")
    weak_password_data = {"email": f"test2_{uuid.uuid4().hex[:6]}@example.com", "password": "weak"}
    result = test_request("POST", "/auth/signup", weak_password_data, expected_status=400)
    results.append(("Password Validation", result["success"]))
    if result["success"]:
        print("✅ Correctly rejected weak password")
    else:
        print(f"❌ Password validation failed: {result}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\n📈 Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())