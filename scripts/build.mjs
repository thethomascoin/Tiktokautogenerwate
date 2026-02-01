import { execSync } from 'child_process';
import fs from 'fs';

try {
    console.log('🚀 Starting build process...');

    // 1. Database Schema Generation
    // Hack: drizzle.config.ts requires DATABASE_URL even for generation.
    // We provide a dummy one if missing during build to allow `drizzle-kit generate` to work
    // (it only compares schema files, doesn't need real DB connection for 'generate').
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL not found. Using placeholder for build generation.');
        process.env.DATABASE_URL = 'mysql://placeholder:placeholder@localhost:3306/placeholder';
    }

    console.log('📦 Generating database migrations...');
    try {
        execSync('npx drizzle-kit generate', { stdio: 'inherit', env: process.env });
    } catch (e) {
        console.warn('⚠️ Drizzle generation warning (non-fatal):', e.message);
    }

    // 2. Build Server
    console.log('🛠️  Building server...');
    execSync('npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

    // 3. Create 'public' directory to satisfy Vercel
    // Vercel's default output directory logic often looks for 'public' if no other Output Directory is configured.
    if (!fs.existsSync('public')) {
        console.log('📂 Creating public directory...');
        fs.mkdirSync('public');
        fs.writeFileSync('public/index.html', '<html><body><h1>API Server Running</h1><p>The backend is active.</p></body></html>');
    }

    console.log('✅ Build completed successfully.');
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}
