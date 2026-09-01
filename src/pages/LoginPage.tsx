import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/axios'
import { useMockData } from '../lib/config'
import { fieldError, roleLabel } from '../lib/utils'
import { mockUsers } from '../mocks/data'

export function LoginPage() {
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
    if (!username.trim()) nextErrors.username = 'Enter your username.'
    else if (username.length > 50) nextErrors.username = 'Username must be 50 characters or fewer.'
    if (!password) nextErrors.password = 'Enter your password.'
    else if (password.length > 128) nextErrors.password = 'Password must be 128 characters or fewer.'
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
        setGeneralError('Sign in failed. Please try again.')
      }
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 font-black">E</span>
          <span className="font-bold">Exam Archive</span>
        </div>
        <div className="my-auto max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-300">Academic resources</p>
          <h1 className="mt-5 text-5xl font-black leading-tight tracking-tight">
            Past papers, organized for every student.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Browse approved exams, contribute new material, and keep the archive useful for everyone.
          </p>
        </div>
        <p className="text-sm text-slate-500">University paper management</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-black text-white">E</span>
            <span className="font-bold text-slate-900">Exam Archive</span>
          </div>
          <p className="text-sm font-bold text-indigo-600">Welcome back</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Sign in to your account</h2>
          <p className="mt-2 text-sm text-slate-500">Use the credentials provided by your administrator.</p>

          {useMockData && (
            <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm font-bold text-indigo-950">Mock mode is active</p>
              <p className="mt-1 text-xs text-indigo-700">Choose an account to fill in its demo credentials.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {mockUsers.map((mockUser) => (
                  <button
                    key={mockUser.id}
                    type="button"
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-left text-xs text-indigo-950 transition hover:border-indigo-400 hover:bg-indigo-100"
                    onClick={() => {
                      setUsername(mockUser.username)
                      setPassword(mockUser.password)
                      setErrors({})
                      setGeneralError('')
                    }}
                  >
                    <span className="block font-bold">{mockUser.username}</span>
                    <span className="text-indigo-600">{roleLabel(mockUser.role)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <Field label="Username" error={errors.username} required>
              <Input
                autoComplete="username"
                autoFocus
                value={username}
                placeholder="Your username"
                onChange={(event) => {
                  setUsername(event.target.value)
                  setErrors((current) => ({ ...current, username: '' }))
                }}
              />
            </Field>
            <Field label="Password" error={errors.password} required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                placeholder="Your password"
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
              {isLoggingIn ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}