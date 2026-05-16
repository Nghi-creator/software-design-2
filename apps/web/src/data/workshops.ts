import type { Workshop } from '../types'

export const sampleWorkshops: Workshop[] = [
  {
    id: 'workshop-career-launchpad',
    title: 'Career Launchpad: CV, LinkedIn and Interview Clinic',
    speaker: 'Lan Pham',
    roomId: 'hall-a1',
    room: {
      id: 'hall-a1',
      name: 'Hall A1',
      location: 'Main building, floor 1',
      capacity: 120,
      layoutUrl: '/room-layouts/hall-a1.png',
    },
    startTime: '2026-06-01T09:00:00.000Z',
    capacity: 120,
    seatsRemaining: 24,
    price: 0,
    pdfUrl: null,
    aiSummary:
      'A practical clinic for students preparing internship applications, with hands-on CV feedback and interview practice.',
  },
  {
    id: 'workshop-design-systems',
    title: 'Design Systems for Student Builders',
    speaker: 'Minh Truong',
    roomId: 'lab-b3',
    room: {
      id: 'lab-b3',
      name: 'Lab B3',
      location: 'Technology block, floor 2',
      capacity: 60,
      layoutUrl: '/room-layouts/lab-b3.png',
    },
    startTime: '2026-06-02T13:30:00.000Z',
    capacity: 60,
    seatsRemaining: 8,
    price: 59000,
    pdfUrl: '/uploads/design-systems.pdf',
    aiSummary:
      'A compact design systems session covering reusable UI rules, naming, tokens and collaborative handoff.',
  },
  {
    id: 'workshop-ai-internships',
    title: 'AI for Internships: Prompting and Portfolio Proof',
    speaker: 'Dr. Ha Nguyen',
    roomId: 'innovation-hub',
    room: {
      id: 'innovation-hub',
      name: 'Innovation Hub',
      location: 'Library annex',
      capacity: 80,
      layoutUrl: '/room-layouts/innovation-hub.png',
    },
    startTime: '2026-06-03T10:00:00.000Z',
    capacity: 80,
    seatsRemaining: 0,
    price: 79000,
    pdfUrl: '/uploads/ai-internships.pdf',
    aiSummary: null,
  },
]
