import { describe, expect, it } from 'vitest'
import { formatNotificationChannel } from './notificationFormat'

describe('formatNotificationChannel', () => {
  it('formats all supported channels, including future-facing ones', () => {
    expect(formatNotificationChannel('in_app')).toBe('In-app')
    expect(formatNotificationChannel('email')).toBe('Email')
    expect(formatNotificationChannel('telegram')).toBe('Telegram')
  })
})
