import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../components/i18n/LanguageSwitcher'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/axios'
import { fieldError } from '../lib/utils'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login, isLoggingIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')

  if (user) return <Navigate to="/home" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!username.trim()) nextErrors.username = t('auth.usernameRequired')
    else if (username.length > 50) nextErrors.username = t('auth.usernameTooLong')
    if (!password) nextErrors.password = t('auth.passwordRequired')
    else if (password.length > 128) nextErrors.password = t('auth.passwordTooLong')
    setErrors(nextErrors)
    setGeneralError('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      await login({ username: username.trim(), password })
      const destination = (location.state as { from?: string } | null)?.from ?? '/home'
      navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          username: fieldError(error.errors, 'Username') ?? '',
          password: fieldError(error.errors, 'Password') ?? '',
        })
        setGeneralError(error.message)
      } else {
        setGeneralError(t('auth.failed'))
      }
    }
  }

  return (
    <main className="relative grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <LanguageSwitcher className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6" />
      <section className="hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 font-black">E</span>
          <span className="font-bold">{t('common.brand')}</span>
        </div>
        <div className="my-auto max-w-xl">
          <h1 className="text-5xl font-black leading-tight tracking-tight">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            {t('auth.heroDescription')}
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 pt-20 sm:p-10 sm:pt-24 lg:pt-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-black text-white">E</span>
            <span className="font-bold text-slate-900">{t('common.brand')}</span>
          </div>
          <p className="text-sm font-bold text-indigo-600">{t('auth.welcomeBack')}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{t('auth.signInTitle')}</h2>

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <Field label={t('auth.username')} error={errors.username} required>
              <Input
                autoComplete="username"
                autoFocus
                value={username}
                placeholder={t('auth.usernamePlaceholder')}
                onChange={(event) => {
                  setUsername(event.target.value)
                  setErrors((current) => ({ ...current, username: '' }))
                }}
              />
            </Field>
            <Field label={t('auth.password')} error={errors.password} required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                placeholder={t('auth.passwordPlaceholder')}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setErrors((current) => ({ ...current, password: '' }))
                }}
              />
            </Field>
            {generalError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {generalError}
              </p>
            )}
            <Button className="w-full" type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}