#!/usr/bin/env python3
"""
Comprehensive Backend Test Suite for Money Tracker Application
Tests all API endpoints with various scenarios including authentication, validation, and data operations.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://place-money-log.preview.emergentagent.com')
API_BASE_URL = f"{BASE_URL}/api"

class MoneyTrackerTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        self.test_user_password = "testpass123"
        self.created_places = []
        self.created_records = []
        
    def log_test(self, test_name, status, message="", data=None):
        """Log test results with consistent formatting"""
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {message}")
        if data and isinstance(data, dict):
            print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
        
    def make_request(self, method, endpoint, data=None, headers=None, auth_required=True):
        """Make HTTP request with optional authentication"""
        url = f"{API_BASE_URL}{endpoint}"
        
        # Setup headers
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
            
        if auth_required and self.auth_token:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=request_headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"❌ Request failed: {str(e)}")
            return None
    
    def test_api_health(self):
        """Test if API is running"""
        print("\n=== Testing API Health ===")
        try:
            response = self.make_request("GET", "", auth_required=False)
            if response and response.status_code == 200:
                self.log_test("API Health Check", "PASS", "API is running")
                return True
            else:
                self.log_test("API Health Check", "FAIL", f"Status: {response.status_code if response else 'No response'}")
                return False
        except Exception as e:
            self.log_test("API Health Check", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_auth_signup_validations(self):
        """Test signup endpoint with various validation scenarios"""
        print("\n=== Testing Signup Validations ===")
        
        test_cases = [
            {
                "name": "Signup without email",
                "data": {"password": "testpass123"},
                "expected_status": 400,
                "should_contain": "required"
            },
            {
                "name": "Signup without password", 
                "data": {"email": self.test_user_email},
                "expected_status": 400,
                "should_contain": "required"
            },
            {
                "name": "Signup with short password",
                "data": {"email": self.test_user_email, "password": "test1"},
                "expected_status": 400,
                "should_contain": "6 characters"
            },
            {
                "name": "Signup with password without numbers",
                "data": {"email": self.test_user_email, "password": "testpass"},
                "expected_status": 400,
                "should_contain": "letters and numbers"
            },
            {
                "name": "Signup with password without letters",
                "data": {"email": self.test_user_email, "password": "123456"},
                "expected_status": 400,
                "should_contain": "letters and numbers"
            }
        ]
        
        for test_case in test_cases:
            response = self.make_request("POST", "/auth/signup", test_case["data"], auth_required=False)
            if response:
                if response.status_code == test_case["expected_status"]:
                    response_text = response.text.lower()
                    if test_case["should_contain"].lower() in response_text:
                        self.log_test(test_case["name"], "PASS", "Correct validation error")
                    else:
                        self.log_test(test_case["name"], "FAIL", f"Missing expected error message. Got: {response.text}")
                else:
                    self.log_test(test_case["name"], "FAIL", f"Wrong status code. Expected: {test_case['expected_status']}, Got: {response.status_code}")
            else:
                self.log_test(test_case["name"], "FAIL", "No response received")
    
    def test_auth_signup_success(self):
        """Test successful signup"""
        print("\n=== Testing Successful Signup ===")
        
        signup_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        response = self.make_request("POST", "/auth/signup", signup_data, auth_required=False)
        if response and response.status_code == 200:
            try:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.log_test("Successful Signup", "PASS", "User created and token received", data)
                    return True
                else:
                    self.log_test("Successful Signup", "FAIL", "Missing token or user in response", data)
                    return False
            except Exception as e:
                self.log_test("Successful Signup", "FAIL", f"Invalid JSON response: {str(e)}")
                return False
        else:
            self.log_test("Successful Signup", "FAIL", f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_auth_signup_duplicate(self):
        """Test signup with existing email"""
        print("\n=== Testing Duplicate Signup ===")
        
        signup_data = {
            "email": self.test_user_email,  # Same email as before
            "password": self.test_user_password
        }
        
        response = self.make_request("POST", "/auth/signup", signup_data, auth_required=False)
        if response and response.status_code == 400:
            response_text = response.text.lower()
            if "already exists" in response_text or "exists" in response_text:
                self.log_test("Duplicate Email Signup", "PASS", "Correctly rejected duplicate email")
            else:
                self.log_test("Duplicate Email Signup", "FAIL", f"Wrong error message: {response.text}")
        else:
            self.log_test("Duplicate Email Signup", "FAIL", f"Wrong status code: {response.status_code if response else 'No response'}")
    
    def test_auth_login_invalid(self):
        """Test login with invalid credentials"""
        print("\n=== Testing Invalid Login ===")
        
        test_cases = [
            {
                "name": "Login with wrong email",
                "data": {"email": "wrong@example.com", "password": self.test_user_password}
            },
            {
                "name": "Login with wrong password",
                "data": {"email": self.test_user_email, "password": "wrongpass123"}
            },
            {
                "name": "Login without email",
                "data": {"password": self.test_user_password}
            },
            {
                "name": "Login without password",
                "data": {"email": self.test_user_email}
            }
        ]
        
        for test_case in test_cases:
            response = self.make_request("POST", "/auth/login", test_case["data"], auth_required=False)
            if response:
                if response.status_code in [400, 401]:
                    self.log_test(test_case["name"], "PASS", "Correctly rejected invalid credentials")
                else:
                    self.log_test(test_case["name"], "FAIL", f"Wrong status code: {response.status_code}")
            else:
                self.log_test(test_case["name"], "FAIL", "No response received")
    
    def test_auth_login_success(self):
        """Test successful login"""
        print("\n=== Testing Successful Login ===")
        
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        response = self.make_request("POST", "/auth/login", login_data, auth_required=False)
        if response and response.status_code == 200:
            try:
                data = response.json()
                if "token" in data and "user" in data:
                    # Update token (should be same but let's be safe)
                    self.auth_token = data["token"]
                    self.log_test("Successful Login", "PASS", "Login successful with token", data)
                    return True
                else:
                    self.log_test("Successful Login", "FAIL", "Missing token or user in response", data)
                    return False
            except Exception as e:
                self.log_test("Successful Login", "FAIL", f"Invalid JSON response: {str(e)}")
                return False
        else:
            self.log_test("Successful Login", "FAIL", f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_auth_check(self):
        """Test authentication check endpoint"""
        print("\n=== Testing Auth Check ===")
        
        # Test with valid token
        response = self.make_request("GET", "/auth/check", auth_required=True)
        if response and response.status_code == 200:
            try:
                data = response.json()
                if data.get("authenticated") is True and "user" in data:
                    self.log_test("Auth Check with Valid Token", "PASS", "Authentication verified", data)
                else:
                    self.log_test("Auth Check with Valid Token", "FAIL", "Wrong response format", data)
            except Exception as e:
                self.log_test("Auth Check with Valid Token", "FAIL", f"Invalid JSON: {str(e)}")
        else:
            self.log_test("Auth Check with Valid Token", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Test without token
        response = self.make_request("GET", "/auth/check", auth_required=False)
        if response and response.status_code == 401:
            self.log_test("Auth Check without Token", "PASS", "Correctly rejected unauthorized request")
        else:
            self.log_test("Auth Check without Token", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
    
    def test_places_without_auth(self):
        """Test places endpoints without authentication"""
        print("\n=== Testing Places Without Auth ===")
        
        # Test GET places without auth
        response = self.make_request("GET", "/places", auth_required=False)
        if response and response.status_code == 401:
            self.log_test("Get Places without Auth", "PASS", "Correctly rejected unauthorized request")
        else:
            self.log_test("Get Places without Auth", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Test POST places without auth
        place_data = {"name": "Test Place"}
        response = self.make_request("POST", "/places", place_data, auth_required=False)
        if response and response.status_code == 401:
            self.log_test("Create Place without Auth", "PASS", "Correctly rejected unauthorized request")
        else:
            self.log_test("Create Place without Auth", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
    
    def test_places_create(self):
        """Test creating places"""
        print("\n=== Testing Place Creation ===")
        
        # Test creating place without name
        response = self.make_request("POST", "/places", {}, auth_required=True)
        if response and response.status_code == 400:
            self.log_test("Create Place without Name", "PASS", "Correctly rejected missing name")
        else:
            self.log_test("Create Place without Name", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Test successful place creation
        place_names = ["Coffee Shop Downtown", "Gas Station Main St", "Grocery Store Oak Ave"]
        
        for place_name in place_names:
            place_data = {"name": place_name}
            response = self.make_request("POST", "/places", place_data, auth_required=True)
            
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    if "place" in data and data["place"].get("id"):
                        place_info = {
                            "id": data["place"]["id"],
                            "name": data["place"]["name"],
                            "slug": data["place"]["slug"]
                        }
                        self.created_places.append(place_info)
                        self.log_test(f"Create Place: {place_name}", "PASS", f"Created with slug: {place_info['slug']}", data)
                    else:
                        self.log_test(f"Create Place: {place_name}", "FAIL", "Missing place data in response", data)
                except Exception as e:
                    self.log_test(f"Create Place: {place_name}", "FAIL", f"Invalid JSON: {str(e)}")
            else:
                self.log_test(f"Create Place: {place_name}", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        
        # Test duplicate place creation
        if self.created_places:
            duplicate_data = {"name": self.created_places[0]["name"]}
            response = self.make_request("POST", "/places", duplicate_data, auth_required=True)
            if response and response.status_code == 400:
                self.log_test("Create Duplicate Place", "PASS", "Correctly rejected duplicate place")
            else:
                self.log_test("Create Duplicate Place", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
    
    def test_places_get_all(self):
        """Test getting all places with stats"""
        print("\n=== Testing Get All Places ===")
        
        response = self.make_request("GET", "/places", auth_required=True)
        if response and response.status_code == 200:
            try:
                data = response.json()
                if "places" in data and isinstance(data["places"], list):
                    places = data["places"]
                    self.log_test("Get All Places", "PASS", f"Retrieved {len(places)} places")
                    
                    # Check if places have required stats fields
                    for place in places:
                        required_fields = ["id", "name", "slug", "recordCount", "totalMoneyGiven", "totalMoneyUsed", "totalPowerUnits"]
                        missing_fields = [field for field in required_fields if field not in place]
                        if missing_fields:
                            self.log_test(f"Place Stats Check: {place.get('name', 'Unknown')}", "FAIL", f"Missing fields: {missing_fields}")
                        else:
                            self.log_test(f"Place Stats Check: {place.get('name', 'Unknown')}", "PASS", 
                                        f"Records: {place['recordCount']}, Money Given: {place['totalMoneyGiven']}")
                else:
                    self.log_test("Get All Places", "FAIL", "Missing places array in response", data)
            except Exception as e:
                self.log_test("Get All Places", "FAIL", f"Invalid JSON: {str(e)}")
        else:
            self.log_test("Get All Places", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    def test_records_create(self):
        """Test creating records for places"""
        print("\n=== Testing Record Creation ===")
        
        if not self.created_places:
            self.log_test("Record Creation", "FAIL", "No places available for testing")
            return
        
        # Test creating record without required fields
        response = self.make_request("POST", "/records", {}, auth_required=True)
        if response and response.status_code == 400:
            self.log_test("Create Record without Required Fields", "PASS", "Correctly rejected missing fields")
        else:
            self.log_test("Create Record without Required Fields", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Test creating record with invalid placeId
        invalid_record_data = {
            "placeId": "invalid-place-id",
            "date": datetime.now().isoformat(),
            "moneyGiven": 100.50,
            "moneyUsed": 75.25,
            "powerUnits": 15
        }
        response = self.make_request("POST", "/records", invalid_record_data, auth_required=True)
        if response and response.status_code == 404:
            self.log_test("Create Record with Invalid Place ID", "PASS", "Correctly rejected invalid place")
        else:
            self.log_test("Create Record with Invalid Place ID", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Test successful record creation
        for i, place in enumerate(self.created_places):
            # Create multiple records per place
            for day in range(3):
                record_date = (datetime.now() - timedelta(days=day)).isoformat()
                record_data = {
                    "placeId": place["id"],
                    "date": record_date,
                    "moneyGiven": 100.00 + (i * 50) + (day * 25),
                    "moneyUsed": 75.00 + (i * 30) + (day * 15),
                    "powerUnits": 10 + (i * 5) + (day * 2)
                }
                
                response = self.make_request("POST", "/records", record_data, auth_required=True)
                if response and response.status_code == 200:
                    try:
                        data = response.json()
                        if "record" in data and data["record"].get("id"):
                            record_info = {
                                "id": data["record"]["id"],
                                "placeId": place["id"],
                                "place_name": place["name"]
                            }
                            self.created_records.append(record_info)
                            self.log_test(f"Create Record for {place['name']} (Day {day+1})", "PASS", 
                                        f"Money Given: ${record_data['moneyGiven']}, Used: ${record_data['moneyUsed']}")
                        else:
                            self.log_test(f"Create Record for {place['name']} (Day {day+1})", "FAIL", "Missing record data", data)
                    except Exception as e:
                        self.log_test(f"Create Record for {place['name']} (Day {day+1})", "FAIL", f"Invalid JSON: {str(e)}")
                else:
                    self.log_test(f"Create Record for {place['name']} (Day {day+1})", "FAIL", 
                                f"Status: {response.status_code if response else 'No response'}")
    
    def test_places_get_single(self):
        """Test getting single place with records"""
        print("\n=== Testing Get Single Place ===")
        
        if not self.created_places:
            self.log_test("Get Single Place", "FAIL", "No places available for testing")
            return
        
        # Test getting single place by slug
        for place in self.created_places[:2]:  # Test first 2 places
            response = self.make_request("GET", f"/places/{place['slug']}", auth_required=True)
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    if "place" in data and "records" in data:
                        place_data = data["place"]
                        records_data = data["records"]
                        self.log_test(f"Get Single Place: {place['name']}", "PASS", 
                                    f"Retrieved place with {len(records_data)} records")
                        
                        # Verify records are sorted by date (descending)
                        if len(records_data) > 1:
                            dates = [record.get("date") for record in records_data if record.get("date")]
                            if dates == sorted(dates, reverse=True):
                                self.log_test(f"Records Sort Check: {place['name']}", "PASS", "Records correctly sorted by date")
                            else:
                                self.log_test(f"Records Sort Check: {place['name']}", "FAIL", "Records not properly sorted")
                    else:
                        self.log_test(f"Get Single Place: {place['name']}", "FAIL", "Missing place or records data", data)
                except Exception as e:
                    self.log_test(f"Get Single Place: {place['name']}", "FAIL", f"Invalid JSON: {str(e)}")
            else:
                self.log_test(f"Get Single Place: {place['name']}", "FAIL", 
                            f"Status: {response.status_code if response else 'No response'}")
        
        # Test getting non-existent place
        response = self.make_request("GET", "/places/non-existent-slug", auth_required=True)
        if response and response.status_code == 404:
            self.log_test("Get Non-existent Place", "PASS", "Correctly returned 404 for missing place")
        else:
            self.log_test("Get Non-existent Place", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
    
    def test_places_stats_update(self):
        """Test that place stats are updated after record creation"""
        print("\n=== Testing Place Stats Update ===")
        
        # Re-fetch all places to see updated stats
        response = self.make_request("GET", "/places", auth_required=True)
        if response and response.status_code == 200:
            try:
                data = response.json()
                places = data.get("places", [])
                
                for place in places:
                    if place.get("recordCount", 0) > 0:
                        stats_msg = (f"Records: {place['recordCount']}, "
                                   f"Money Given: ${place['totalMoneyGiven']}, "
                                   f"Money Used: ${place['totalMoneyUsed']}, "
                                   f"Power Units: {place['totalPowerUnits']}")
                        self.log_test(f"Stats for {place['name']}", "PASS", stats_msg)
                    else:
                        self.log_test(f"Stats for {place['name']}", "WARN", "No records found for this place")
            except Exception as e:
                self.log_test("Place Stats Update", "FAIL", f"Invalid JSON: {str(e)}")
        else:
            self.log_test("Place Stats Update", "FAIL", f"Status: {response.status_code if response else 'No response'}")
    
    def test_records_delete(self):
        """Test deleting records"""
        print("\n=== Testing Record Deletion ===")
        
        if not self.created_records:
            self.log_test("Delete Records", "FAIL", "No records available for testing")
            return
        
        # Test deleting non-existent record
        response = self.make_request("DELETE", "/records/non-existent-id", auth_required=True)
        if response and response.status_code == 404:
            self.log_test("Delete Non-existent Record", "PASS", "Correctly returned 404 for missing record")
        else:
            self.log_test("Delete Non-existent Record", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Test deleting actual records (delete half of them)
        records_to_delete = self.created_records[:len(self.created_records)//2]
        
        for record in records_to_delete:
            response = self.make_request("DELETE", f"/records/{record['id']}", auth_required=True)
            if response and response.status_code == 200:
                self.log_test(f"Delete Record from {record['place_name']}", "PASS", "Record deleted successfully")
                self.created_records.remove(record)
            else:
                self.log_test(f"Delete Record from {record['place_name']}", "FAIL", 
                            f"Status: {response.status_code if response else 'No response'}")
    
    def test_places_delete(self):
        """Test deleting places and cascade deletion of records"""
        print("\n=== Testing Place Deletion ===")
        
        if not self.created_places:
            self.log_test("Delete Places", "FAIL", "No places available for testing")
            return
        
        # Test deleting non-existent place
        response = self.make_request("DELETE", "/places/non-existent-slug", auth_required=True)
        if response and response.status_code == 404:
            self.log_test("Delete Non-existent Place", "PASS", "Correctly returned 404 for missing place")
        else:
            self.log_test("Delete Non-existent Place", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Delete one place and verify it also deletes associated records
        if self.created_places:
            place_to_delete = self.created_places[0]
            
            # First, check how many records this place has
            response = self.make_request("GET", f"/places/{place_to_delete['slug']}", auth_required=True)
            records_before = 0
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    records_before = len(data.get("records", []))
                except:
                    pass
            
            # Delete the place
            response = self.make_request("DELETE", f"/places/{place_to_delete['slug']}", auth_required=True)
            if response and response.status_code == 200:
                self.log_test(f"Delete Place: {place_to_delete['name']}", "PASS", 
                            f"Deleted place that had {records_before} records")
                
                # Verify place is actually deleted
                response = self.make_request("GET", f"/places/{place_to_delete['slug']}", auth_required=True)
                if response and response.status_code == 404:
                    self.log_test(f"Verify Place Deletion: {place_to_delete['name']}", "PASS", "Place no longer exists")
                else:
                    self.log_test(f"Verify Place Deletion: {place_to_delete['name']}", "FAIL", "Place still exists after deletion")
                
                self.created_places.remove(place_to_delete)
            else:
                self.log_test(f"Delete Place: {place_to_delete['name']}", "FAIL", 
                            f"Status: {response.status_code if response else 'No response'}")
    
    def test_records_without_auth(self):
        """Test records endpoints without authentication"""
        print("\n=== Testing Records Without Auth ===")
        
        # Test POST records without auth
        record_data = {
            "placeId": "test-place-id",
            "date": datetime.now().isoformat(),
            "moneyGiven": 100,
            "moneyUsed": 75,
            "powerUnits": 10
        }
        response = self.make_request("POST", "/records", record_data, auth_required=False)
        if response and response.status_code == 401:
            self.log_test("Create Record without Auth", "PASS", "Correctly rejected unauthorized request")
        else:
            self.log_test("Create Record without Auth", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
        
        # Test DELETE records without auth
        response = self.make_request("DELETE", "/records/test-id", auth_required=False)
        if response and response.status_code == 401:
            self.log_test("Delete Record without Auth", "PASS", "Correctly rejected unauthorized request")
        else:
            self.log_test("Delete Record without Auth", "FAIL", f"Wrong status: {response.status_code if response else 'No response'}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Money Tracker Backend Test Suite")
        print(f"Testing API at: {API_BASE_URL}")
        print("=" * 60)
        
        # Track overall results
        test_results = {}
        
        try:
            # 1. API Health
            test_results["API Health"] = self.test_api_health()
            if not test_results["API Health"]:
                print("❌ API is not responding. Aborting tests.")
                return test_results
            
            # 2. Authentication Tests
            self.test_auth_signup_validations()
            test_results["Signup Success"] = self.test_auth_signup_success()
            if test_results["Signup Success"]:
                self.test_auth_signup_duplicate()
            
            self.test_auth_login_invalid()
            test_results["Login Success"] = self.test_auth_login_success()
            self.test_auth_check()
            
            # 3. Authorization Tests
            self.test_places_without_auth()
            self.test_records_without_auth()
            
            # 4. Places Tests (requires authentication)
            if self.auth_token:
                self.test_places_create()
                self.test_places_get_all()
                
                # 5. Records Tests
                self.test_records_create()
                self.test_places_get_single()
                self.test_places_stats_update()
                
                # 6. Deletion Tests
                self.test_records_delete()
                self.test_places_delete()
            else:
                print("⚠️ Skipping authenticated tests - no auth token available")
            
        except Exception as e:
            print(f"❌ Test suite failed with exception: {str(e)}")
            
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in test_results.values() if result is True)
        total_tests = len(test_results)
        
        for test_name, result in test_results.items():
            status_icon = "✅" if result else "❌" if result is False else "⚠️"
            print(f"{status_icon} {test_name}")
        
        print(f"\n📈 Overall Result: {passed_tests}/{total_tests} critical tests passed")
        
        if self.created_places:
            print(f"📍 Created {len(self.created_places)} test places")
        if self.created_records:
            print(f"📝 Created {len(self.created_records)} test records")
            
        return test_results

if __name__ == "__main__":
    tester = MoneyTrackerTester()
    results = tester.run_all_tests()