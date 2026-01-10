const localAuth = require('../src/services/auth/localAuth');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createUser(username, password, displayName, email, department) {
  try {
    console.log('\n🔧 Creating local user...\n');

    const user = await localAuth.register({
      username,
      password,
      displayName: displayName || username,
      email: email || '',
      department: department || ''
    });

    console.log('✅ User created successfully!\n');
    console.log('User details:');
    console.log('  Username:', user.username);
    console.log('  Display Name:', user.displayName);
    console.log('  Email:', user.email);
    console.log('  Department:', user.department);
    console.log('  User Key:', user.userKey);
    console.log('\nThe user can now login with username and password.');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

async function interactiveMode() {
  console.log('\n=== Create Local User ===\n');

  const username = await question('Username: ');
  const password = await question('Password: ');
  const displayName = await question('Display Name (optional): ');
  const email = await question('Email (optional): ');
  const department = await question('Department (optional): ');

  rl.close();

  await createUser(
    username.trim(),
    password.trim(),
    displayName.trim(),
    email.trim(),
    department.trim()
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await interactiveMode();
  } else if (args.length >= 2) {
    const [username, password, displayName, email, department] = args;
    await createUser(username, password, displayName, email, department);
    rl.close();
  } else {
    console.error('Usage:');
    console.error('  Interactive: node scripts/create-user.js');
    console.error('  CLI: node scripts/create-user.js <username> <password> [displayName] [email] [department]');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
