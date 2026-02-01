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

    // 3. Expo Web Build (Frontend)
    // Export web assets to 'public' directory which Vercel serves automatically
    // We export to a temporary directory 'dist-web' first to avoid "cp: src and dest cannot be the same" error
    // because Expo tries to copy 'public/' (source) to 'public/' (output) which fails.
    console.log('🌐 Building Expo web client...');
    try {
        // Clear previous leftovers
        if (fs.existsSync('dist-web')) {
            fs.rmSync('dist-web', { recursive: true, force: true });
        }

        // Export to temporary directory
        execSync('npx expo export -p web --output-dir dist-web', { stdio: 'inherit', env: process.env });

        // Replace 'public' directory with the built version
        console.log('📂 Preparing final public directory...');
        if (fs.existsSync('public')) {
            fs.rmSync('public', { recursive: true, force: true });
        }
        fs.renameSync('dist-web', 'public');

    } catch (e) {
        console.error('❌ Expo export failed:', e.message);
        throw e;
    }

    console.log('✅ Build completed successfully.');
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}
