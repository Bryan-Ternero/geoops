import NextAuth from 'next-auth';

import { authConfig } from '@/src/auth/config';

// next 16 renamed `middleware` to `proxy`; it must be a default export or the production
// build fails to detect the function, even though dev works

const { auth } = NextAuth(authConfig);

export default auth;

// pages only: /api guards itself with requireSession() and answers 401 json, not a redirect
// Static public assets (images, fonts, svgs, icons) must bypass auth so the login page can load them
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf)$).*)',
  ],
};
