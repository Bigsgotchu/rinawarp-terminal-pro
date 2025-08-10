#!/usr/bin/env node

/**
 * Comprehensive API Test Script for RinaWarp Terminal Backend
 * Tests all subscription verification endpoints and authentication
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonData = body ? JSON.parse(body) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: jsonData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }

        req.end();
    });
}

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, success, message) {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}`);
    if (message) console.log(`   ${message}`);
    
    results.tests.push({ name, success, message });
    if (success) results.passed++;
    else results.failed++;
}

async function runTests() {
    console.log('🚀 Starting Comprehensive API Tests for RinaWarp Terminal Backend\\n');

    // Test 1: Health Check
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/health',
            method: 'GET'
        });

        if (response.statusCode === 200 && response.body.status === 'healthy') {
            logTest('Health Check', true, 'Server is healthy');
        } else {
            logTest('Health Check', false, `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Health Check', false, error.message);
    }

    // Test 2: Register User
    const testUser = {
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User'
    };

    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, testUser);

        if (response.statusCode === 201 && response.body.token) {
            logTest('User Registration', true, 'User registered successfully');
            testUser.token = response.body.token;
        } else {
            logTest('User Registration', false, `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
        }
    } catch (error) {
        logTest('User Registration', false, error.message);
    }

    // Test 3: Login User
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: testUser.email,
            password: testUser.password
        });

        if (response.statusCode === 200 && response.body.token) {
            logTest('User Login', true, 'Login successful');
            testUser.token = response.body.token; // Update token
        } else {
            logTest('User Login', false, `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('User Login', false, error.message);
    }

    // Test 4: Get Subscription Status (should require auth)
    if (testUser.token) {
        try {
            const response = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/subscription/status',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${testUser.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.statusCode === 200) {
                logTest('Get Subscription Status (Authenticated)', true, `Subscription: ${JSON.stringify(response.body)}`);
            } else {
                logTest('Get Subscription Status (Authenticated)', false, `Status: ${response.statusCode}`);
            }
        } catch (error) {
            logTest('Get Subscription Status (Authenticated)', false, error.message);
        }
    } else {
        logTest('Get Subscription Status (Authenticated)', false, 'No token available for test');
    }

    // Test 5: Get Subscription Status (unauthenticated - should fail)
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/subscription/status',
            method: 'GET'
        });

        if (response.statusCode === 401) {
            logTest('Get Subscription Status (Unauthenticated)', true, 'Correctly rejected unauthenticated request');
        } else {
            logTest('Get Subscription Status (Unauthenticated)', false, `Expected 401, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Get Subscription Status (Unauthenticated)', false, error.message);
    }

    // Test 6: Update Subscription
    if (testUser.token) {
        try {
            const response = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/subscription/update',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${testUser.token}`,
                    'Content-Type': 'application/json'
                }
            }, {
                tier: 'professional',
                stripeSubscriptionId: 'sub_test123'
            });

            if (response.statusCode === 200) {
                logTest('Update Subscription', true, 'Subscription updated successfully');
            } else {
                logTest('Update Subscription', false, `Status: ${response.statusCode}`);
            }
        } catch (error) {
            logTest('Update Subscription', false, error.message);
        }
    } else {
        logTest('Update Subscription', false, 'No token available for test');
    }

    // Test 7: Verify Feature Access
    if (testUser.token) {
        try {
            const response = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/subscription/verify-feature',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${testUser.token}`,
                    'Content-Type': 'application/json'
                }
            }, {
                feature: 'ai_assistant'
            });

            if (response.statusCode === 200) {
                logTest('Verify Feature Access', true, `Feature access: ${JSON.stringify(response.body)}`);
            } else {
                logTest('Verify Feature Access', false, `Status: ${response.statusCode}`);
            }
        } catch (error) {
            logTest('Verify Feature Access', false, error.message);
        }
    } else {
        logTest('Verify Feature Access', false, 'No token available for test');
    }

    // Test 8: Invalid endpoint (should return 404)
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/nonexistent',
            method: 'GET'
        });

        if (response.statusCode === 404) {
            logTest('Invalid Endpoint', true, 'Correctly returned 404 for non-existent endpoint');
        } else {
            logTest('Invalid Endpoint', false, `Expected 404, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Invalid Endpoint', false, error.message);
    }

    // Final Results
    console.log('\\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed === 0) {
        console.log('\\n🎉 All tests passed! Your backend API is working correctly.');
    } else {
        console.log('\\n⚠️  Some tests failed. Check the details above.');
        console.log('\\nFailed Tests:');
        results.tests
            .filter(test => !test.success)
            .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
    }

    console.log('\\n🏁 Testing completed.');
}

// Run the tests
runTests().catch(console.error);
