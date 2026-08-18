import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Define protected routes
    const protectedRoutes = ['/dashboard', '/pyqs', '/notes', '/ai-tools', '/profile', '/settings', '/mentor'];
    const adminRoutes = ['/admin/dashboard'];
    const authRoutes = ['/login', '/register'];

    const accessToken = request.cookies.get('accessToken')?.value;
    const adminToken = request.cookies.get('adminToken')?.value;

    // 1. If trying to access admin dashboard without adminToken, redirect to admin login
    if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (!adminToken) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    // 2. If trying to access student protected routes without accessToken, redirect to login
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
        if (!accessToken) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // 3. If trying to access login/register while already authenticated, redirect to dashboard
    if (authRoutes.some(route => pathname.startsWith(route))) {
        if (accessToken) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/pyqs/:path*',
        '/notes/:path*',
        '/ai-tools/:path*',
        '/profile/:path*',
        '/settings/:path*',
        '/mentor/:path*',
        '/admin/dashboard/:path*',
        '/login',
        '/register',
    ],
};
