import { useSearchParams } from 'react-router-dom'
import AuthForm from '../components/auth/AuthForm'

export default function AuthPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin'
  return <AuthForm defaultMode={mode} />
}
