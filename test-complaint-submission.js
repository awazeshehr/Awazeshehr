const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  try {
    console.log('🚀 Starting Complaint Submission Test...');

    // 1. Register a new user
    const uniqueId = Date.now();
    const userPayload = {
      fullName: `Test User ${uniqueId}`,
      email: `testuser${uniqueId}@example.com`,
      password: 'password123',
      cnic: `CNIC${uniqueId}`, // simplified for test
      phone: `0300${uniqueId.toString().slice(-7)}`,
      role: 'citizen'
    };

    console.log('1️⃣ Registering user...');
    try {
        await axios.post(`${API_URL}/auth/register`, userPayload);
    } catch (e) {
        // If registration fails (e.g. strict validation), try login
        console.log('Registration might have failed, trying to continue if token exists...');
    }
    
    // Login to get token
    console.log('2️⃣ Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: userPayload.email,
      password: userPayload.password
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in. Token received.');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Fetch Departments
    console.log('3️⃣ Fetching Departments...');
    const depRes = await axios.get(`${API_URL}/complaints/data/departments`, { headers });
    const departments = depRes.data.departments;
    if (departments.length === 0) throw new Error('No departments found');
    
    // Pick a department that has Urban area type
    const urbanDep = departments.find(d => d.areaTypes.includes('Urban')) || departments[0];
    const departmentId = urbanDep._id;
    const service = urbanDep.servicesOffered[0] || 'General';
    console.log(`✅ Selected Department: ${urbanDep.name} (ID: ${departmentId})`);
    console.log(`✅ Selected Service: ${service}`);

    // 3. Fetch Sectors
    console.log('4️⃣ Fetching Sectors...');
    const secRes = await axios.get(`${API_URL}/complaints/data/sectors`, { headers });
    const sectors = secRes.data.sectors;
    if (sectors.length === 0) {
        // If no sectors, we might need to create one via SuperAdmin, but let's assume one exists or use a dummy if strict validation isn't enforcing existence in DB yet (it is enforced in submit endpoint logic? No, only in Department update).
        // Wait, the submit endpoint doesn't validate sector existence strictly against DB, just saves it.
        // But the frontend fetches it.
        console.warn('⚠️ No sectors found. Using dummy "F-6".');
    }
    const sectorName = sectors.length > 0 ? sectors[0].name : 'F-6';
    console.log(`✅ Selected Sector: ${sectorName}`);

    // 4. Submit Complaint
    console.log('5️⃣ Submitting Complaint...');
    const form = new FormData();
    form.append('departmentId', departmentId);
    form.append('service', service);
    form.append('description', 'Test complaint via script with new hierarchy');
    
    const locationData = JSON.stringify({
      lat: 33.7294,
      lng: 73.0931,
      address: 'Test Address, Islamabad',
      areaType: 'Urban',
      sector: sectorName,
      ruralJurisdiction: ''
    });
    form.append('location', locationData);

    // Add a dummy file
    fs.writeFileSync('test-image.jpg', 'dummy content');
    form.append('media', fs.createReadStream('test-image.jpg'));

    const submitRes = await axios.post(`${API_URL}/complaints/submit`, form, {
      headers: {
        ...headers,
        ...form.getHeaders()
      }
    });

    console.log('🎉 Complaint Submitted Successfully!');
    console.log('Response:', submitRes.data);

    // Clean up
    fs.unlinkSync('test-image.jpg');

  } catch (error) {
    console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
  }
}

runTest();
