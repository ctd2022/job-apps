#!/usr/bin/env python3
"""
Test script for Job Application Workflow API
Run this after starting the server to verify endpoints work.

Usage:
    1. Start the server: python -m uvicorn backend.main:app --reload
    2. In another terminal: python backend/test_api.py
"""

import requests
import json
import time
import tempfile
from pathlib import Path

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health check endpoint"""
    print("\n1️⃣ Testing health check...")
    
    response = requests.get(f"{BASE_URL}/")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Status: {data['status']}")
        print(f"   ✅ Version: {data['version']}")
        print(f"   ✅ Backends: {data['backends_available']}")
        return True
    else:
        print(f"   ❌ Failed: {response.status_code}")
        return False


def test_list_backends():
    """Test backends listing endpoint"""
    print("\n2️⃣ Testing backends list...")
    
    response = requests.get(f"{BASE_URL}/api/backends")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Found {len(data['backends'])} backends:")
        for backend in data['backends']:
            status = "✅" if backend['available'] else "❌"
            print(f"      {status} {backend['name']} ({backend['id']})")
        return True
    else:
        print(f"   ❌ Failed: {response.status_code}")
        return False


def test_list_applications():
    """Test applications listing endpoint"""
    print("\n3️⃣ Testing applications list...")
    
    response = requests.get(f"{BASE_URL}/api/applications")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Found {data['total']} applications")
        if data['applications']:
            print("   Recent applications:")
            for app in data['applications'][:3]:
                print(f"      - {app['job_name']} ({app['backend']}) ATS: {app['ats_score']}")
        return True
    else:
        print(f"   ❌ Failed: {response.status_code}")
        return False


def test_list_jobs():
    """Test jobs listing endpoint"""
    print("\n4️⃣ Testing jobs list...")
    
    response = requests.get(f"{BASE_URL}/api/jobs")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Found {data['total']} jobs in queue/history")
        return True
    else:
        print(f"   ❌ Failed: {response.status_code}")
        return False


def test_create_job_dry_run():
    """Test job creation with mock files (just validates endpoint structure)"""
    print("\n5️⃣ Testing job creation endpoint structure...")
    
    # Create minimal test files
    test_cv = "# John Smith\n\nSoftware Engineer with 5 years experience."
    test_job = "Software Engineer position at TechCorp. Requirements: Python, FastAPI."
    
    # Use Windows-compatible temp directory
    temp_dir = Path(tempfile.gettempdir())
    cv_path = temp_dir / "test_cv.txt"
    job_path = temp_dir / "test_job.txt"
    
    cv_path.write_text(test_cv, encoding='utf-8')
    job_path.write_text(test_job, encoding='utf-8')
    
    try:
        with open(cv_path, "rb") as cv_file, open(job_path, "rb") as job_file:
            files = {
                "cv_file": ("test_cv.txt", cv_file, "text/plain"),
                "job_desc_file": ("test_job.txt", job_file, "text/plain"),
            }
            data = {
                "company_name": "TestCorp",
                "enable_ats": "false",  # Disable ATS for quick test
                "backend_type": "ollama",
                "backend_model": "llama3.1:8b",
            }
            
            response = requests.post(f"{BASE_URL}/api/jobs", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Job created: {result['job_id']}")
                print(f"   ✅ Status: {result['status']}")
                
                # Check job status
                time.sleep(1)
                status_response = requests.get(f"{BASE_URL}/api/jobs/{result['job_id']}")
                if status_response.status_code == 200:
                    status = status_response.json()
                    print(f"   ✅ Progress: {status['progress']}% - {status['current_step']}")
                
                return result['job_id']
            else:
                print(f"   ⚠️ Job creation returned: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return None
                
    finally:
        # Clean up
        cv_path.unlink(missing_ok=True)
        job_path.unlink(missing_ok=True)


def test_api_docs():
    """Test that API docs are accessible"""
    print("\n6️⃣ Testing API documentation...")
    
    response = requests.get(f"{BASE_URL}/docs")
    
    if response.status_code == 200:
        print("   ✅ Swagger UI accessible at /docs")
        return True
    else:
        print(f"   ❌ Failed: {response.status_code}")
        return False


def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║     Job Application Workflow API - Test Suite                ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    print(f"Testing API at: {BASE_URL}")
    
    # Check if server is running
    try:
        requests.get(f"{BASE_URL}/", timeout=2)
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Server not running!")
        print("   Start the server first:")
        print("   python -m uvicorn backend.main:app --reload")
        return
    
    results = []
    
    results.append(("Health Check", test_health()))
    results.append(("List Backends", test_list_backends()))
    results.append(("List Applications", test_list_applications()))
    results.append(("List Jobs", test_list_jobs()))
    results.append(("API Docs", test_api_docs()))
    
    # Only run job creation test if other tests pass
    if all(r[1] for r in results):
        job_id = test_create_job_dry_run()
        results.append(("Create Job", job_id is not None))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    
    for name, passed_test in results:
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"   {status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! API is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the server logs for details.")


if __name__ == "__main__":
    main()
    