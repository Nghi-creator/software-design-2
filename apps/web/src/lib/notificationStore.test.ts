import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveStoredSession } from './auth'
import { getStoredNotifications, markNotificationRead } from './notificationStore'

const user = {
  id: 'student-1',
  email: 'student@example.com',
  name: 'Student',
  role: 'STUDENT' as const,
}

describe('notificationStore', () => {
  beforeEach(() => {
    localStorage.clear()
    saveStoredSession({ user, accessToken: 'access-token-1' })
    vi.restoreAllMocks()
  })

  it('loads notifications from the API and maps backend enums', async () => {
    const fetchMock = mockFetch({
      success: true,
      items: [
        {
          id: 'notification-1',
          userId: user.id,
          registrationId: 'registration-1',
          workshopId: 'workshop-1',
          channel: 'EMAIL',
          subject: 'Registration confirmed',
          body: 'You are confirmed.',
          status: 'SENT',
          createdAt: '2026-05-17T09:00:00.000Z',
          sentAt: '2026-05-17T09:00:01.000Z',
          readAt: null,
        },
      ],
      pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    })

    await expect(getStoredNotifications()).resolves.toMatchObject([
      {
        id: 'notification-1',
        title: 'Registration confirmed',
        message: 'You are confirmed.',
        channel: 'email',
        status: 'sent',
        registrationId: 'registration-1',
        workshopId: 'workshop-1',
      },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/notifications?pageSize=50',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe('Bearer access-token-1')
  })

  it('marks a notification read through the API', async () => {
    mockFetch({
      success: true,
      notification: {
        id: 'notification-1',
        userId: user.id,
        registrationId: null,
        workshopId: null,
        channel: 'EMAIL',
        subject: 'Registration confirmed',
        body: 'You are confirmed.',
        status: 'SENT',
        createdAt: '2026-05-17T09:00:00.000Z',
        sentAt: '2026-05-17T09:00:01.000Z',
        readAt: '2026-05-17T09:05:00.000Z',
      },
    })

    await expect(markNotificationRead('notification-1')).resolves.toMatchObject({
      id: 'notification-1',
      readAt: '2026-05-17T09:05:00.000Z',
    })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/notifications/notification-1/read',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response)
}
