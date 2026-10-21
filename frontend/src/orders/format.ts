const money = new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' })
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

export const formatMoney = (cents: number) => money.format(cents / 100)
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
