/**
 * Script to create student users in the authentication system
 * This syncs blockchain students with the backend authentication
 */

const { createUser } = require('../utils/userManager');
const logger = require('../utils/logger');

/**
 * Create a student user account
 * @param {string} rollNumber - Student's roll number (will be used as username)
 * @param {string} password - Student's password
 * @param {string} email - Student's email
 * @param {string} department - Student's department
 */
async function createStudentUser(rollNumber, password, email, department = 'CSE') {
    try {
        const studentData = {
            username: rollNumber,
            email: email || `${rollNumber}@student.nitw.ac.in`,
            password: password,
            role: 'student',
            department: department
        };

        const user = await createUser(studentData);
        console.log(`✅ Student user created successfully!`);
        console.log(`   Roll Number: ${rollNumber}`);
        console.log(`   Email: ${studentData.email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: student`);
        console.log(`   Department: ${department}`);
        
        return user;
    } catch (error) {
        console.error(`❌ Error creating student user:`, error.message);
        throw error;
    }
}

/**
 * Create multiple student users at once
 */
async function createMultipleStudents() {
    const students = [
        {
            rollNumber: '23mcf1r30',
            password: 'student123',
            email: '23mcf1r30@student.nitw.ac.in',
            department: 'CSE'
        },
        // Add more students as needed
    ];

    console.log('\n🔐 Creating Student User Accounts...\n');

    for (const student of students) {
        try {
            await createStudentUser(
                student.rollNumber,
                student.password,
                student.email,
                student.department
            );
            console.log('-----------------------------------\n');
        } catch (error) {
            console.error(`Failed to create student ${student.rollNumber}:`, error.message);
            console.log('-----------------------------------\n');
        }
    }

    console.log('\n✅ Student user creation complete!\n');
}

// If run directly, create the default student
if (require.main === module) {
    console.log('\n========================================');
    console.log('   Student User Creation Script');
    console.log('========================================\n');

    // Check if command line arguments are provided
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // No arguments - create default students
        createMultipleStudents()
            .then(() => {
                console.log('✅ All done!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Error:', error.message);
                process.exit(1);
            });
    } else if (args.length >= 2) {
        // Arguments provided - create custom student
        const [rollNumber, password, email, department] = args;
        
        createStudentUser(rollNumber, password, email, department || 'CSE')
            .then(() => {
                console.log('\n✅ Student user created successfully!');
                console.log('\nYou can now login with:');
                console.log(`   Email/Username: ${rollNumber}`);
                console.log(`   Password: ${password}\n`);
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n❌ Error:', error.message);
                process.exit(1);
            });
    } else {
        console.log('Usage:');
        console.log('  1. Create default students:');
        console.log('     node createStudentUser.js');
        console.log('\n  2. Create specific student:');
        console.log('     node createStudentUser.js <rollNumber> <password> [email] [department]');
        console.log('\nExample:');
        console.log('     node createStudentUser.js 23mcf1r30 student123 23mcf1r30@student.nitw.ac.in CSE\n');
        process.exit(1);
    }
}

module.exports = { createStudentUser, createMultipleStudents };
