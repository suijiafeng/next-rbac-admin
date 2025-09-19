import bcrypt from 'bcryptjs';

async function main() {
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('明文密码:', password);
  console.log('加密结果:', hashedPassword);
}

main();