import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addStoredNotification,
  getStoredNotifications,
  markNotificationRead,
} from './notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores in-app notifications as sent by default', () => {
    const notification = addStoredNotification({
      userId: 'student-1',
      title: 'Registration confirmed',
      message: 'You are confirmed.',
    })

    expect(notification.channel).toBe('in_app')
    expect(notification.status).toBe('sent')
    expect(getStoredNotifications('student-1')).toEqual([notification])
  })

  it('keeps users isolated and returns newest notifications first', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-17T09:00:00.000Z'))
    const first = addStoredNotification({
      userId: 'student-1',
      title: 'First',
      message: 'First',
    })
    vi.setSystemTime(new Date('2026-05-17T09:01:00.000Z'))
    const second = addStoredNotification({
      userId: 'student-1',
      title: 'Second',
      message: 'Second',
    })
    addStoredNotification({
      userId: 'student-2',
      title: 'Other user',
      message: 'Hidden',
    })
    vi.useRealTimers()

    expect(getStoredNotifications('student-1')).toEqual([second, first])
  })

  it('marks notifications as read', () => {
    const notification = addStoredNotification({
      userId: 'student-1',
      title: 'Registration confirmed',
      message: 'You are confirmed.',
    })

    markNotificationRead(notification.id)

    expect(getStoredNotifications('student-1')[0].readAt).toBeTruthy()
  })

  it('drops malformed persisted rows instead of crashing the app', () => {
    localStorage.setItem(
      'unihub.notifications',
      JSON.stringify([
        { id: 'valid', userId: 'student-1', title: 'Okay', message: 'Okay', channel: 'in_app' },
        { nonsense: true },
      ]),
    )

    expect(getStoredNotifications('student-1')).toHaveLength(1)
  })
})
