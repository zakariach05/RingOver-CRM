import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  await prisma.call.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.user.deleteMany()
  await prisma.team.deleteMany()

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

  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: 'Marie Dupont',
        company: 'Acme Corp',
        phone: '+33612345678',
        email: 'marie.dupont@acme.fr',
        tags: JSON.stringify(['prospect', 'prioritaire']),
        ownerId: agent.id,
        teamId: team.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Jean Martin',
        company: 'TechStart SAS',
        phone: '+33698765432',
        email: 'jean.martin@techstart.fr',
        tags: JSON.stringify(['client']),
        ownerId: agent.id,
        teamId: team.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Sophie Bernard',
        company: 'Global Services',
        phone: '+33711223344',
        email: 'sophie.bernard@global.fr',
        ownerId: manager.id,
        teamId: team.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Pierre Leroy',
        phone: '+33655667788',
        ownerId: admin.id,
        teamId: team.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Lucie Moreau',
        company: 'Innovate Ltd',
        phone: '+33799887766',
        email: 'lucie.moreau@innovate.fr',
        ownerId: manager.id,
        teamId: team.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Thomas Petit',
        company: 'DataFlow',
        phone: '+33644556677',
        ownerId: agent.id,
        teamId: team.id,
      },
    }),
  ])

  const [marie, jean, sophie, pierre, lucie, thomas] = contacts

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        title: 'Licences CRM — Acme Corp',
        value: 12500,
        stage: 'LEAD',
        contactId: marie.id,
        ownerId: agent.id,
        teamId: team.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Pack téléphonie 50 postes',
        value: 8900,
        stage: 'QUALIFIED',
        contactId: jean.id,
        ownerId: agent.id,
        teamId: team.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Migration cloud Global Services',
        value: 45000,
        stage: 'PROPOSAL',
        contactId: sophie.id,
        ownerId: manager.id,
        teamId: team.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Extension équipe commerciale',
        value: 22000,
        stage: 'NEGOTIATION',
        contactId: lucie.id,
        ownerId: manager.id,
        teamId: team.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Contrat annuel DataFlow',
        value: 15600,
        stage: 'WON',
        contactId: thomas.id,
        ownerId: agent.id,
        teamId: team.id,
        closedAt: daysAgo(5),
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Projet intégration API',
        value: 7800,
        stage: 'LOST',
        contactId: pierre.id,
        ownerId: admin.id,
        teamId: team.id,
        closedAt: daysAgo(12),
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Renouvellement Acme — Q2',
        value: 9800,
        stage: 'PROPOSAL',
        contactId: marie.id,
        ownerId: agent.id,
        teamId: team.id,
      },
    }),
  ])

  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000)
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000)

  const calls = await Promise.all([
    prisma.call.create({
      data: {
        fromNumber: '1002',
        toNumber: marie.phone,
        direction: 'OUTBOUND',
        status: 'COMPLETED',
        duration: 245,
        agentId: agent.id,
        contactId: marie.id,
        note: 'Discussion sur le devis licences CRM.',
        startedAt: hoursAgo(26),
        endedAt: hoursAgo(26),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: sophie.phone,
        toNumber: '1003',
        direction: 'INBOUND',
        status: 'COMPLETED',
        duration: 180,
        agentId: manager.id,
        contactId: sophie.id,
        startedAt: hoursAgo(20),
        endedAt: hoursAgo(20),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: '+33600001111',
        toNumber: '1002',
        direction: 'INBOUND',
        status: 'MISSED',
        agentId: agent.id,
        startedAt: hoursAgo(8),
        endedAt: hoursAgo(8),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: '1002',
        toNumber: pierre.phone,
        direction: 'OUTBOUND',
        status: 'NO_ANSWER',
        agentId: agent.id,
        contactId: pierre.id,
        startedAt: hoursAgo(6),
        endedAt: hoursAgo(6),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: '1001',
        toNumber: '+33600009999',
        direction: 'OUTBOUND',
        status: 'FAILED',
        agentId: admin.id,
        startedAt: hoursAgo(4),
        endedAt: hoursAgo(4),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: '1003',
        toNumber: lucie.phone,
        direction: 'OUTBOUND',
        status: 'COMPLETED',
        duration: 420,
        agentId: manager.id,
        contactId: lucie.id,
        note: 'Négociation conditions contractuelles.',
        startedAt: hoursAgo(2),
        endedAt: hoursAgo(2),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: '1002',
        toNumber: jean.phone,
        direction: 'OUTBOUND',
        status: 'COMPLETED',
        duration: 95,
        agentId: agent.id,
        contactId: jean.id,
        startedAt: minutesAgo(90),
        endedAt: minutesAgo(88),
        teamId: team.id,
      },
    }),
    prisma.call.create({
      data: {
        fromNumber: thomas.phone,
        toNumber: '1001',
        direction: 'INBOUND',
        status: 'NO_ANSWER',
        agentId: admin.id,
        contactId: thomas.id,
        startedAt: minutesAgo(45),
        endedAt: minutesAgo(44),
        teamId: team.id,
      },
    }),
  ])

  console.log('Seed completed:', {
    teamId: team.id,
    users: { admin: admin.id, agent: agent.id, manager: manager.id },
    contacts: contacts.length,
    deals: deals.length,
    calls: calls.length,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
