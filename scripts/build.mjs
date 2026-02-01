import { execSync } from 'child_process';
import fs from 'fs';

try {
    console.log('🚀 Starting build process...');

    // 1. Database Schema Generation
    // Ensure drizzle kit generates the necessary artifacts
    console.log('📦 Generating database migrations...');
    // We use db:push to ensure schema is logically valid, though typically migration is separate.
    // Using generate is effortless.
    try {
        execSync('npx drizzle-kit generate', { stdio: 'inherit' });
    } catch (e) {
        console.warn('⚠️ Drizzle generation warning (non-fatal):', e.message);
    }

    // 2. Build Server
    // We compile the server to a distinct directory to avoid conflicts
    console.log('🛠️  Building server...');
    execSync('npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

    // 3. (Optional) Expo Web Build
    // If you want to deploy the frontend, uncomment the line below and ensure your Vercel Output Directory is set to "dist/web"
    // console.log('🌐 Building Expo web client...');
    // execSync('npx expo export -p web --output-dir dist/web', { stdio: 'inherit' });

    console.log('✅ Build completed successfully.');
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}
