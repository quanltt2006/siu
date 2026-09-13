#!/usr/bin/env python3
"""Test script for Smart CSV Analyst API"""
import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def test_upload():
    """Test CSV upload"""
    print("=" * 60)
    print("TEST 1: Upload CSV")
    print("=" * 60)
    
    # Create sample CSV
    csv_content = """id,name,category,price,quantity,rating,city,date
1,Product A,Electronics,299.99,50,4.5,Hà Nội,2024-01-15
2,Product B,Clothing,49.99,120,4.2,TP.HCM,2024-01-16
3,Product C,Food,15.50,200,4.8,Đà Nẵng,2024-01-17
4,Product D,Books,25.00,80,4.6,Hải Phòng,2024-01-18
5,Product E,Sports,89.99,65,4.3,Cần Thơ,2024-01-19
6,Product F,Electronics,599.99,30,4.7,Hà Nội,2024-01-20
7,Product G,Clothing,79.99,95,4.1,TP.HCM,2024-01-21
8,Product H,Food,12.99,150,4.9,Đà Nẵng,2024-01-22
9,Product I,Books,35.00,60,4.4,Hải Phòng,2024-01-23
10,Product J,Sports,129.99,45,4.5,Cần Thơ,2024-01-24
"""
    
    with open('test_data.csv', 'w') as f:
        f.write(csv_content)
    
    # Upload
    with open('test_data.csv', 'rb') as f:
        files = {'file': ('test_data.csv', f, 'text/csv')}
        response = requests.post(f"{BASE_URL}/upload", files=files)
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Dataset ID: {result.get('dataset_id')}")
    print(f"Message: {result.get('message')}")
    
    if response.status_code == 200:
        profile = result.get('profile', {})
        print(f"Rows: {profile.get('row_count')}")
        print(f"Columns: {profile.get('column_count')}")
        print(f"Description: {profile.get('inferred_description', 'N/A')[:100]}...")
        return result.get('dataset_id')
    else:
        print(f"Error: {result}")
        return None

def test_profile(dataset_id):
    """Test get profile"""
    print("\n" + "=" * 60)
    print("TEST 2: Get Profile")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/profile/{dataset_id}")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        profile = response.json()
        print(f"File: {profile.get('file_name')}")
        print(f"Size: {profile.get('file_size')}")
        print(f"\nColumns:")
        for col in profile.get('columns', []):
            print(f"  - {col.get('name')} ({col.get('dtype')}): {col.get('unique_count')} unique")
    else:
        print(f"Error: {response.json()}")

def test_context(dataset_id):
    """Test update context"""
    print("\n" + "=" * 60)
    print("TEST 3: Update Context")
    print("=" * 60)
    
    contexts = {
        "columns": [
            {"name": "category", "user_description": "Loại sản phẩm: Electronics, Clothing, Food, Books, Sports"},
            {"name": "price", "user_description": "Giá bán sản phẩm (VNĐ, đã bao gồm VAT)"},
            {"name": "quantity", "user_description": "Số lượng sản phẩm đã bán trong tháng"},
            {"name": "rating", "user_description": "Đánh giá trung bình từ khách hàng (1-5 sao)"},
            {"name": "city", "user_description": "Thành phố nơi khách hàng mua hàng"}
        ]
    }
    
    response = requests.put(f"{BASE_URL}/context/{dataset_id}", json=contexts)
    print(f"Status: {response.status_code}")
    print(f"Message: {response.json().get('message')}")

def test_chat(dataset_id, question):
    """Test chat"""
    print("\n" + "=" * 60)
    print(f"TEST 4: Chat - {question}")
    print("=" * 60)
    
    response = requests.post(
        f"{BASE_URL}/chat/{dataset_id}",
        json={"question": question}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        message = result.get('message', {})
        print(f"Route: {message.get('route_type')}")
        print(f"\nResponse:\n{message.get('content')}")
        
        if message.get('code'):
            print(f"\nGenerated Code:\n```python\n{message.get('code')}\n```")
    else:
        print(f"Error: {response.json()}")

def main():
    """Run all tests"""
    print("\n🚀 Smart CSV Analyst API Test Suite\n")
    
    # Check if API is running
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code != 200:
            print("❌ API is not running. Start it with: uvicorn app.main:app --reload")
            return
    except:
        print("❌ API is not running. Start it with: uvicorn app.main:app --reload")
        return
    
    print("✅ API is running\n")
    
    # Test upload
    dataset_id = test_upload()
    if not dataset_id:
        return
    
    time.sleep(1)  # Wait for processing
    
    # Test profile
    test_profile(dataset_id)
    
    # Test context
    test_context(dataset_id)
    
    time.sleep(1)  # Wait for re-embedding
    
    # Test chat - RAG
    test_chat(dataset_id, "Dataset này nói về gì?")
    
    time.sleep(0.5)
    
    # Test chat - Code-gen
    test_chat(dataset_id, "Tính trung bình giá sản phẩm")
    
    time.sleep(0.5)
    
    # Test chat - Code-gen
    test_chat(dataset_id, "Top 3 sản phẩm có giá cao nhất")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
