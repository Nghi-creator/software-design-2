export const shellClass = 'min-h-screen bg-background-page text-text-primary antialiased'

export const frameClass =
  'mx-auto grid w-full box-border gap-theme-lg px-theme-md py-theme-lg md:px-theme-xl'

export const cardClass = 'rounded-theme-lg border border-border-subtle bg-surface-card shadow-theme-sm'

export const panelClass = `${cardClass} p-theme-lg`

export const focusClass = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus'

export const buttonClass =
  `inline-flex min-h-10 items-center justify-center rounded-theme-md bg-brand-primary px-theme-md text-sm font-bold text-text-primary shadow-theme-glow transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`

export const secondaryButtonClass =
  `inline-flex min-h-10 items-center justify-center rounded-theme-md border border-border-strong bg-surface-card px-theme-md text-sm font-bold text-text-primary transition hover:border-brand-primary hover:bg-surface-cardHover disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`

export const linkButtonClass =
  `inline-flex min-h-10 items-center justify-center rounded-theme-md px-theme-sm text-sm font-bold text-brand-secondary transition hover:bg-background-overlay ${focusClass}`
