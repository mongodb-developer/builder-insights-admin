'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  Divider,
} from '@mui/material';
import { Lightbulb, Email, Pin } from '@mui/icons-material';
import { mongoColors } from '@/theme';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(err);
  }, [searchParams]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess('Check your email — we sent you a verification code.');
      setShowCodeInput(true);
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.replace(/\s/g, '') }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
        return;
      }

      // Cookie is set by the API, redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: mongoColors.gray[100],
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Banner */}
          <Box
            component="img"
            src="/logo.svg"
            alt="Builder Insights"
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: 2,
              mb: 2,
            }}
          />

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: mongoColors.black,
                letterSpacing: '-0.02em',
              }}
            >
              Builder Insights
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Admin Portal
            </Typography>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {!showCodeInput ? (
            /* Email Form */
            <Box component="form" onSubmit={handleMagicLink}>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2.5 }}
                autoComplete="email"
                autoFocus
                placeholder="you@mongodb.com"
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !email.trim()}
                startIcon={<Email />}
                sx={{ 
                  py: 1.25, 
                  fontWeight: 600,
                  bgcolor: mongoColors.green,
                  color: mongoColors.black,
                  '&:hover': {
                    bgcolor: mongoColors.darkGreen,
                    color: mongoColors.white,
                  },
                }}
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </Box>
          ) : (
            /* Code Verification Form */
            <Box component="form" onSubmit={handleVerifyCode}>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Enter the 6-digit code sent to <strong>{email}</strong>
              </Typography>
              <TextField
                label="Verification Code"
                fullWidth
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))}
                sx={{ mb: 2.5 }}
                autoFocus
                placeholder="123 456"
                inputProps={{
                  style: { letterSpacing: '0.3em', fontSize: '1.25rem', textAlign: 'center' },
                  maxLength: 7,
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || code.replace(/\s/g, '').length !== 6}
                startIcon={<Pin />}
                sx={{ 
                  py: 1.25, 
                  fontWeight: 600,
                  bgcolor: mongoColors.green,
                  color: mongoColors.black,
                  '&:hover': {
                    bgcolor: mongoColors.darkGreen,
                    color: mongoColors.white,
                  },
                }}
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </Button>
              
              <Divider sx={{ my: 2 }} />
              
              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  setShowCodeInput(false);
                  setCode('');
                  setSuccess('');
                }}
                sx={{ color: 'text.secondary' }}
              >
                Use a different email
              </Button>
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 3,
              color: 'text.secondary',
            }}
          >
            {showCodeInput 
              ? 'Check your inbox and spam folder for the code.'
              : "We'll email you a verification code for password-free sign in."
            }
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
