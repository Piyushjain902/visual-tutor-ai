/**
 * AWS Deployment Script for Visual Tutor AI
 * Deploys frontend to S3 and provides backend deployment instructions
 */

import { S3Client, CreateBucketCommand, PutBucketWebsiteCommand, PutBucketPolicyCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || `visual-tutor-ai-${Date.now()}`;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Validate credentials
if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('\n❌ ERROR: AWS credentials not found!');
  console.error('\nAdd these to your .env file:');
  console.error('  AWS_ACCESS_KEY_ID=your_access_key');
  console.error('  AWS_SECRET_ACCESS_KEY=your_secret_key');
  console.error('  S3_BUCKET_NAME=your-bucket-name (optional)');
  process.exit(1);
}

// S3 Client
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  }
});

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Create S3 bucket for website hosting
 */
async function createBucket() {
  console.log(`\n📦 Setting up S3 bucket: ${BUCKET_NAME}`);
  
  try {
    await s3Client.send(new CreateBucketCommand({
      Bucket: BUCKET_NAME,
      CreateBucketConfiguration: {
        LocationConstraint: REGION
      }
    }));
    console.log('✅ Bucket created');
  } catch (error) {
    if (error.name === 'BucketAlreadyOwnedByYou') {
      console.log('✅ Bucket already exists (owned by you)');
    } else if (error.name === 'BucketAlreadyExists') {
      console.error('❌ Bucket name already taken globally. Try a different name.');
      process.exit(1);
    } else if (error.message && error.message.includes('s3:CreateBucket')) {
      console.log('⚠️  No CreateBucket permission - assuming bucket exists');
      console.log('   (If bucket does not exist, create it manually in AWS Console)');
    } else {
      throw error;
    }
  }

  // Configure for static website hosting
  console.log('🌐 Configuring static website hosting...');
  try {
    await s3Client.send(new PutBucketWebsiteCommand({
      Bucket: BUCKET_NAME,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'index.html' } // SPA fallback
      }
    }));
    console.log('✅ Website hosting configured');
  } catch (error) {
    console.log('⚠️  Could not configure website hosting - configure manually in S3 console');
  }

  // Set public read policy
  console.log('🔓 Setting public read policy...');
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
    }]
  };
  
  try {
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(policy)
    }));
    console.log('✅ Public policy set');
  } catch (error) {
    console.log('⚠️  Could not set bucket policy - configure manually in S3 console');
  }
}

/**
 * Clear existing files from bucket
 */
async function clearBucket() {
  console.log('\n🗑️  Clearing existing files...');
  
  const listResponse = await s3Client.send(new ListObjectsV2Command({
    Bucket: BUCKET_NAME
  }));
  
  if (listResponse.Contents && listResponse.Contents.length > 0) {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: listResponse.Contents.map(obj => ({ Key: obj.Key }))
      }
    }));
    console.log(`✅ Deleted ${listResponse.Contents.length} existing files`);
  } else {
    console.log('✅ Bucket is empty');
  }
}

/**
 * Upload files to S3
 */
async function uploadFiles(distPath) {
  console.log('\n📤 Uploading files to S3...');
  
  const files = getAllFiles(distPath);
  let uploaded = 0;
  
  for (const file of files) {
    const key = relative(distPath, file).replace(/\\/g, '/');
    const ext = extname(file);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: readFileSync(file),
      ContentType: contentType
    }));
    
    uploaded++;
    process.stdout.write(`\r   Uploaded: ${uploaded}/${files.length} files`);
  }
  
  console.log('\n✅ All files uploaded');
}

/**
 * Main deployment function
 */
async function deploy() {
  console.log('\n🚀 VISUAL TUTOR AI - AWS DEPLOYMENT');
  console.log('====================================\n');
  
  // Step 1: Build frontend
  console.log('📦 Building frontend...');
  try {
    execSync('npm run build', { 
      cwd: join(process.cwd(), 'frontend'),
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }
  
  // Step 2: Create/configure S3 bucket
  await createBucket();
  
  // Step 3: Clear existing files
  await clearBucket();
  
  // Step 4: Upload dist folder
  const distPath = join(process.cwd(), 'frontend', 'dist');
  await uploadFiles(distPath);
  
  // Step 5: Print success message
  const websiteUrl = `http://${BUCKET_NAME}.s3-website.${REGION}.amazonaws.com`;
  
  console.log('\n✅ FRONTEND DEPLOYMENT COMPLETE!');
  console.log('================================\n');
  console.log(`🌐 Website URL: ${websiteUrl}`);
  console.log(`📦 S3 Bucket: ${BUCKET_NAME}`);
  console.log(`🌍 Region: ${REGION}\n`);
  
  console.log('⚠️  IMPORTANT: Backend is not deployed yet!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('For backend deployment, you have two options:\n');
  console.log('OPTION 1: EC2 Instance');
  console.log('  1. Launch an EC2 instance (Amazon Linux 2 or Ubuntu)');
  console.log('  2. SSH into it and install Node.js');
  console.log('  3. Clone your repo and run: cd backend && npm install && npm start');
  console.log('  4. Use PM2 for process management: pm2 start server.js');
  console.log('  5. Configure security group to allow port 3000\n');
  
  console.log('OPTION 2: AWS Elastic Beanstalk (easier)');
  console.log('  1. Zip your backend folder');
  console.log('  2. Go to AWS Console > Elastic Beanstalk');
  console.log('  3. Create new application > Node.js platform');
  console.log('  4. Upload your zip file');
  console.log('  5. Set environment variables in EB console\n');
  
  console.log('After backend is deployed, update frontend API URL:');
  console.log('  Edit: frontend/src/components/ChatPanel.jsx');
  console.log('  Change: http://localhost:3000 → your-backend-url\n');
  console.log('  Then re-run: node deploy.js\n');
}

// Run deployment
deploy().catch(error => {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
});
