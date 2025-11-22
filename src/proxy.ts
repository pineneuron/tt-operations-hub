import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const isProtectedRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard');
};

export default async function proxy(req: NextRequest) {
  const session = await auth();

  if (isProtectedRoute(req.nextUrl.pathname) && !session) {
    const signInUrl = new URL('/auth/login', req.url);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
