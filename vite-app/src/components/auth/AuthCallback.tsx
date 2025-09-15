import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          navigate('/auth/login?error=callback_error')
          return
        }

        if (data.session) {
          // Successful authentication
          navigate('/', { replace: true })
        } else {
          navigate('/auth/login')
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        navigate('/auth/login?error=unexpected_error')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-white/60 mt-4">Completing sign in...</p>
      </div>
    </div>
  )
}
