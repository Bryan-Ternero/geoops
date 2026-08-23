'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

import { signIn } from '@/src/auth';

export async function entrar(formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/',
    });
  } catch (error) {
    // signIn signals success by throwing next's redirect, so let it through
    if (error instanceof AuthError) redirect('/login?error=1');
    throw error;
  }
}
