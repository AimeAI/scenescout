import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { PasswordReset } from '@/components/auth/PasswordReset'

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'login'
  const next = searchParams.get('next') || '/'

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">SceneScout</h1>
          <p className="text-gray-400 mt-2">Sign in to your account</p>
        </div>

        <div className="flex justify-center space-x-1 bg-gray-800 p-1 rounded-lg">
          <Link
            to={`/auth?tab=login${next !== '/' ? `&next=${next}` : ''}`}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'login'
                ? 'bg-white text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sign In
          </Link>
          <Link
            to={`/auth?tab=register${next !== '/' ? `&next=${next}` : ''}`}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'register'
                ? 'bg-white text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sign Up
          </Link>
          <Link
            to={`/auth?tab=reset${next !== '/' ? `&next=${next}` : ''}`}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'reset'
                ? 'bg-white text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Reset
          </Link>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg">
          {tab === 'login' && <LoginForm />}
          {tab === 'register' && <RegisterForm />}
          {tab === 'reset' && <PasswordReset />}
        </div>

        <div className="text-center text-sm text-gray-400">
          <Link to="/" className="hover:text-white transition-colors">
            ← Back to SceneScout
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Auth