/**
 * Script to create student authentication accounts when admin adds them to blockchain
 * Default password is the student's roll number
 * Students should change password after first login
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const USERS_FILE = path.join(__dirname, '../../data/users.json');

async function createStudentUser(studentData) {
    const { rollNumber, email, name, department } = studentData;
    
    console.log(`\nCreating authentication account for student: ${rollNumber}`);
    
    // Read existing users
    let users = [];
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        users = JSON.parse(data);
    } catch (error) {
        console.log('No existing users file found, creating new one');
        users = [];
    }

    // Check if student already exists
    const existingUser = users.find(u => u.username === rollNumber);
    if (existingUser) {
        console.log(`❌ Student ${rollNumber} already has an authentication account`);
        return { success: false, message: 'User already exists' };
    }

    // Default password is roll number (student must change after first login)
    const defaultPassword = rollNumber;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create new user
    const newUser = {
        id: `student-${Date.now()}`,
        username: rollNumber,
        email: email || `${rollNumber}@student.nitw.ac.in`,
        passwordHash: passwordHash,
        name: name,
        role: 'student',
        department: department || 'CSE',
        mspId: 'NITWarangalMSP',
        createdAt: new Date().toISOString(),
        isActive: true,
        passwordChangeRequired: true, // Flag to force password change on first login
        firstLogin: true
    };

    users.push(newUser);

    // Save to file
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    console.log(`✅ Authentication account created successfully`);
    console.log(`   Roll Number: ${rollNumber}`);
    console.log(`   Default Password: ${rollNumber}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Department: ${newUser.department}`);
    console.log(`\n⚠️  IMPORTANT: Student must change password after first login!`);

    return {
        success: true,
        message: 'Student authentication account created',
        credentials: {
            username: rollNumber,
            defaultPassword: rollNumber,
            email: newUser.email
        }
    };
}

// If run directly from command line
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log(`
Usage: node createStudentFromBlockchain.js <rollNumber> [email] [name] [department]

Examples:
  node createStudentFromBlockchain.js 23mcf1r30
  node createStudentFromBlockchain.js 23mcf1r30 prince@student.nitw.ac.in "Prince Kumar" CSE
  node createStudentFromBlockchain.js 23mcf1r31 "" "Test Student" ECE

Note: Default password will be the roll number
Students must change password after first login
        `);
        process.exit(1);
    }

    const [rollNumber, email, name, department] = args;

    createStudentUser({
        rollNumber,
        email,
        name: name || rollNumber,
        department: department || 'CSE'
    })
    .then(result => {
        if (result.success) {
            console.log('\n✅ Success! Student can now login with:');
            console.log(`   Username: ${result.credentials.username}`);
            console.log(`   Password: ${result.credentials.defaultPassword}`);
            process.exit(0);
        } else {
            console.error(`\n❌ ${result.message}`);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = { createStudentUser };
