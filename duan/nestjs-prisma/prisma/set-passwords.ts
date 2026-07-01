import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = '123456';

const accounts = [
  { userId: 'ADMIN001', name: 'Nguyen Dinh Thuan' },
  { userId: 'GV001', name: 'Nguyen Le Duy Thinh' },
  { userId: 'GV002', name: 'Pham Minh Duc' },
  { userId: 'GV003', name: 'Tran Thi Huong' },
  { userId: '2474802010476', name: 'Nguyen Viet Hai' },
  { userId: '2474802010477', name: 'Dau Quang Minh' },
  { userId: '2374802010478', name: 'Le Minh Tri' },
  { userId: '2274802010479', name: 'Nguyen Nhat Van' },
  { userId: '2474802010480', name: 'Tran Thi Bich Ngoc' },
];

async function main() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  console.log(`\nSetting default password "${DEFAULT_PASSWORD}" for all accounts...\n`);

  for (const account of accounts) {
    try {
      const user = await prisma.user.update({
        where: { userId: account.userId },
        data: { passwordHash: hash },
      });
      console.log(`  OK: ${user.userId.padEnd(20)} | ${user.fullName}`);
    } catch {
      console.log(`  NOT FOUND: ${account.userId} (${account.name})`);
    }
  }

  console.log('\n===== DONE =====');
  console.log(`All accounts now use password: "${DEFAULT_PASSWORD}"`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
