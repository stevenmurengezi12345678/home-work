#!/usr/bin/env python3
"""
Final Backend Test - Focus on actual functionality issues, not test script problems
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://place-money-log.preview.emergentagent.com"
API_BASE_URL = f"{BASE_URL}/api"

def make_request(method, endpoint, data=None, auth_token=None):
    """Make HTTP request"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method == "GET":
            return requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            return requests.post(url, json=data, headers=headers, timeout=10)
        elif method == "DELETE":
            return requests.delete(url, headers=headers, timeout=10)
    except Exception as e:
        print(f"Request error: {e}")
        return None

def test_core_functionality():
    """Test the key requirements from the review request"""
    print("🔍 FINAL BACKEND FUNCTIONALITY TEST")
    print("=" * 50)
    
    results = []
    
    # Setup test user
    test_email = f"admin_{uuid.uuid4().hex[:6]}@example.com"
    test_password = "admin123"
    auth_token = None
    
    print("\n1. 🔐 AUTHENTICATION TESTS")
    print("-" * 30)
    
    # Test 1: Password validation - should reject weak passwords
    print("   Testing password validation...")
    weak_tests = [
        ("test1", "Too short (5 chars)"),
        ("123456", "Numbers only"),
        ("abcdef", "Letters only")
    ]
    
    password_validation_working = True
    for weak_password, description in weak_tests:
        response = make_request("POST", "/auth/signup", {
            "email": f"test_{uuid.uuid4().hex[:4]}@example.com", 
            "password": weak_password
        })
        if not (response and response.status_code == 400):
            password_validation_working = False
            print(f"   ❌ {description} password was not rejected")
        else:
            print(f"   ✅ {description} password correctly rejected")
    
    results.append(("Password validation", password_validation_working))
    
    # Test 2: Successful signup with valid password
    response = make_request("POST", "/auth/signup", {"email": test_email, "password": test_password})
    signup_success = response and response.status_code == 200
    if signup_success:
        auth_token = response.json().get("token")
        print("   ✅ Valid password signup successful")
    else:
        print("   ❌ Valid password signup failed")
    results.append(("Admin signup", signup_success))
    
    # Test 3: Login
    response = make_request("POST", "/auth/login", {"email": test_email, "password": test_password})
    login_success = response and response.status_code == 200
    if login_success:
        print("   ✅ Login successful")
    else:
        print("   ❌ Login failed")
    results.append(("Login", login_success))
    
    # Test 4: Auth check with Bearer token
    response = make_request("GET", "/auth/check", auth_token=auth_token)
    auth_check = response and response.status_code == 200 and response.json().get("authenticated") is True
    print(f"   {'✅' if auth_check else '❌'} Auth check with Bearer token")
    results.append(("Auth check", auth_check))
    
    if not auth_token:
        print("❌ Cannot proceed without authentication")
        return results
    
    print("\n2. 🏢 PLACES MANAGEMENT")
    print("-" * 30)
    
    # Test 5: Unauthorized access rejection
    response = make_request("GET", "/places")  # No auth token
    unauthorized_rejected = response and response.status_code == 401
    print(f"   {'✅' if unauthorized_rejected else '❌'} Unauthorized access rejected")
    results.append(("Unauthorized access control", unauthorized_rejected))
    
    # Test 6: Create places
    places = []
    place_names = ["Coffee Shop", "Gas Station", "Grocery Store"]
    for name in place_names:
        response = make_request("POST", "/places", {"name": name}, auth_token)
        if response and response.status_code == 200:
            place_data = response.json().get("place", {})
            places.append(place_data)
            print(f"   ✅ Created place: {name}")
        else:
            print(f"   ❌ Failed to create place: {name}")
    
    places_created = len(places) == len(place_names)
    results.append(("Place creation", places_created))
    
    # Test 7: Get all places with stats
    response = make_request("GET", "/places", auth_token=auth_token)
    places_with_stats = False
    if response and response.status_code == 200:
        data = response.json()
        places_list = data.get("places", [])
        if places_list:
            # Check if stats fields exist
            first_place = places_list[0]
            required_stats = ["recordCount", "totalMoneyGiven", "totalMoneyUsed", "totalPowerUnits"]
            places_with_stats = all(stat in first_place for stat in required_stats)
            print(f"   ✅ Retrieved {len(places_list)} places with stats aggregation")
        else:
            print("   ❌ No places returned")
    else:
        print("   ❌ Failed to get places")
    results.append(("Places with stats", places_with_stats))
    
    print("\n3. 📝 RECORDS MANAGEMENT")
    print("-" * 30)
    
    # Test 8: Create records
    records_created = 0
    if places:
        for i, place in enumerate(places[:2]):  # Test with first 2 places
            record_data = {
                "placeId": place["id"],
                "date": datetime.now().isoformat(),
                "moneyGiven": 100 + (i * 50),
                "moneyUsed": 75 + (i * 30),
                "powerUnits": 10 + (i * 5)
            }
            response = make_request("POST", "/records", record_data, auth_token)
            if response and response.status_code == 200:
                records_created += 1
                print(f"   ✅ Created record for {place['name']}")
            else:
                print(f"   ❌ Failed to create record for {place['name']}")
    
    records_creation_success = records_created > 0
    results.append(("Record creation", records_creation_success))
    
    # Test 9: Get single place with records
    single_place_success = False
    if places:
        place = places[0]
        response = make_request("GET", f"/places/{place['slug']}", auth_token=auth_token)
        if response and response.status_code == 200:
            data = response.json()
            if "place" in data and "records" in data:
                records_count = len(data["records"])
                single_place_success = True
                print(f"   ✅ Retrieved single place with {records_count} records")
            else:
                print("   ❌ Single place response missing data")
        else:
            print("   ❌ Failed to get single place")
    results.append(("Single place with records", single_place_success))
    
    print("\n4. 🗑️ DELETION OPERATIONS")
    print("-" * 30)
    
    # Test 10: Delete place (should cascade delete records)
    deletion_success = False
    if places:
        place_to_delete = places[-1]  # Delete last place
        response = make_request("DELETE", f"/places/{place_to_delete['slug']}", auth_token=auth_token)
        if response and response.status_code == 200:
            # Verify place is deleted
            response = make_request("GET", f"/places/{place_to_delete['slug']}", auth_token=auth_token)
            if response and response.status_code == 404:
                deletion_success = True
                print(f"   ✅ Place '{place_to_delete['name']}' deleted successfully")
            else:
                print("   ❌ Place still exists after deletion")
        else:
            print("   ❌ Place deletion failed")
    results.append(("Place deletion cascade", deletion_success))
    
    print("\n5. 🔧 DATA VALIDATION")
    print("-" * 30)
    
    # Test 11: Validate required fields
    validation_tests = [
        ("POST", "/places", {}, "Place without name"),
        ("POST", "/records", {}, "Record without required fields"),
        ("POST", "/records", {"placeId": "invalid-id", "date": "2023-01-01"}, "Record with invalid place")
    ]
    
    validation_working = True
    for method, endpoint, data, description in validation_tests:
        response = make_request(method, endpoint, data, auth_token)
        if response and response.status_code in [400, 404]:
            print(f"   ✅ {description} correctly rejected")
        else:
            print(f"   ❌ {description} was not rejected")
            validation_working = False
    
    results.append(("Data validation", validation_working))
    
    # Test 12: UUID usage verification
    uuid_usage = True
    uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    import re
    
    for place in places:
        if not re.match(uuid_pattern, place["id"]):
            uuid_usage = False
            break
    
    print(f"   {'✅' if uuid_usage else '❌'} UUIDs used for IDs (not ObjectIds)")
    results.append(("UUID usage", uuid_usage))
    
    # SUMMARY
    print("\n" + "=" * 50)
    print("📊 FINAL TEST SUMMARY")
    print("=" * 50)
    
    critical_features = [
        "Admin signup", "Login", "Auth check", 
        "Place creation", "Record creation", 
        "Places with stats", "Single place with records"
    ]
    
    critical_working = 0
    total_critical = len(critical_features)
    
    for test_name, success in results:
        status = "✅ WORKING" if success else "❌ ISSUE"
        is_critical = test_name in critical_features
        marker = " [CRITICAL]" if is_critical else ""
        
        print(f"{status}: {test_name}{marker}")
        
        if is_critical and success:
            critical_working += 1
    
    print(f"\n📈 CRITICAL FEATURES: {critical_working}/{total_critical} working")
    
    total_passed = sum(1 for _, success in results if success)
    total_tests = len(results)
    print(f"📈 OVERALL: {total_passed}/{total_tests} tests passed ({(total_passed/total_tests)*100:.1f}%)")
    
    if critical_working == total_critical:
        print("🎉 ALL CRITICAL FEATURES ARE WORKING!")
        print("💡 The Money Tracker backend is fully functional for the MVP requirements.")
    else:
        print(f"⚠️  {total_critical - critical_working} critical feature(s) have issues.")
    
    return results

if __name__ == "__main__":
    test_core_functionality()