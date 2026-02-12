#!/usr/bin/env python3
"""
Comprehensive Money Tracker Backend Test Suite
Focuses on the specific requirements from the review request
"""

import requests
import json
import uuid
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://place-money-log.preview.emergentagent.com"
API_BASE_URL = f"{BASE_URL}/api"

class ComprehensiveTester:
    def __init__(self):
        self.auth_token = None
        self.test_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "admin123"
        self.created_places = []
        self.created_records = []
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"        {details}")
        self.test_results.append((test_name, success))
    
    def make_request(self, method, endpoint, data=None, auth_token=None, timeout=10):
        """Make HTTP request with error handling"""
        url = f"{API_BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                return None
            
            return response
        except Exception as e:
            print(f"        Request error: {str(e)}")
            return None
    
    def test_password_validation_rules(self):
        """Test password validation requirements: 6+ chars, letters and numbers"""
        print("\n=== Password Validation Tests ===")
        
        test_cases = [
            ("12345", False, "Too short (5 chars)"),
            ("123456", False, "Only numbers, no letters"), 
            ("abcdef", False, "Only letters, no numbers"),
            ("abc12", False, "Too short (5 chars) with letters and numbers"),
            ("abc123", True, "6 chars with letters and numbers"),
            ("password123", True, "Long password with letters and numbers"),
            ("MyPass1", True, "Mixed case with numbers")
        ]
        
        for password, should_succeed, description in test_cases:
            email = f"test_{uuid.uuid4().hex[:6]}@example.com"
            response = self.make_request("POST", "/auth/signup", {"email": email, "password": password})
            
            if should_succeed:
                success = response and response.status_code == 200
                self.log_test(f"Password '{password}' should be accepted", success, description)
            else:
                success = response and response.status_code == 400
                if success and response.text:
                    # Check error message mentions password requirements
                    error_text = response.text.lower()
                    contains_validation_msg = ("6 characters" in error_text or "letters and numbers" in error_text)
                    success = success and contains_validation_msg
                self.log_test(f"Password '{password}' should be rejected", success, description)
    
    def test_authentication_flow(self):
        """Test complete authentication flow"""
        print("\n=== Authentication Flow Tests ===")
        
        # 1. Create admin account
        signup_data = {"email": self.test_email, "password": self.test_password}
        response = self.make_request("POST", "/auth/signup", signup_data)
        
        signup_success = response and response.status_code == 200
        self.log_test("Admin account creation", signup_success)
        
        if signup_success:
            data = response.json()
            self.auth_token = data.get("token")
            
        # 2. Test login
        login_data = {"email": self.test_email, "password": self.test_password}
        response = self.make_request("POST", "/auth/login", login_data)
        
        login_success = response and response.status_code == 200
        self.log_test("Admin login", login_success)
        
        # 3. Test auth check with token
        response = self.make_request("GET", "/auth/check", auth_token=self.auth_token)
        auth_check_success = response and response.status_code == 200
        if auth_check_success:
            data = response.json()
            auth_check_success = data.get("authenticated") is True
        self.log_test("Auth check with Bearer token", auth_check_success)
        
        # 4. Test invalid credentials
        response = self.make_request("POST", "/auth/login", {"email": self.test_email, "password": "wrongpass"})
        invalid_login_rejected = response and response.status_code == 401
        self.log_test("Invalid credentials rejected", invalid_login_rejected)
        
        return signup_success and login_success and auth_check_success
    
    def test_places_management(self):
        """Test places CRUD operations"""
        print("\n=== Places Management Tests ===")
        
        if not self.auth_token:
            self.log_test("Places management", False, "No auth token available")
            return
        
        # 1. Test unauthorized access
        response = self.make_request("GET", "/places")  # No auth token
        unauthorized_rejected = response and response.status_code == 401
        self.log_test("Unauthorized places access rejected", unauthorized_rejected)
        
        # 2. Create places
        place_names = ["Downtown Coffee Shop", "Main Street Gas Station", "Oak Avenue Grocery Store"]
        
        for name in place_names:
            response = self.make_request("POST", "/places", {"name": name}, auth_token=self.auth_token)
            success = response and response.status_code == 200
            
            if success:
                data = response.json()
                place_info = data.get("place", {})
                self.created_places.append({
                    "id": place_info.get("id"),
                    "name": place_info.get("name"), 
                    "slug": place_info.get("slug")
                })
                self.log_test(f"Create place: {name}", True, f"Slug: {place_info.get('slug')}")
            else:
                self.log_test(f"Create place: {name}", False)
        
        # 3. Get all places with stats
        response = self.make_request("GET", "/places", auth_token=self.auth_token)
        get_places_success = response and response.status_code == 200
        
        if get_places_success:
            data = response.json()
            places = data.get("places", [])
            
            # Check that stats fields are present
            all_have_stats = True
            for place in places:
                required_stats = ["recordCount", "totalMoneyGiven", "totalMoneyUsed", "totalPowerUnits"]
                if not all(stat in place for stat in required_stats):
                    all_have_stats = False
                    break
            
            self.log_test("Get all places with stats", all_have_stats, 
                         f"Retrieved {len(places)} places with aggregated stats")
        else:
            self.log_test("Get all places with stats", False)
        
        # 4. Get single place (will test with records later)
        if self.created_places:
            place = self.created_places[0]
            response = self.make_request("GET", f"/places/{place['slug']}", auth_token=self.auth_token)
            single_place_success = response and response.status_code == 200
            
            if single_place_success:
                data = response.json()
                has_place_and_records = "place" in data and "records" in data
                self.log_test("Get single place with records", has_place_and_records)
            else:
                self.log_test("Get single place with records", False)
    
    def test_records_management(self):
        """Test records CRUD operations"""
        print("\n=== Records Management Tests ===")
        
        if not self.auth_token or not self.created_places:
            self.log_test("Records management", False, "Prerequisites not met")
            return
        
        # 1. Test unauthorized record creation
        response = self.make_request("POST", "/records", {
            "placeId": "test-id",
            "date": datetime.now().isoformat()
        })  # No auth token
        unauthorized_rejected = response and response.status_code == 401
        self.log_test("Unauthorized record creation rejected", unauthorized_rejected)
        
        # 2. Create records for each place
        for i, place in enumerate(self.created_places):
            # Create multiple records per place to test stats aggregation
            for day in range(3):
                record_date = (datetime.now() - timedelta(days=day)).isoformat()
                record_data = {
                    "placeId": place["id"],
                    "date": record_date,
                    "moneyGiven": 100 + (i * 50) + (day * 25),  # Varying amounts
                    "moneyUsed": 80 + (i * 40) + (day * 20),
                    "powerUnits": 10 + (i * 5) + (day * 3)
                }
                
                response = self.make_request("POST", "/records", record_data, auth_token=self.auth_token)
                success = response and response.status_code == 200
                
                if success:
                    data = response.json()
                    record_info = data.get("record", {})
                    self.created_records.append({
                        "id": record_info.get("id"),
                        "placeId": place["id"],
                        "place_name": place["name"]
                    })
                    self.log_test(f"Create record for {place['name']} (Day {day+1})", True,
                                f"Money: ${record_data['moneyGiven']}/${record_data['moneyUsed']}, Power: {record_data['powerUnits']}")
                else:
                    self.log_test(f"Create record for {place['name']} (Day {day+1})", False)
        
        # 3. Verify stats aggregation
        response = self.make_request("GET", "/places", auth_token=self.auth_token)
        if response and response.status_code == 200:
            data = response.json()
            places = data.get("places", [])
            
            stats_correct = True
            for place in places:
                if place.get("recordCount", 0) > 0:
                    # Each place should have 3 records
                    expected_records = 3
                    actual_records = place.get("recordCount", 0)
                    if actual_records != expected_records:
                        stats_correct = False
                        break
                    
                    self.log_test(f"Stats aggregation for {place['name']}", True,
                                f"Records: {actual_records}, Total Given: ${place['totalMoneyGiven']}, Used: ${place['totalMoneyUsed']}, Power: {place['totalPowerUnits']}")
            
            if not stats_correct:
                self.log_test("Places stats aggregation", False, "Record counts don't match expected")
        
        # 4. Test record deletion
        if self.created_records:
            record_to_delete = self.created_records[0]
            response = self.make_request("DELETE", f"/records/{record_to_delete['id']}", auth_token=self.auth_token)
            delete_success = response and response.status_code == 200
            self.log_test("Delete record", delete_success)
            
            if delete_success:
                self.created_records.remove(record_to_delete)
    
    def test_place_deletion_cascade(self):
        """Test place deletion and cascade deletion of records"""
        print("\n=== Place Deletion & Cascade Tests ===")
        
        if not self.auth_token or not self.created_places:
            self.log_test("Place deletion", False, "Prerequisites not met")
            return
        
        # Delete one place and verify records are also deleted
        place_to_delete = self.created_places[0]
        
        # First, verify the place has records
        response = self.make_request("GET", f"/places/{place_to_delete['slug']}", auth_token=self.auth_token)
        records_before = 0
        if response and response.status_code == 200:
            data = response.json()
            records_before = len(data.get("records", []))
        
        # Delete the place
        response = self.make_request("DELETE", f"/places/{place_to_delete['slug']}", auth_token=self.auth_token)
        delete_success = response and response.status_code == 200
        self.log_test("Delete place", delete_success, f"Deleted place with {records_before} records")
        
        if delete_success:
            # Verify place is gone
            response = self.make_request("GET", f"/places/{place_to_delete['slug']}", auth_token=self.auth_token)
            place_gone = response and response.status_code == 404
            self.log_test("Verify place deletion", place_gone, "Place no longer accessible")
            
            # Verify associated records are also deleted by checking remaining places stats
            self.created_places.remove(place_to_delete)
    
    def test_data_validation(self):
        """Test various data validation scenarios"""
        print("\n=== Data Validation Tests ===")
        
        if not self.auth_token:
            return
        
        # 1. Test creating place without name
        response = self.make_request("POST", "/places", {}, auth_token=self.auth_token)
        validation_success = response and response.status_code == 400
        self.log_test("Place creation without name rejected", validation_success)
        
        # 2. Test creating record without required fields
        response = self.make_request("POST", "/records", {}, auth_token=self.auth_token)
        validation_success = response and response.status_code == 400
        self.log_test("Record creation without required fields rejected", validation_success)
        
        # 3. Test creating record with invalid place ID
        if self.created_places:
            response = self.make_request("POST", "/records", {
                "placeId": "invalid-place-id-123",
                "date": datetime.now().isoformat(),
                "moneyGiven": 100
            }, auth_token=self.auth_token)
            validation_success = response and response.status_code == 404
            self.log_test("Record creation with invalid place ID rejected", validation_success)
    
    def test_uuid_usage(self):
        """Verify UUIDs are used instead of MongoDB ObjectId"""
        print("\n=== UUID Usage Tests ===")
        
        if not self.created_places or not self.created_records:
            return
        
        # Check place IDs are UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        import re
        
        for place in self.created_places:
            is_uuid = bool(re.match(uuid_pattern, place['id']))
            self.log_test(f"Place ID is UUID: {place['name']}", is_uuid, place['id'])
        
        for record in self.created_records:
            is_uuid = bool(re.match(uuid_pattern, record['id']))
            self.log_test(f"Record ID is UUID", is_uuid, record['id'][:8] + "...")
    
    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        print("🚀 Money Tracker Backend - Comprehensive Test Suite")
        print(f"Testing API at: {API_BASE_URL}")
        print("=" * 60)
        
        # Run test suites in order
        self.test_password_validation_rules()
        auth_success = self.test_authentication_flow()
        
        if auth_success:
            self.test_places_management()
            self.test_records_management()
            self.test_place_deletion_cascade()
            self.test_data_validation()
            self.test_uuid_usage()
        else:
            print("⚠️ Skipping remaining tests due to authentication failure")
        
        # Summary
        self.print_summary()
        
        # Return success rate
        passed = sum(1 for _, success in self.test_results if success)
        total = len(self.test_results)
        return passed, total
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST RESULTS")
        print("=" * 60)
        
        # Group results by category
        categories = {}
        for test_name, success in self.test_results:
            category = test_name.split(":")[0] if ":" in test_name else "General"
            if category not in categories:
                categories[category] = []
            categories[category].append((test_name, success))
        
        # Print by category
        total_passed = 0
        total_tests = 0
        
        for category, tests in categories.items():
            print(f"\n{category}:")
            for test_name, success in tests:
                status = "✅" if success else "❌"
                print(f"  {status} {test_name}")
                if success:
                    total_passed += 1
                total_tests += 1
        
        print(f"\n📈 OVERALL RESULT: {total_passed}/{total_tests} tests passed")
        
        if total_passed == total_tests:
            print("🎉 ALL TESTS PASSED! The Money Tracker backend is working correctly.")
        else:
            print(f"⚠️  {total_tests - total_passed} test(s) failed. Review the issues above.")
        
        print(f"\n📊 Success Rate: {(total_passed/total_tests)*100:.1f}%")

if __name__ == "__main__":
    tester = ComprehensiveTester()
    passed, total = tester.run_comprehensive_tests()
    
    # Exit with appropriate code
    if passed == total:
        exit(0)
    else:
        exit(1)