import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('Admin123', 10)
  const agentPassword = await bcrypt.hash('Agent123', 10)

  const team = await prisma.team.create({
    data: { name: 'RingOver Team' },
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ringover.com',
      passwordHash: adminPassword,
      name: 'Admin RingOver',
      role: 'ADMIN',
      teamId: team.id,
      phoneExtension: '1001',
    },
  })

  const agent = await prisma.user.create({
    data: {
      email: 'agent@ringover.com',
      passwordHash: agentPassword,
      name: 'Agent RingOver',
      role: 'AGENT',
      teamId: team.id,
      phoneExtension: '1002',
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@ringover.com',
      passwordHash: agentPassword,
      name: 'Manager RingOver',
      role: 'MANAGER',
      teamId: team.id,
      phoneExtension: '1003',
    },
  })

  console.log('Seed completed:', { teamId: team.id, adminId: admin.id, agentId: agent.id, managerId: manager.id })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
